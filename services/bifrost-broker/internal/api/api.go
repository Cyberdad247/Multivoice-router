// Package api exposes the broker's control surface.
//
// The broker is the meeting point between the TypeScript control plane (which
// decides) and the Rust gatekeepers (which enforce). It holds no policy of its
// own: it records liveness, stores issued envelopes, and fans revocations out
// to nodes.
//
// Every write endpoint requires the shared broker token. The broker is intended
// to bind to a tailnet address and must not be exposed publicly.
package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/journal"
	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/registry"
	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/token"
)

// Notifier delivers a revocation to a node's gatekeeper daemon.
type Notifier interface {
	Revoke(deviceID, sessionID string) error
}

// Server wires the registry and its dependencies into HTTP handlers.
type Server struct {
	Registry      *registry.Registry
	Journal       *journal.Store
	SigningSecret string
	BrokerToken   string
	Notifier      Notifier
	Now           func() time.Time
}

// New builds a Server with a real clock.
func New(reg *registry.Registry, signingSecret, brokerToken string, notifier Notifier) *Server {
	return &Server{
		Registry:      reg,
		Journal:       journal.NewStore(),
		SigningSecret: signingSecret,
		BrokerToken:   brokerToken,
		Notifier:      notifier,
		Now:           time.Now,
	}
}

// Routes returns the broker's mux.
func (s *Server) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.handleHealth)
	mux.HandleFunc("POST /v1/heartbeat", s.authed(s.handleHeartbeat))
	mux.HandleFunc("GET /v1/devices", s.authed(s.handleDevices))
	mux.HandleFunc("POST /v1/sessions", s.authed(s.handleNoteSession))
	mux.HandleFunc("GET /v1/sessions", s.authed(s.handleListSessions))
	mux.HandleFunc("POST /v1/sessions/revoke", s.authed(s.handleRevoke))
	mux.HandleFunc("POST /v1/journal", s.authed(s.handleAppendJournal))
	mux.HandleFunc("GET /v1/journal", s.authed(s.handleReadJournal))
	mux.HandleFunc("GET /v1/journal/verify", s.authed(s.handleVerifyJournal))
	return mux
}

func (s *Server) now() time.Time {
	if s.Now == nil {
		return time.Now()
	}
	return s.Now()
}

// authed rejects any request without the shared broker token.
func (s *Server) authed(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.BrokerToken == "" || r.Header.Get("X-Bifrost-Token") != s.BrokerToken {
			writeJSON(w, http.StatusUnauthorized, map[string]any{
				"ok":    false,
				"error": "missing or invalid X-Bifrost-Token",
			})
			return
		}
		next(w, r)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	now := s.now()
	devices := s.Registry.Devices(now)

	fresh := 0
	for _, device := range devices {
		if device.Fresh {
			fresh++
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":           true,
		"service":      "bifrost-broker",
		"devices":      len(devices),
		"freshDevices": fresh,
		"sessions":     len(s.Registry.Sessions()),
		"timestamp":    now.UTC().Format(token.TimeLayout),
	})
}

func (s *Server) handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	var hb registry.Heartbeat
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&hb); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "malformed heartbeat"})
		return
	}
	if hb.DeviceID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "deviceId is required"})
		return
	}

	state := s.Registry.RecordHeartbeat(hb, s.now())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "device": state})
}

func (s *Server) handleDevices(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "devices": s.Registry.Devices(s.now())})
}

// handleAppendJournal stores entries after recomputing every hash itself.
//
// A batch that would break the chain is refused whole. Partially accepting it
// would destroy exactly the property the journal exists to provide.
func (s *Server) handleAppendJournal(w http.ResponseWriter, r *http.Request) {
	var entries []journal.Entry
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&entries); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "malformed journal batch"})
		return
	}
	if len(entries) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "empty batch"})
		return
	}

	verification, err := s.Journal.Append(entries)
	if err != nil {
		writeJSON(w, http.StatusConflict, map[string]any{
			"ok":           false,
			"error":        err.Error(),
			"verification": verification,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":       true,
		"appended": len(entries),
		"head":     s.Journal.Head(),
	})
}

func (s *Server) handleReadJournal(w http.ResponseWriter, r *http.Request) {
	tenant := r.URL.Query().Get("tenant")

	// Tenant scoping is opt-in by query, but an empty tenant must never be
	// treated as "match every entry with no tenant set".
	entries := s.Journal.All()
	if tenant != "" {
		entries = s.Journal.ForTenant(tenant)
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "entries": entries, "head": s.Journal.Head()})
}

func (s *Server) handleVerifyJournal(w http.ResponseWriter, _ *http.Request) {
	verification := s.Journal.Verify()

	status := http.StatusOK
	if !verification.OK {
		// A broken chain is a server-side integrity failure, not a bad request.
		status = http.StatusConflict
	}

	writeJSON(w, status, map[string]any{
		"ok":           verification.OK,
		"verification": verification,
		"entries":      s.Journal.Len(),
	})
}

// handleNoteSession accepts an envelope minted by the control plane. The broker
// re-verifies it rather than trusting the caller: a session it cannot verify is
// one it must not later be asked to revoke.
func (s *Server) handleNoteSession(w http.ResponseWriter, r *http.Request) {
	var envelope token.Envelope
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&envelope); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "malformed envelope"})
		return
	}

	if err := token.Verify(envelope, s.SigningSecret, s.now()); err != nil {
		writeJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": err.Error()})
		return
	}

	state := s.Registry.NoteSession(envelope, s.now())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "session": state})
}

func (s *Server) handleListSessions(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "sessions": s.Registry.Sessions()})
}

func (s *Server) handleRevoke(w http.ResponseWriter, r *http.Request) {
	var request struct {
		SessionID string `json:"sessionId"`
		By        string `json:"by"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&request); err != nil || request.SessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "sessionId is required"})
		return
	}

	state, ok := s.Registry.Revoke(request.SessionID, request.By)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "unknown session"})
		return
	}

	// Best-effort fan-out. The revocation stands in the registry even if the
	// node is unreachable — its envelope still expires on schedule.
	var notifyErr string
	if s.Notifier != nil {
		if err := s.Notifier.Revoke(state.Envelope.DeviceID, state.Envelope.SessionID); err != nil {
			notifyErr = err.Error()
			log.Printf("[broker] revocation fan-out to %s failed: %v", state.Envelope.DeviceID, err)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"session":     state,
		"notifyError": notifyErr,
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("[broker] failed to write response: %v", err)
	}
}
