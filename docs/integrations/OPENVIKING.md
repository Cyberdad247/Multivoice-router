# OpenViking Integration (UKG Filesystem)

OpenViking provides the `viking://` virtual filesystem that powers Camelot's memory model.

## Role

```text
OpenViking
= Context Filesystem + Memory Mount Engine
```

## Repository

- Source: `Cyberdad247/OpenViking`
- Purpose: hierarchical context storage, UKG-compatible retrieval, mount-based memory loading.

## Filesystem Structure

```text
viking://camelot/
  context/
    l0/
    l1/
    l2/
  skills/
  personas/
  ledger/
```

## L0/L1/L2 Model

- L0: summary (<100 tokens)
- L1: working context (<2k tokens)
- L2: full data (mounted on demand)

## Integration Flow

```text
OUROBOROS Engine
  -> compress session
  -> generate UKG
  -> write to OpenViking

Anya / Merlin
  -> request context
  -> mount viking:// paths
  -> load L0/L1
  -> escalate to L2 if needed
```

## Example API

```ts
await viking.mount('viking://camelot/context/l1/project-x')
await viking.read('viking://camelot/context/l0')
await viking.write('viking://camelot/context/l2/raw', data)
```

## Multivoice Router Touchpoints

- OUROBOROS engine writes UKG objects
- Engine pipeline reads L1 summaries before reasoning
- Elephas mode mounts L2 for full hydration

## Production Rules

- Never overwrite L2
- Only OUROBOROS writes long-term memory
- Maintain index cache for fast L0 lookups
- Avoid loading L2 unless required

## Golden Rule

OpenViking is not a database—it is a filesystem for cognition.
