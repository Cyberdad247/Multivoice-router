package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/registry"
	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/token"
)

const (
	testSecret      = "bifrost-test-secret-0123456789"
	testBrokerToken = "broker-token-for-tests"
	vectorSignature = "c20468d38da3a647f72f20de5c4c4a1468376cb563c01551c40a29f3aa853981"
)

type recordingNotifier struct {
	calls []string
	err   error
}

func (n *recordingNotifier) Revoke(deviceID, sessionID string) error {
	n.calls = append(n.calls, deviceID+"/"+sessionID)
	return n.err
}

func testServer(t *testing.T, notifier Notifier) *Server {
	t.Helper()
	fixed, err := time.Parse(token.TimeLayout, "2026-08-10T12:05:00Z")
	if err != nil {
		t.Fatalf("parse fixed time: %v", err)
	}

	s := New(registry.New(), testSecret, testBrokerToken, notifier)
	s.Now = func() time.Time { return fixed }
	return s
}

func do(t *testing.T, s *Server, method, path string, body any, withToken bool) *httptest.ResponseRecorder {
	t.Helper()

	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}

	req := httptest.NewRequest(method, path, &buf)
	if withToken {
		req.Header.Set("X-Bifrost-Token", testBrokerToken)
	}

	rec := httptest.NewRecorder()
	s.Routes().ServeHTTP(rec, req)
	return rec
}

func validEnvelope() token.Envelope {
	return token.Envelope{
		SessionID:      "bfs_vector_001",
		DeviceID:       "desktop_primary",
		Transport:      "sunshine_moonlight",
		Fidelity:       "view",
		Scopes:         []string{"screen_view", "audio_out"},
		RiskClass:      "L1_DRAFT",
		IssuedBy:       "sir_heimdall",
		NotBefore:      "2026-08-10T12:00:00Z",
		NotAfter:       "2026-08-10T12:15:00Z",
		MaxIdleSeconds: 600,
		Signature:      vectorSignature,
	}
}

func TestWriteEndpointsRequireToken(t *testing.T) {
	s := testServer(t, nil)

	for _, path := range []string{"/v1/heartbeat", "/v1/sessions", "/v1/sessions/revoke"} {
		rec := do(t, s, http.MethodPost, path, map[string]string{}, false)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s without token: got %d, want 401", path, rec.Code)
		}
	}
}

func TestHealthNeedsNoToken(t *testing.T) {
	s := testServer(t, nil)
	rec := do(t, s, http.MethodGet, "/v1/health", nil, false)
	if rec.Code != http.StatusOK {
		t.Errorf("health: got %d, want 200", rec.Code)
	}
}

func TestHeartbeatRegistersDevice(t *testing.T) {
	s := testServer(t, nil)

	rec := do(t, s, http.MethodPost, "/v1/heartbeat", registry.Heartbeat{
		DeviceID:  "desktop_primary",
		Transport: "rustdesk_control",
	}, true)

	if rec.Code != http.StatusOK {
		t.Fatalf("heartbeat: got %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	devices := s.Registry.Devices(s.now())
	if len(devices) != 1 || !devices[0].Fresh {
		t.Errorf("expected one fresh device, got %+v", devices)
	}
}

func TestHeartbeatRejectsMissingDeviceID(t *testing.T) {
	s := testServer(t, nil)
	rec := do(t, s, http.MethodPost, "/v1/heartbeat", registry.Heartbeat{Transport: "rustdesk_control"}, true)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", rec.Code)
	}
}

func TestSessionMustVerifyBeforeBeingStored(t *testing.T) {
	s := testServer(t, nil)

	tampered := validEnvelope()
	tampered.Scopes = append(tampered.Scopes, "shell_exec")

	rec := do(t, s, http.MethodPost, "/v1/sessions", tampered, true)
	if rec.Code != http.StatusForbidden {
		t.Errorf("tampered envelope: got %d, want 403", rec.Code)
	}
	if len(s.Registry.Sessions()) != 0 {
		t.Error("an unverifiable envelope must not be stored")
	}
}

func TestValidSessionIsStored(t *testing.T) {
	s := testServer(t, nil)

	rec := do(t, s, http.MethodPost, "/v1/sessions", validEnvelope(), true)
	if rec.Code != http.StatusOK {
		t.Fatalf("valid envelope: got %d, want 200 (%s)", rec.Code, rec.Body.String())
	}
	if len(s.Registry.Sessions()) != 1 {
		t.Error("expected the session to be stored")
	}
}

func TestRevokeFansOutToNode(t *testing.T) {
	notifier := &recordingNotifier{}
	s := testServer(t, notifier)

	do(t, s, http.MethodPost, "/v1/sessions", validEnvelope(), true)
	rec := do(t, s, http.MethodPost, "/v1/sessions/revoke", map[string]string{
		"sessionId": "bfs_vector_001",
		"by":        "gjallarhorn",
	}, true)

	if rec.Code != http.StatusOK {
		t.Fatalf("revoke: got %d, want 200 (%s)", rec.Code, rec.Body.String())
	}
	if len(notifier.calls) != 1 || notifier.calls[0] != "desktop_primary/bfs_vector_001" {
		t.Errorf("unexpected fan-out: %v", notifier.calls)
	}
}

func TestRevocationStandsWhenNodeUnreachable(t *testing.T) {
	notifier := &recordingNotifier{err: errors.New("connection refused")}
	s := testServer(t, notifier)

	do(t, s, http.MethodPost, "/v1/sessions", validEnvelope(), true)
	rec := do(t, s, http.MethodPost, "/v1/sessions/revoke", map[string]string{
		"sessionId": "bfs_vector_001",
		"by":        "gjallarhorn",
	}, true)

	// The node could not be told, but the broker's own record must still show
	// the session as revoked — the envelope expires regardless.
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", rec.Code)
	}

	var response struct {
		Session     registry.SessionState `json:"session"`
		NotifyError string                `json:"notifyError"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !response.Session.Revoked {
		t.Error("session must be revoked locally even when fan-out fails")
	}
	if response.NotifyError == "" {
		t.Error("fan-out failure must be reported to the caller")
	}
}

func TestRevokeUnknownSessionIs404(t *testing.T) {
	s := testServer(t, nil)
	rec := do(t, s, http.MethodPost, "/v1/sessions/revoke", map[string]string{"sessionId": "nope"}, true)
	if rec.Code != http.StatusNotFound {
		t.Errorf("got %d, want 404", rec.Code)
	}
}
