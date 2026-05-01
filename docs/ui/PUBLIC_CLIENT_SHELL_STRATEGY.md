# Public Client Shell Strategy

Project: `Cyberdad247/v0-project-crusade`  
Role: Public-facing polished landing and client shell  
Runtime: Multivoice-router + Camelot-OS behind the curtain

## Final Role Separation

```text
v0-project-crusade
= public/client-facing polished shell

anya-interphase
= private Anya operator cockpit

Multivoice-router
= voice/persona routing + edge runtime contracts

Camelot-OS
= governed brain, memory, HITL, provenance, orchestration
```

## Why Project Crusade Fits This Role

Project Crusade is built as a polished Next.js public interface with modular sections:

- Header
- Hero
- Services
- Process
- Stats
- CTA
- Footer
- AnimatedGrid background

That makes it ideal for:

- public brand site,
- client acquisition landing page,
- service explanation,
- AI growth audit intake,
- client login gateway,
- approved dashboard shell.

## What Clients Should See

Clients should see outcomes, workflows, and approved controls.

Allowed:

- public service pages,
- AI growth audit form,
- client dashboard,
- campaign reports,
- approval queue,
- deliverables/assets,
- workflow status,
- chatbot/avatar demos,
- subscription/marketplace pages.

Blocked:

- Camelot kernel prompts,
- global memory,
- Knight internals,
- private system doctrine,
- cross-tenant data,
- raw orchestration logs,
- internal provider keys/routes,
- unreviewed agent outputs.

## Recommended Public Shell Routes

```text
/                       public landing
/services               services overview
/process                how it works
/audit                  AI growth audit intake
/login                  Supabase auth entry
/client                 client dashboard
/client/approvals       client approval queue
/client/reports         campaign/reporting hub
/client/assets          approved assets and deliverables
/client/workflows       safe workflow launchers
/marketplace            agent/service marketplace
/admin                  internal operator gate, optional
```

## Client Dashboard Panels

### 1. Campaign Overview

Shows:

- active campaigns,
- status,
- next milestone,
- performance summary,
- pending approvals.

### 2. Approval Queue

Shows:

- content drafts,
- website changes,
- campaign launches,
- ad copy,
- reports,
- approve / request changes / reject.

### 3. Reports

Shows:

- SEO/GEO reports,
- content performance,
- social calendar status,
- lead funnel metrics,
- ROI summary.

### 4. Assets

Shows:

- approved images,
- copy blocks,
- short-form scripts,
- videos/audio,
- campaign packages.

### 5. Safe Workflow Launchers

Client-safe launchers only:

- Request SEO audit
- Generate content draft
- Request social calendar
- Ask for campaign report
- Submit brand update
- Request chatbot/avatar update

All high-risk or publish actions require review.

## Backend Boundary

Project Crusade should call public-safe APIs only.

```text
Project Crusade UI
  -> public/client API gateway
  -> Supabase auth/RLS
  -> workflow request table
  -> operator/Camelot review path
  -> approved output returns to client
```

Project Crusade must not directly call:

- raw Camelot runtime execution,
- internal command queue with high-risk actions,
- private memory stores,
- provider keys,
- shell/edge workers.

## API Contract Sketch

```text
GET  /api/public/health
POST /api/audit/request
GET  /api/client/dashboard
GET  /api/client/approvals
POST /api/client/approvals/:id/decision
GET  /api/client/reports
GET  /api/client/assets
POST /api/client/workflows/request
```

## Supabase Data Exposure

Client-safe tables/views:

```text
client_dashboard_view
client_approval_view
client_report_view
client_asset_view
client_workflow_request_view
```

Internal tables should stay protected behind RLS:

```text
camelot_commands
camelot_ledger_events
camelot_memory_refs
agent_runs
execution_events
```

## Visual Direction

Use Project Crusade's polished luxury/intelligence aesthetic for public trust:

```text
black/obsidian base
gold/primary accents
clean strategic language
premium service positioning
clear CTAs
low friction intake
```

Do not expose deep Camelot mythology to clients unless packaged as brand flavor. Public copy should translate system power into business outcomes.

## Public Copy Translation

Internal language:

```text
Camelot Knight Swarm executes SEO/GEO campaign via Anya, Merlin, Alex, Link, and Gideon.
```

Public language:

```text
Our AI-assisted strategy team audits, plans, drafts, reviews, and delivers growth assets through a governed approval workflow.
```

## Integration with Anya Interphase

```text
Project Crusade
  -> client sees approved results and safe requests

Anya Interphase
  -> operator sees full runtime, edge hands, voice, approvals, cartridge dashboards
```

## Golden Rule

Project Crusade is the showroom. Anya Interphase is the cockpit. Camelot is the engine room.
