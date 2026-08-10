package token

import (
	"errors"
	"testing"
	"time"
)

// Shared cross-language vector. Identical assertions live in
// services/heimdall-gatekeeper/src/token.rs and src/tests/smoke.test.ts.
const (
	vectorSecret    = "bifrost-test-secret-0123456789"
	vectorCanonical = "bifrost-v1|bfs_vector_001|desktop_primary|sunshine_moonlight|view|audio_out,screen_view|L1_DRAFT|2026-08-10T12:00:00Z|2026-08-10T12:15:00Z|600|sir_heimdall"
	vectorSignature = "c20468d38da3a647f72f20de5c4c4a1468376cb563c01551c40a29f3aa853981"
)

func vectorEnvelope() Envelope {
	return Envelope{
		SessionID: "bfs_vector_001",
		DeviceID:  "desktop_primary",
		Transport: "sunshine_moonlight",
		Fidelity:  "view",
		// Deliberately unsorted — normalization must fix the order.
		Scopes:         []string{"screen_view", "audio_out"},
		RiskClass:      "L1_DRAFT",
		IssuedBy:       "sir_heimdall",
		NotBefore:      "2026-08-10T12:00:00Z",
		NotAfter:       "2026-08-10T12:15:00Z",
		MaxIdleSeconds: 600,
		Signature:      vectorSignature,
	}
}

func mustParse(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse(TimeLayout, value)
	if err != nil {
		t.Fatalf("parse %q: %v", value, err)
	}
	return parsed
}

func TestCanonicalMatchesTypeScript(t *testing.T) {
	if got := Canonical(vectorEnvelope()); got != vectorCanonical {
		t.Errorf("canonical mismatch:\n got: %s\nwant: %s", got, vectorCanonical)
	}
}

func TestSignatureMatchesTypeScript(t *testing.T) {
	if got := Sign(vectorCanonical, vectorSecret); got != vectorSignature {
		t.Errorf("signature mismatch:\n got: %s\nwant: %s", got, vectorSignature)
	}
}

func TestNormalizeScopesDeduplicatesAndSorts(t *testing.T) {
	got := NormalizeScopes([]string{"screen_view", "AUDIO_OUT", "screen_view", "audio_out"})
	if got != "audio_out,screen_view" {
		t.Errorf("got %q, want %q", got, "audio_out,screen_view")
	}
}

func TestVerifyAcceptsInsideWindow(t *testing.T) {
	if err := Verify(vectorEnvelope(), vectorSecret, mustParse(t, "2026-08-10T12:05:00Z")); err != nil {
		t.Errorf("expected valid envelope, got %v", err)
	}
}

func TestVerifyRejectsExpired(t *testing.T) {
	err := Verify(vectorEnvelope(), vectorSecret, mustParse(t, "2026-08-10T12:20:00Z"))
	if !errors.Is(err, ErrExpired) {
		t.Errorf("expected ErrExpired, got %v", err)
	}
}

func TestVerifyRejectsBeforeWindow(t *testing.T) {
	err := Verify(vectorEnvelope(), vectorSecret, mustParse(t, "2026-08-10T11:00:00Z"))
	if !errors.Is(err, ErrNotYetValid) {
		t.Errorf("expected ErrNotYetValid, got %v", err)
	}
}

func TestVerifyRejectsWrongSecret(t *testing.T) {
	err := Verify(vectorEnvelope(), "a-different-secret-entirely", mustParse(t, "2026-08-10T12:05:00Z"))
	if !errors.Is(err, ErrSignatureMismatch) {
		t.Errorf("expected ErrSignatureMismatch, got %v", err)
	}
}

func TestVerifyRejectsScopeEscalation(t *testing.T) {
	tampered := vectorEnvelope()
	tampered.Scopes = append(tampered.Scopes, "shell_exec")

	err := Verify(tampered, vectorSecret, mustParse(t, "2026-08-10T12:05:00Z"))
	if !errors.Is(err, ErrSignatureMismatch) {
		t.Errorf("scope escalation must invalidate the signature, got %v", err)
	}
}

func TestVerifyRejectsExtendedWindow(t *testing.T) {
	tampered := vectorEnvelope()
	tampered.NotAfter = "2026-08-11T12:00:00Z"

	err := Verify(tampered, vectorSecret, mustParse(t, "2026-08-10T12:05:00Z"))
	if !errors.Is(err, ErrSignatureMismatch) {
		t.Errorf("extending the window must invalidate the signature, got %v", err)
	}
}

func TestRemainingSecondsNeverNegative(t *testing.T) {
	if got := RemainingSeconds(vectorEnvelope(), mustParse(t, "2026-08-10T12:05:00Z")); got != 600 {
		t.Errorf("got %d, want 600", got)
	}
	if got := RemainingSeconds(vectorEnvelope(), mustParse(t, "2026-08-10T23:00:00Z")); got != 0 {
		t.Errorf("expired envelope must report 0, got %d", got)
	}
}
