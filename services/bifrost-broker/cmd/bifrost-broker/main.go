// Command bifrost-broker is the control-plane half of the Bifrost Bridge.
//
// It sits between the TypeScript guardian (which rules on crossings) and the
// Rust gatekeepers (which enforce those rulings on each node). It holds no
// policy: it records node liveness, stores verified session envelopes, and fans
// revocations out to nodes.
//
// Liveness matters because Heimdall refuses to open a crossing to a device
// whose gatekeeper has gone quiet — so a broker that stops hearing from a node
// causes the bridge to close to that node, which is the intended failure mode.
//
// Usage:
//
//	BIFROST_SIGNING_SECRET=<shared secret> \
//	BIFROST_BROKER_TOKEN=<control-plane token> \
//	BIFROST_BROKER_BIND=:8080 \
//	BIFROST_NODE_ENDPOINTS=desktop_primary=http://desktop-primary.tailnet.ts.net:8777 \
//	go run ./cmd/bifrost-broker
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/api"
	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/notify"
	"github.com/cyberdad247/multivoice-router/services/bifrost-broker/internal/registry"
)

const (
	defaultBind      = ":8080"
	sweepInterval    = 30 * time.Second
	notifyTimeout    = 5 * time.Second
	shutdownGrace    = 10 * time.Second
	minSecretLength  = 16
	nodeEndpointsSep = ","
)

func main() {
	signingSecret := os.Getenv("BIFROST_SIGNING_SECRET")
	if len(signingSecret) < minSecretLength {
		log.Fatalf("[broker] BIFROST_SIGNING_SECRET must be at least %d characters; refusing to start", minSecretLength)
	}

	brokerToken := os.Getenv("BIFROST_BROKER_TOKEN")
	if brokerToken == "" {
		log.Fatal("[broker] BIFROST_BROKER_TOKEN is required; refusing to start without request authentication")
	}

	bind := os.Getenv("BIFROST_BROKER_BIND")
	if bind == "" {
		bind = defaultBind
	}

	reg := registry.New()
	notifier := notify.New(notifyTimeout)
	registerNodeEndpoints(notifier, os.Getenv("BIFROST_NODE_ENDPOINTS"))

	server := &http.Server{
		Addr:              bind,
		Handler:           api.New(reg, signingSecret, brokerToken, notifier).Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go sweepExpiredSessions(ctx, reg, notifier)

	go func() {
		log.Printf("[broker] Bifrost broker listening on %s", bind)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[broker] listener failed: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("[broker] shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownGrace)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("[broker] graceful shutdown failed: %v", err)
	}
}

// registerNodeEndpoints parses "deviceId=url,deviceId=url" into the notifier.
func registerNodeEndpoints(notifier *notify.NodeNotifier, raw string) {
	if raw == "" {
		log.Println("[broker] BIFROST_NODE_ENDPOINTS is empty; revocations cannot be pushed to nodes")
		return
	}

	for _, pair := range strings.Split(raw, nodeEndpointsSep) {
		pair = strings.TrimSpace(pair)
		if pair == "" {
			continue
		}

		deviceID, url, found := strings.Cut(pair, "=")
		if !found || deviceID == "" || url == "" {
			log.Printf("[broker] ignoring malformed node endpoint %q (want deviceId=url)", pair)
			continue
		}

		notifier.Register(strings.TrimSpace(deviceID), strings.TrimSpace(url))
		log.Printf("[broker] registered gatekeeper for %s", deviceID)
	}
}

// sweepExpiredSessions pushes revocations for envelopes that have aged out.
//
// Nodes already refuse expired envelopes on their own; this closes the window
// where a node is still streaming because nothing told it to stop.
func sweepExpiredSessions(ctx context.Context, reg *registry.Registry, notifier *notify.NodeNotifier) {
	ticker := time.NewTicker(sweepInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for _, session := range reg.ExpiredSessions(time.Now()) {
				id := session.Envelope.SessionID
				reg.Revoke(id, "broker_sweep")

				if err := notifier.Revoke(session.Envelope.DeviceID, id); err != nil {
					log.Printf("[broker] sweep could not notify %s about %s: %v", session.Envelope.DeviceID, id, err)
					continue
				}
				log.Printf("[broker] swept expired session %s on %s", id, session.Envelope.DeviceID)
			}
		}
	}
}
