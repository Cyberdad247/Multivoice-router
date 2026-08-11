// Package journal stores and independently verifies the hash-chained session
// journal produced by the control plane.
//
// The broker recomputes every entry hash rather than trusting the one it was
// sent. That is the whole value of shipping the journal here: a control plane
// that has been tampered with cannot quietly rewrite history in the store that
// outlives it.
//
// CANONICAL FORM — keep in lockstep with src/bifrost/observability/session-journal.ts
//
//	seq|timestamp|kind|sessionId|deviceId|tenantId|actor|summary|riskClass|transport|scopes|detail|prevHash
//
// scopes is sorted and comma-joined. detail is canonical JSON with recursively
// sorted object keys — Go's encoding/json sorts map keys already, which is why
// detail is decoded into `any` and re-encoded rather than passed through.
package journal

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// Genesis is the prevHash of the first entry.
const Genesis = "0000000000000000000000000000000000000000000000000000000000000000"

// Entry is one journal record.
type Entry struct {
	Seq       int             `json:"seq"`
	Timestamp string          `json:"timestamp"`
	Kind      string          `json:"kind"`
	SessionID string          `json:"sessionId,omitempty"`
	DeviceID  string          `json:"deviceId,omitempty"`
	TenantID  string          `json:"tenantId,omitempty"`
	Actor     string          `json:"actor"`
	Summary   string          `json:"summary"`
	RiskClass string          `json:"riskClass,omitempty"`
	Transport string          `json:"transport,omitempty"`
	Scopes    []string        `json:"scopes,omitempty"`
	Detail    json.RawMessage `json:"detail,omitempty"`
	PrevHash  string          `json:"prevHash"`
	Hash      string          `json:"hash"`
}

// canonicalJSON re-encodes a value with recursively sorted object keys.
//
// Go's encoding/json marshals map[string]any with sorted keys, so decoding into
// `any` and re-marshalling produces exactly what the TypeScript canonicalJson
// helper produces.
func canonicalJSON(raw json.RawMessage) (string, error) {
	if len(raw) == 0 {
		return "{}", nil
	}

	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return "", fmt.Errorf("detail is not valid JSON: %w", err)
	}

	encoded, err := json.Marshal(decoded)
	if err != nil {
		return "", fmt.Errorf("re-encode detail: %w", err)
	}

	return string(encoded), nil
}

// Canonical rebuilds the string that was hashed.
func Canonical(entry Entry) (string, error) {
	detail, err := canonicalJSON(entry.Detail)
	if err != nil {
		return "", err
	}

	scopes := append([]string(nil), entry.Scopes...)
	sort.Strings(scopes)

	return strings.Join([]string{
		strconv.Itoa(entry.Seq),
		entry.Timestamp,
		entry.Kind,
		entry.SessionID,
		entry.DeviceID,
		entry.TenantID,
		entry.Actor,
		entry.Summary,
		entry.RiskClass,
		entry.Transport,
		strings.Join(scopes, ","),
		detail,
		entry.PrevHash,
	}, "|"), nil
}

// HashEntry computes an entry's hash from its canonical form.
func HashEntry(entry Entry) (string, error) {
	canonical, err := Canonical(entry)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:]), nil
}

// Verification reports the outcome of a chain check.
type Verification struct {
	OK       bool   `json:"ok"`
	BrokenAt int    `json:"brokenAt"`
	Reason   string `json:"reason"`
	HeadHash string `json:"headHash"`
}

// VerifyChain recomputes every hash and checks the linkage.
func VerifyChain(entries []Entry) Verification {
	expectedPrev := Genesis

	for index, entry := range entries {
		if entry.Seq != index {
			return Verification{false, index, fmt.Sprintf("entry %d has sequence %d; entries are missing or reordered", index, entry.Seq), expectedPrev}
		}
		if entry.PrevHash != expectedPrev {
			return Verification{false, index, fmt.Sprintf("entry %d does not follow its predecessor", index), expectedPrev}
		}

		computed, err := HashEntry(entry)
		if err != nil {
			return Verification{false, index, fmt.Sprintf("entry %d could not be hashed: %v", index, err), expectedPrev}
		}
		if computed != entry.Hash {
			return Verification{false, index, fmt.Sprintf("entry %d was modified after it was written", index), expectedPrev}
		}

		expectedPrev = entry.Hash
	}

	return Verification{true, -1, "journal chain intact", expectedPrev}
}

// Store is an append-only journal, safe for concurrent use.
type Store struct {
	mu      sync.RWMutex
	entries []Entry
}

// NewStore returns an empty store.
func NewStore() *Store {
	return &Store{}
}

// Append adds entries and verifies the resulting chain.
//
// Rejects the batch wholesale if it would break the chain — a store that
// accepts a broken batch and reports the break later has already lost the
// property it exists to provide.
func (s *Store) Append(entries []Entry) (Verification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	candidate := append(append([]Entry(nil), s.entries...), entries...)
	verification := VerifyChain(candidate)

	if !verification.OK {
		return verification, fmt.Errorf("refusing batch: %s", verification.Reason)
	}

	s.entries = candidate
	return verification, nil
}

// All returns a copy of every entry.
func (s *Store) All() []Entry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]Entry(nil), s.entries...)
}

// ForTenant returns a tenant's entries only.
func (s *Store) ForTenant(tenantID string) []Entry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var out []Entry
	for _, entry := range s.entries {
		if entry.TenantID == tenantID {
			out = append(out, entry)
		}
	}
	return out
}

// Verify checks the stored chain.
func (s *Store) Verify() Verification {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return VerifyChain(s.entries)
}

// Head returns the hash of the last entry, for anchoring into the ledger.
func (s *Store) Head() string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.entries) == 0 {
		return Genesis
	}
	return s.entries[len(s.entries)-1].Hash
}

// Len reports how many entries are stored.
func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.entries)
}
