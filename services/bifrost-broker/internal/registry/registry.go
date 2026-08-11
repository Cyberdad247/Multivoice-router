// Package registry tracks which nodes are alive and which sessions are open.
//
// Liveness is a gating input, not a dashboard detail: Heimdall refuses to open
// a crossing to a device whose gatekeeper has gone quiet, so the staleness
// window here must match HEARTBEAT_STALE_SECONDS in
// src/bifrost/device-registry.ts.
package registry

import (
	"sync"
	"time"

	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/token"
)

// StaleAfter matches HEARTBEAT_STALE_SECONDS on the TypeScript side.
const StaleAfter = 90 * time.Second

// Heartbeat is one report from a node's gatekeeper daemon.
type Heartbeat struct {
	DeviceID        string `json:"deviceId"`
	Transport       string `json:"transport"`
	ObservedAt      string `json:"observedAt"`
	RevokedSessions int    `json:"revokedSessions"`
}

// DeviceState is the broker's view of one node.
type DeviceState struct {
	DeviceID      string    `json:"deviceId"`
	Transport     string    `json:"transport"`
	LastHeartbeat time.Time `json:"lastHeartbeat"`
	AgeSeconds    int64     `json:"ageSeconds"`
	Fresh         bool      `json:"fresh"`
	Revoked       int       `json:"revokedSessions"`
}

// SessionState is a session the control plane told the broker about.
type SessionState struct {
	Envelope  token.Envelope `json:"envelope"`
	Revoked   bool           `json:"revoked"`
	RevokedBy string         `json:"revokedBy,omitempty"`
	NotedAt   time.Time      `json:"notedAt"`
}

// Registry is safe for concurrent use.
type Registry struct {
	mu       sync.RWMutex
	devices  map[string]*DeviceState
	sessions map[string]*SessionState
}

// New returns an empty registry.
func New() *Registry {
	return &Registry{
		devices:  make(map[string]*DeviceState),
		sessions: make(map[string]*SessionState),
	}
}

// RecordHeartbeat stores a node's report, stamping it with server time.
//
// The node's self-reported ObservedAt is kept for diagnostics but is never used
// for freshness — a node with a wrong clock, or a replayed heartbeat, must not
// be able to claim it is alive.
func (r *Registry) RecordHeartbeat(hb Heartbeat, now time.Time) DeviceState {
	r.mu.Lock()
	defer r.mu.Unlock()

	state, ok := r.devices[hb.DeviceID]
	if !ok {
		state = &DeviceState{DeviceID: hb.DeviceID}
		r.devices[hb.DeviceID] = state
	}

	state.Transport = hb.Transport
	state.LastHeartbeat = now
	state.Revoked = hb.RevokedSessions

	return snapshot(state, now)
}

// Devices returns every known device, freshness computed against now.
func (r *Registry) Devices(now time.Time) []DeviceState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]DeviceState, 0, len(r.devices))
	for _, state := range r.devices {
		out = append(out, snapshot(state, now))
	}
	return out
}

// Device returns one device's state.
func (r *Registry) Device(deviceID string, now time.Time) (DeviceState, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	state, ok := r.devices[deviceID]
	if !ok {
		return DeviceState{}, false
	}
	return snapshot(state, now), true
}

func snapshot(state *DeviceState, now time.Time) DeviceState {
	age := int64(now.Sub(state.LastHeartbeat).Seconds())
	if age < 0 {
		age = 0
	}
	return DeviceState{
		DeviceID:      state.DeviceID,
		Transport:     state.Transport,
		LastHeartbeat: state.LastHeartbeat,
		AgeSeconds:    age,
		Fresh:         now.Sub(state.LastHeartbeat) <= StaleAfter,
		Revoked:       state.Revoked,
	}
}

// NoteSession records an issued envelope so the broker can fan out revocations.
func (r *Registry) NoteSession(envelope token.Envelope, now time.Time) SessionState {
	r.mu.Lock()
	defer r.mu.Unlock()

	state := &SessionState{Envelope: envelope, NotedAt: now}
	r.sessions[envelope.SessionID] = state
	return *state
}

// Revoke marks a session revoked. Reports false when the session is unknown.
func (r *Registry) Revoke(sessionID, by string) (SessionState, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	state, ok := r.sessions[sessionID]
	if !ok {
		return SessionState{}, false
	}
	state.Revoked = true
	state.RevokedBy = by
	return *state, true
}

// Sessions returns every session the broker knows about.
func (r *Registry) Sessions() []SessionState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]SessionState, 0, len(r.sessions))
	for _, state := range r.sessions {
		out = append(out, *state)
	}
	return out
}

// ExpiredSessions lists live sessions whose envelope window has closed. The
// supervisor uses this to drive revocation fan-out without waiting for a node
// to notice on its own.
func (r *Registry) ExpiredSessions(now time.Time) []SessionState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var out []SessionState
	for _, state := range r.sessions {
		if state.Revoked {
			continue
		}
		if token.RemainingSeconds(state.Envelope, now) == 0 {
			out = append(out, *state)
		}
	}
	return out
}
