// Package notify delivers revocations to node gatekeepers.
package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// NodeNotifier posts revocations to each node's local gatekeeper endpoint.
//
// Node addresses are registered explicitly. The broker never guesses a URL from
// a device name — an unmapped device simply cannot be notified, and its session
// expires on its own schedule instead.
type NodeNotifier struct {
	mu        sync.RWMutex
	endpoints map[string]string
	client    *http.Client
}

// New builds a notifier with a bounded HTTP client.
func New(timeout time.Duration) *NodeNotifier {
	return &NodeNotifier{
		endpoints: make(map[string]string),
		client:    &http.Client{Timeout: timeout},
	}
}

// Register maps a deviceID to its gatekeeper base URL, e.g.
// http://desktop-primary.tailnet.ts.net:8777
func (n *NodeNotifier) Register(deviceID, baseURL string) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.endpoints[deviceID] = baseURL
}

// Revoke tells a node to refuse a session immediately.
func (n *NodeNotifier) Revoke(deviceID, sessionID string) error {
	n.mu.RLock()
	baseURL, ok := n.endpoints[deviceID]
	n.mu.RUnlock()

	if !ok {
		return fmt.Errorf("no gatekeeper endpoint registered for device %q", deviceID)
	}

	body, err := json.Marshal(map[string]string{"sessionId": sessionID})
	if err != nil {
		return fmt.Errorf("encode revoke payload: %w", err)
	}

	resp, err := n.client.Post(baseURL+"/v1/revoke", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("post revoke to %s: %w", baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("gatekeeper %s returned HTTP %d", baseURL, resp.StatusCode)
	}

	return nil
}
