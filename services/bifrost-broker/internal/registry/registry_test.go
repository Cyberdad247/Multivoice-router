package registry

import (
	"testing"
	"time"

	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/token"
)

func at(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse(token.TimeLayout, value)
	if err != nil {
		t.Fatalf("parse %q: %v", value, err)
	}
	return parsed
}

func TestHeartbeatMarksDeviceFresh(t *testing.T) {
	r := New()
	now := at(t, "2026-08-10T12:00:00Z")

	state := r.RecordHeartbeat(Heartbeat{DeviceID: "desktop_primary", Transport: "rustdesk_control"}, now)
	if !state.Fresh {
		t.Error("device should be fresh immediately after a heartbeat")
	}
	if state.AgeSeconds != 0 {
		t.Errorf("age should be 0, got %d", state.AgeSeconds)
	}
}

func TestDeviceGoesStaleAfterWindow(t *testing.T) {
	r := New()
	beat := at(t, "2026-08-10T12:00:00Z")
	r.RecordHeartbeat(Heartbeat{DeviceID: "desktop_primary"}, beat)

	justInside, ok := r.Device("desktop_primary", beat.Add(StaleAfter))
	if !ok || !justInside.Fresh {
		t.Error("device should still be fresh exactly at the staleness boundary")
	}

	justOutside, ok := r.Device("desktop_primary", beat.Add(StaleAfter+time.Second))
	if !ok {
		t.Fatal("device should still be known")
	}
	if justOutside.Fresh {
		t.Error("device should be stale one second past the window")
	}
	if justOutside.AgeSeconds != 91 {
		t.Errorf("age should be 91, got %d", justOutside.AgeSeconds)
	}
}

func TestSelfReportedTimeDoesNotAffectFreshness(t *testing.T) {
	r := New()
	now := at(t, "2026-08-10T12:00:00Z")

	// A node claiming a wildly future timestamp must not extend its own liveness.
	state := r.RecordHeartbeat(Heartbeat{
		DeviceID:   "desktop_primary",
		ObservedAt: "2030-01-01T00:00:00Z",
	}, now)

	if !state.LastHeartbeat.Equal(now) {
		t.Errorf("broker must stamp server time, got %v", state.LastHeartbeat)
	}

	stale, _ := r.Device("desktop_primary", now.Add(10*time.Minute))
	if stale.Fresh {
		t.Error("self-reported future time must not keep a silent node fresh")
	}
}

func TestUnknownDeviceIsNotInvented(t *testing.T) {
	r := New()
	if _, ok := r.Device("never_seen", time.Now()); ok {
		t.Error("unknown device must not resolve")
	}
}

func TestRevokeUnknownSessionReportsMiss(t *testing.T) {
	r := New()
	if _, ok := r.Revoke("bfs_missing", "operator"); ok {
		t.Error("revoking an unknown session must report false")
	}
}

func TestRevokeMarksSession(t *testing.T) {
	r := New()
	now := at(t, "2026-08-10T12:00:00Z")
	r.NoteSession(token.Envelope{SessionID: "bfs_1", NotAfter: "2026-08-10T12:15:00Z"}, now)

	state, ok := r.Revoke("bfs_1", "gjallarhorn")
	if !ok {
		t.Fatal("expected the session to be found")
	}
	if !state.Revoked || state.RevokedBy != "gjallarhorn" {
		t.Errorf("session not marked revoked correctly: %+v", state)
	}
}

func TestExpiredSessionsSkipsRevokedAndLive(t *testing.T) {
	r := New()
	now := at(t, "2026-08-10T12:00:00Z")

	r.NoteSession(token.Envelope{SessionID: "live", NotAfter: "2026-08-10T12:30:00Z"}, now)
	r.NoteSession(token.Envelope{SessionID: "done", NotAfter: "2026-08-10T11:30:00Z"}, now)
	r.NoteSession(token.Envelope{SessionID: "already", NotAfter: "2026-08-10T11:00:00Z"}, now)
	r.Revoke("already", "operator")

	expired := r.ExpiredSessions(now)
	if len(expired) != 1 {
		t.Fatalf("expected exactly one expired session, got %d", len(expired))
	}
	if expired[0].Envelope.SessionID != "done" {
		t.Errorf("wrong session reported: %s", expired[0].Envelope.SessionID)
	}
}

func TestConcurrentHeartbeatsAreSafe(t *testing.T) {
	r := New()
	now := time.Now()
	done := make(chan struct{})

	for i := 0; i < 16; i++ {
		go func() {
			for j := 0; j < 64; j++ {
				r.RecordHeartbeat(Heartbeat{DeviceID: "desktop_primary"}, now)
				r.Devices(now)
			}
			done <- struct{}{}
		}()
	}
	for i := 0; i < 16; i++ {
		<-done
	}

	if len(r.Devices(now)) != 1 {
		t.Errorf("expected a single device, got %d", len(r.Devices(now)))
	}
}
