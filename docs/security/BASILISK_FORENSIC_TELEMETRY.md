# Basilisk Protocol Traceback – Forensic Telemetry Defense Spec

Camelot-OS | Passive Attribution and Threat Telemetry

Basilisk is a forensic telemetry loop, not a hacking-back tool. It uses internal Rotel traces and external OSINT correlation to create threat records, UKG threat nodes, and provenance ledger entries.

## Efficient Placement

```text
L6 Governance / Defense
  -> Sir Sentinel + Sir Octavian policy
L2 Kinetic telemetry
  -> Rotel trace stream
L5 Research
  -> Lady Apis OSINT correlation
L4 Memory
  -> OUROBOROS UKG threat node
```

## Agent Roles

- Rotel: internal telemetry and trace stream.
- Lady Apis: external intelligence and OSINT lookup.
- Sir Octavian / Sentinel: legal and governance boundaries.
- OUROBOROS: UKG threat memory.
- ANTIGRAVITY: safe log reading and ledger writes.

## Data Flow

```text
Rotel Trace Stream
  -> Basilisk parser
  -> timing/fingerprint analysis
  -> Lady Apis OSINT lookup
  -> Veritas confidence audit
  -> UKG_THREAT_NODE
  -> Provenance Ledger
```

## Rotel Configuration

Example debug command:

```bash
rotel start --debug-log traces \
  --debug-log-verbosity detailed \
  --otlp-grpc-endpoint localhost:4317
```

## Activation Command

```text
//DEFENSE_TRACE --target [IP_ADDRESS] --mode BASILISK
```

## Governance Boundary

Basilisk may perform:

- passive telemetry analysis,
- OSINT lookup,
- proxy/VPN/Tor classification,
- timing correlation,
- ledger recording,
- defensive null-route recommendation.

Basilisk must not perform:

- exploit attempts,
- credential attacks,
- brute force,
- unauthorized access,
- hacking back,
- destructive retaliation.

## UKG Threat Node Shape

```json
{
  "@type": "UKG_THREAT_NODE",
  "target_ip": "203.0.113.10",
  "classification": "known_proxy_or_scanner",
  "sources": ["rotel", "greynoise", "shodan"],
  "confidence": 0.72,
  "recommended_action": "block_or_rate_limit",
  "legal_boundary": "defensive_osint_only"
}
```

## Golden Rule

Basilisk can stare back. It cannot strike back.
