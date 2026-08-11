package journal

import (
	"encoding/json"
	"testing"
)

// Cross-language vector produced by src/bifrost/observability/session-journal.ts.
// The detail object is deliberately written with unsorted keys and a nested
// object, because canonicalization is the part most likely to drift.
const vectorJSON = `[
 {"kind":"session_issued","actor":"sir_heimdall","summary":"issued","sessionId":"bfs_vector_001",
  "deviceId":"desktop_primary","tenantId":"tenant_acme","riskClass":"L1_DRAFT",
  "transport":"sunshine_moonlight","scopes":["screen_view","audio_out"],
  "detail":{"zebra":1,"alpha":{"nested":true,"apple":"x"}},"seq":0,
  "timestamp":"2026-08-10T12:00:00.000Z",
  "prevHash":"0000000000000000000000000000000000000000000000000000000000000000",
  "hash":"367efccb9ec7b77f354ec0ec8adfbc3395fae6ba34d066f12ba4ae2048bca099"},
 {"kind":"session_closed","actor":"supervisor","summary":"closed","sessionId":"bfs_vector_001",
  "seq":1,"timestamp":"2026-08-10T12:05:00.000Z",
  "prevHash":"367efccb9ec7b77f354ec0ec8adfbc3395fae6ba34d066f12ba4ae2048bca099",
  "hash":"1d5a43c7031dbbc5f2e9d11650a699a63cf90732a910c7b1155c03ad79521762"}
]`

func vectorEntries(t *testing.T) []Entry {
	t.Helper()
	var entries []Entry
	if err := json.Unmarshal([]byte(vectorJSON), &entries); err != nil {
		t.Fatalf("decode vector: %v", err)
	}
	return entries
}

func TestHashMatchesTypeScript(t *testing.T) {
	entries := vectorEntries(t)

	for i, entry := range entries {
		got, err := HashEntry(entry)
		if err != nil {
			t.Fatalf("hash entry %d: %v", i, err)
		}
		if got != entry.Hash {
			t.Errorf("entry %d hash mismatch:\n got: %s\nwant: %s", i, got, entry.Hash)
		}
	}
}

func TestVerifyChainAcceptsVector(t *testing.T) {
	if v := VerifyChain(vectorEntries(t)); !v.OK {
		t.Errorf("expected intact chain, got: %s", v.Reason)
	}
}

func TestDetailKeyOrderDoesNotChangeHash(t *testing.T) {
	entries := vectorEntries(t)
	entry := entries[0]

	// Same logical detail, different key order on the wire.
	entry.Detail = json.RawMessage(`{"alpha":{"apple":"x","nested":true},"zebra":1}`)

	got, err := HashEntry(entry)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if got != entries[0].Hash {
		t.Errorf("key order changed the hash; canonicalization is not working:\n got: %s\nwant: %s", got, entries[0].Hash)
	}
}

func TestEditedEntryBreaksChain(t *testing.T) {
	entries := vectorEntries(t)
	entries[0].Summary = "issued (edited)"

	v := VerifyChain(entries)
	if v.OK {
		t.Fatal("an edited entry must break the chain")
	}
	if v.BrokenAt != 0 {
		t.Errorf("break should be located at entry 0, got %d", v.BrokenAt)
	}
}

func TestRemovedEntryBreaksChain(t *testing.T) {
	entries := vectorEntries(t)
	if v := VerifyChain(entries[1:]); v.OK {
		t.Fatal("dropping the first entry must break the chain")
	}
}

func TestStoreRejectsBrokenBatchWholesale(t *testing.T) {
	store := NewStore()
	entries := vectorEntries(t)
	entries[1].Hash = "0000000000000000000000000000000000000000000000000000000000000000"

	if _, err := store.Append(entries); err == nil {
		t.Fatal("expected the batch to be refused")
	}
	if store.Len() != 0 {
		t.Errorf("a refused batch must not be partially stored; %d entries present", store.Len())
	}
}

func TestStoreAcceptsGoodBatch(t *testing.T) {
	store := NewStore()
	entries := vectorEntries(t)

	verification, err := store.Append(entries)
	if err != nil {
		t.Fatalf("append: %v", err)
	}
	if !verification.OK {
		t.Errorf("expected OK verification, got %s", verification.Reason)
	}
	if store.Len() != 2 {
		t.Errorf("expected 2 entries, got %d", store.Len())
	}
	if store.Head() != entries[1].Hash {
		t.Errorf("head hash mismatch: %s", store.Head())
	}
}

func TestForTenantFilters(t *testing.T) {
	store := NewStore()
	if _, err := store.Append(vectorEntries(t)); err != nil {
		t.Fatalf("append: %v", err)
	}

	if got := len(store.ForTenant("tenant_acme")); got != 1 {
		t.Errorf("expected 1 acme entry, got %d", got)
	}
	if got := len(store.ForTenant("tenant_other")); got != 0 {
		t.Errorf("expected no entries for another tenant, got %d", got)
	}
}

func TestEmptyStoreHeadIsGenesis(t *testing.T) {
	if NewStore().Head() != Genesis {
		t.Error("an empty store's head must be the genesis hash")
	}
}
