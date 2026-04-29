# Supabase Command Queue Integration

## Tables

### commands
- id (uuid)
- plan_id
- target_node
- action
- payload (jsonb)
- requires_approval (bool)
- status (pending|approved|executing|done|failed)
- created_at

### command_results
- id
- command_id
- result (jsonb)
- status
- created_at

## Flow

1. Merlin outputs plan
2. Plan → commands inserted into `commands`
3. Edge agents poll for `pending`
4. If requires approval → wait
5. Execute
6. Insert into `command_results`

## API

GET /api/commands?node=rustdesk
POST /api/commands/result

## Notes
- Use RLS for org isolation
- Add device_id column for routing
- Use realtime subscriptions for dashboard
