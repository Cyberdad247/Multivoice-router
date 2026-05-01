# Camelot Forge QR Manifest Assimilation

Source: `Cyberdad247/Camelot-forge`  
Role: QR Manifest Forge for node enrollment, offline bootstrap, and cartridge transfer

## Verdict

`Camelot-forge` should be assimilated as the **QR Manifest Forge** layer.

It is not the Knight/persona forge. It is a compact Go utility that turns manifests into QR payloads and decodes them back.

## What It Does

```text
Encode:
file -> zlib(best) -> ASCII85 -> !CAMELOT-V1! prefix -> QR PNG

Decode:
QR PNG -> strip !CAMELOT-V1! -> ASCII85 -> zlib inflate -> recovered file
```

## Where It Fits

```text
Camelot-forge
  -> QR manifest encoder/decoder
  -> used by Anya Interphase node enrollment
  -> used by PhoneClaw/Superpowers Chrome/RustDesk/Termux pairing
  -> used for offline bootstrap and cartridge transfer
```

## Supported Use Cases

### 1. Edge Node Enrollment

Generate QR for:

- PhoneClaw Android node
- Superpowers Chrome browser node
- RustDesk desktop node
- Termux CLI node
- Modal/cloud worker node

### 2. Cartridge Transfer

Generate QR for small cartridge manifests:

- ANT research cartridge
- BEAVER build cartridge
- SPIDER integration cartridge
- OCTOPUS recovery cartridge

### 3. Offline Bootstrap

Generate QR for:

- Anya edge configuration
- local worker bootstrap script
- Tailscale enrollment note
- minimal runtime config
- emergency `//HYDRATE` seed

### 4. Recovery / Airgap Mode

Use QR to move a compact manifest between devices without cloud sync.

## Capacity Constraints

The current utility chooses QR error correction based on payload size:

```text
≤ 1273 B  -> High ECC, ~30% recovery
≤ 2331 B  -> Medium ECC, ~15% recovery
≤ 2953 B  -> Low ECC, ~7% recovery
> 2953 B  -> rejected
```

This means QR payloads must stay compact. Large manifests should be compressed to UKG/TOON or split into chunks in a future version.

## Integration with QR Node Enrollment

`src/edge/qr-node-enrollment.ts` defines the enrollment object.

Camelot-forge can encode that object into a QR PNG.

Flow:

```text
Anya Interphase creates NodeEnrollmentQrPayload
  -> serialize JSON manifest
  -> camelot-forge encode manifest.json -> manifest.qr.png
  -> display QR in Node Enrollment panel
  -> node scans QR
  -> node sends enrollment request
  -> Camelot registers node
```

## Recommended Binary Placement

```text
tools/camelot-forge/camelot-forge
```

or as a Go module/submodule:

```text
external/Camelot-forge
```

## Runtime Contract

The runtime should not depend directly on the Go binary for logic. It should call a small adapter:

```text
src/edge/camelot-forge-adapter.ts
```

Adapter methods:

```text
writeManifest(payload) -> manifest path
encodeManifestToQr(path) -> qr path
decodeQrToManifest(path) -> manifest path
verifyRoundTrip(original, recovered) -> boolean
```

## Security Rules

- QR payloads must never include long-term secrets.
- QR enrollment tokens must expire quickly.
- QR tokens should be single-use.
- Decoded manifests must be validated before use.
- Node capabilities must be approved by policy.
- High-risk node actions still require HITL.

## Future Upgrade

Add chunked QR support:

```text
!CAMELOT-V2!
chunk_index
chunk_total
manifest_hash
payload_chunk
```

This would allow bigger cartridge transfers and offline bootstrap bundles.

## Golden Rule

Camelot-forge turns compact intent into scannable matter. The QR opens the door, but governance decides what may enter.
