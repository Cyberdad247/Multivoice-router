# RustDesk Edge Agent (Camelot)

This service turns RustDesk from a remote viewer into a governed execution node.

## Responsibilities
- Poll Camelot command queue
- Execute safe desktop actions
- Capture screenshots
- Return results
- Trigger RustDesk session for manual takeover

## Flow

```text
Command Queue (Supabase)
  -> RustDesk Agent
  -> Execute / Screenshot / Shell (guarded)
  -> POST result
```

## Capabilities
- open_app
- open_url
- type_text
- hotkeys
- screenshot
- clipboard (approval)
- shell (approval)

## Safety
- All commands require Titan Prompt origin
- High-risk commands require approval
- All actions logged to Provenance Ledger

## Next Steps
- Implement command polling loop
- Add OS-specific adapters (Windows/Linux/Mac)
- Integrate RustDesk CLI or IPC hooks
