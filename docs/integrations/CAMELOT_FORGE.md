# Camelot Forge Integration

Camelot Forge is the bootstrap and enrollment layer for Camelot Edge devices.

## Role

```text
Camelot Forge
= QR / NFC / signed manifest bootloader
```

It is responsible for turning a raw device into a trusted Camelot Edge Node.

## Repository

- Source: `Cyberdad247/Camelot-forge`
- Purpose: encode/decode signed enrollment manifests, generate QR payloads, support future NFC tap-to-enroll.

## Integration Flow

```text
Operator Dashboard
  -> Create Enrollment Session
  -> Camelot Forge Manifest
  -> QR or NFC Token
  -> Device scans/taps
  -> Anya verifies manifest
  -> Device registers
  -> Tailscale joins private mesh
  -> RustDesk / PhoneClaw / Chrome node activates
```

## Manifest Contract

```json
{
  "schemaVersion": "camelot.forge.v2",
  "orgId": "org_123",
  "deviceId": "edge_001",
  "deviceType": "android | browser | rustdesk | termux",
  "gatewayUrl": "https://api.example.com",
  "tailscale": {
    "enabled": true,
    "tags": ["tag:edge-node"]
  },
  "rustdesk": {
    "enabled": true,
    "relay": "rustdesk.example.com"
  },
  "cartridges": ["android_social_operator"],
  "expiresAt": "2026-05-01T00:00:00Z"
}
```

## Production Requirements

- No long-lived secrets in QR/NFC payloads
- Use one-time enrollment tokens
- Ed25519-sign manifests
- Expire manifests quickly
- Log every enrollment to the provenance ledger
- Device must visibly confirm enrollment

## Multivoice Router Touchpoints

- `src/anya/anya-compiler.ts`: validates enrollment commands
- `src/engines/core-engines.ts`: OUROBOROS logs enrollment memory
- Future: `/api/enrollment/create`, `/api/enrollment/claim`

## Golden Rule

Forge does not execute commands. Forge only proves identity, bootstraps trust, and enrolls nodes.
