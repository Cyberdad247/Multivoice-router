// Package token rebuilds and verifies Bifrost session envelopes.
//
// This is the third implementation of the same canonical form. The other two
// are src/bifrost/session-token.ts and
// services/heimdall-gatekeeper/src/token.rs. All three are pinned to the same
// test vector; if one drifts, its test fails.
//
// CANONICAL FORM:
//
//	bifrost-v1|sessionId|deviceId|transport|fidelity|scopes|riskClass|notBefore|notAfter|maxIdleSeconds|issuedBy
//
// scopes is lowercase, de-duplicated, sorted, comma-joined.
// Timestamps are RFC3339 UTC at second precision.
package token

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Version prefixes every canonical string.
const Version = "bifrost-v1"

// TimeLayout is the only timestamp format the bridge accepts.
const TimeLayout = "2006-01-02T15:04:05Z"

// Envelope is a session capability as minted by the TypeScript control plane.
type Envelope struct {
	SessionID      string   `json:"sessionId"`
	RequestID      string   `json:"requestId,omitempty"`
	DeviceID       string   `json:"deviceId"`
	Transport      string   `json:"transport"`
	Fidelity       string   `json:"fidelity"`
	Scopes         []string `json:"scopes"`
	RiskClass      string   `json:"riskClass"`
	IssuedBy       string   `json:"issuedBy"`
	NotBefore      string   `json:"notBefore"`
	NotAfter       string   `json:"notAfter"`
	MaxIdleSeconds int64    `json:"maxIdleSeconds"`
	Signature      string   `json:"signature"`
}

var (
	// ErrSignatureMismatch means the envelope was not minted with our secret.
	ErrSignatureMismatch = errors.New("signature mismatch")
	// ErrNotYetValid means notBefore is in the future.
	ErrNotYetValid = errors.New("session not yet valid")
	// ErrExpired means notAfter has passed.
	ErrExpired = errors.New("session expired")
)

// NormalizeScopes lowercases, de-duplicates, sorts and joins scopes.
func NormalizeScopes(scopes []string) string {
	seen := make(map[string]struct{}, len(scopes))
	unique := make([]string, 0, len(scopes))

	for _, scope := range scopes {
		lower := strings.ToLower(scope)
		if _, ok := seen[lower]; ok {
			continue
		}
		seen[lower] = struct{}{}
		unique = append(unique, lower)
	}

	sort.Strings(unique)
	return strings.Join(unique, ",")
}

// Canonical rebuilds the exact string that was signed.
func Canonical(e Envelope) string {
	return strings.Join([]string{
		Version,
		e.SessionID,
		e.DeviceID,
		e.Transport,
		e.Fidelity,
		NormalizeScopes(e.Scopes),
		e.RiskClass,
		e.NotBefore,
		e.NotAfter,
		strconv.FormatInt(e.MaxIdleSeconds, 10),
		e.IssuedBy,
	}, "|")
}

// Sign produces the hex HMAC-SHA256 of a canonical string.
func Sign(canonical, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(canonical))
	return hex.EncodeToString(mac.Sum(nil))
}

// Verify checks the signature and then the validity window, in that order.
func Verify(e Envelope, secret string, now time.Time) error {
	expected := Sign(Canonical(e), secret)
	if !hmac.Equal([]byte(expected), []byte(e.Signature)) {
		return ErrSignatureMismatch
	}

	notBefore, err := time.Parse(TimeLayout, e.NotBefore)
	if err != nil {
		return fmt.Errorf("malformed notBefore %q: %w", e.NotBefore, err)
	}
	notAfter, err := time.Parse(TimeLayout, e.NotAfter)
	if err != nil {
		return fmt.Errorf("malformed notAfter %q: %w", e.NotAfter, err)
	}

	if now.Before(notBefore) {
		return ErrNotYetValid
	}
	if !now.Before(notAfter) {
		return ErrExpired
	}

	return nil
}

// RemainingSeconds reports how long an envelope has left, never negative.
func RemainingSeconds(e Envelope, now time.Time) int64 {
	notAfter, err := time.Parse(TimeLayout, e.NotAfter)
	if err != nil {
		return 0
	}
	remaining := int64(notAfter.Sub(now).Seconds())
	if remaining < 0 {
		return 0
	}
	return remaining
}
