-- Camelot-OS Command Queue Schema
-- Production spine for HITL, edge agents, provenance, and runtime state.

create extension if not exists pgcrypto;

create table if not exists camelot_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  name text not null,
  kind text not null check (kind in ('desktop','android','browser','termux','cloud_worker','gpu_worker')),
  tailscale_name text,
  capability_manifest jsonb not null default '{}'::jsonb,
  status text not null default 'offline' check (status in ('online','offline','degraded','blocked')),
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists camelot_commands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  input text not null,
  normalized_input text,
  status text not null default 'drafted' check (status in (
    'drafted','queued','compiled','planned','signed','needs_approval','approved','executing','complete','failed','dead_letter'
  )),
  risk_class text not null default 'L0_OBSERVE' check (risk_class in (
    'L0_OBSERVE','L1_DRAFT','L2_SAFE_EXECUTE','L3_GUARDED_WRITE','L4_HIGH_RISK','L5_FORBIDDEN'
  )),
  cartridge text,
  target_node text,
  target_device_id uuid references camelot_devices(id),
  requires_approval boolean not null default false,
  approved_by uuid,
  approved_at timestamptz,
  dag_hash text,
  signature text,
  ledger_event_id text,
  runtime_payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists camelot_approvals (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references camelot_commands(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','denied','expired')),
  reason text not null,
  risk_class text not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  diff_preview text,
  rollback_plan text,
  veritas_findings jsonb not null default '[]'::jsonb,
  antigravity_envelope jsonb not null default '{}'::jsonb
);

create table if not exists camelot_command_results (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references camelot_commands(id) on delete cascade,
  ok boolean not null,
  stage text not null,
  output_ref text,
  result_payload jsonb not null default '{}'::jsonb,
  error text,
  ledger_event_id text,
  completed_at timestamptz not null default now()
);

create table if not exists camelot_ledger_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  event_type text not null,
  dag_hash text,
  signature text,
  signed_by text,
  status text not null,
  attestation jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists camelot_memory_refs (
  id uuid primary key default gen_random_uuid(),
  command_id uuid references camelot_commands(id) on delete set null,
  memory_kind text not null check (memory_kind in ('ukg','l0','l1','l2','visual','audio','threat','evolution')),
  ref text not null,
  anchors text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_camelot_commands_status_created on camelot_commands(status, created_at);
create index if not exists idx_camelot_commands_target_device on camelot_commands(target_device_id, status);
create index if not exists idx_camelot_approvals_command_status on camelot_approvals(command_id, status);
create index if not exists idx_camelot_ledger_events_event_id on camelot_ledger_events(event_id);

create or replace function camelot_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists touch_camelot_devices on camelot_devices;
create trigger touch_camelot_devices
before update on camelot_devices
for each row execute function camelot_touch_updated_at();

drop trigger if exists touch_camelot_commands on camelot_commands;
create trigger touch_camelot_commands
before update on camelot_commands
for each row execute function camelot_touch_updated_at();

-- Optional RLS should be enabled once org membership helpers exist.
-- alter table camelot_commands enable row level security;
-- alter table camelot_approvals enable row level security;
-- alter table camelot_devices enable row level security;
