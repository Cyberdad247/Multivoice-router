# Security Specification - PersonaLive

## Data Invariants
- A persona must have a unique ID and a valid ownerId matching the creator.
- Personas can only be read/written by their owners.
- Transcripts belong to a persona and an owner, and are immutable after creation (except appending messages if we go that route, but for now we'll save at end of session or use a simple create-only pattern).
- Document IDs must match '^[a-zA-Z0-9_\-]+$'.

## The Dirty Dozen Payloads (Rejection Tests)
1. Creating a persona with another user's `ownerId`.
2. Updating a persona's `ownerId`.
3. Reading another user's persona by document ID.
4. Listing all personas (should only return owned ones).
5. Injecting a 1MB string into the `name` field.
6. Setting an invalid `voice` (e.g., "Siri").
7. Modifying a transcript created by someone else.
8. Deleting someone else's persona.
9. Creating a persona without the required fields `name` or `role`.
10. Setting `updatedAt` to a past timestamp (must be `request.time`).
11. Bypassing size limits on `memory` arrays.
12. Updating an immutable field like `id`.

## Test Runner (Planned)
The `firestore.rules.test.ts` will verify these rejections using the Firebase Emulator / local testing patterns.
