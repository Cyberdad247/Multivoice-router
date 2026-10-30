# Hermes Canonical vs Camelot's Hermes — Compare & Contrast

**Canonical source:** NousResearch/hermes-agent (GitHub, MIT) + official docs — read live 2026-10-29. Repo HEAD `088f657`, 44 releases; latest release **v0.22.5 (2026-10-22)**; v0.23.0 curated notes pending.
**Current source of truth:** the user's Hermes deployment on the Hermes VPS, from verified records 2026-10-05 → 2026-10-29 (no fresh on-box check this session; last full baseline 2026-10-26).
**Ledger sync:** `PROVENANCE_LEDGER.md` §5 in `Cyberdad247/Multivoice-router` carries the Hermes control-plane entries.

---

## 1. Canonical Hermes (upstream, as published)

Hermes Agent is Nous Research's **self-improving AI agent**: one agent that does the work itself and grows from doing it.

- **The learning loop is the product:** it creates skills from experience, improves them during use, nudges itself to persist knowledge, searches its own past conversations (FTS5 + LLM summarization), and builds a deepening user model (Honcho dialectic modeling). Skills follow the agentskills.io open standard.
- **One agent, every surface:** a single gateway process serves Telegram, Discord, Slack, WhatsApp, Signal and CLI with cross-platform conversation continuity and voice-memo transcription; plus a full TUI, a native desktop app, an ACP server for IDEs, and a web dashboard. Sessions, config, keys, skills and memory sync across all of them.
- **Delegation:** spawns isolated subagents for parallel workstreams (provider/model/limits selectable); Python scripts can call tools via RPC to collapse multi-step pipelines into zero-context-cost turns. v0.22.x made delegation backends pluggable.
- **Cron built in:** a scheduler with delivery to any platform — daily reports, nightly backups, weekly audits, in natural language, unattended.
- **Runs anywhere:** six terminal backends — local, Docker, SSH, Modal, Daytona, Vercel Sandbox (+ plugin backends). Headline topology: *"Run it on a $5 VPS… talk to it from Telegram while it works on a cloud VM."*
- **Model freedom:** Nous Portal, OpenRouter, OpenAI, **your own OpenAI-compatible endpoint**, 20+ providers; `hermes model` switches with no code changes; credential pools rotate keys.
- **Profiles:** multiple independent instances with isolated config, sessions, skills, memory.
- **Extensibility:** plugins, MCP servers as a client (and `hermes mcp serve` in v0.22.x), webhook triggers, a plugin catalog.
- **Safety:** tiered approval rules for risky commands; SECURITY.md; a startup watchdog.
- **Velocity:** extreme. The v0.22.3 patch window alone folded ~620 PRs / 2,911 commits; v0.22.2 fixed a gateway-after-reboot liveness bug class (boot-epoch records, recycled-PID rejection).

## 2. Camelot's Hermes (the deployment, as verified)

- **Version 0.20.5**, gateway running, on the 8GB Hermes VPS (`camelot-host`, 100.110.180.18, Ubuntu 24.04 host). The Hermes app runs as host-packaged container under s6 supervision; dashboard on **:9119**, reached directly from the user's phone over Tailscale.
- **Brain rewired to his own inference:** dashboard chat's provider is `custom` → `http://127.0.0.1:8180/v1` (the VPS Bifrost/Atom gateway), set 2026-10-05 with a config backup; the gateway restarted clean and the backend answered live before the config changed.
- **Role: control plane, not workforce.** Everything done to that box — file deploys, one-shot job scripts, cron management, restarts, log reads — goes *through* the Hermes REST surface (jobs / files / cron APIs, session-cookie password login) driven by an **external** agent. The actual workforce is a separate fleet Hermes does not manage: knight_runtime + Watchtower + mesh broker + Anya Omega + Bifrost/RoundTable + Open Notebook/Redis/Qdrant.
- **Cron used as an ops API, not a personal assistant:** the keeper script that resurrects Watchtower runs as a `no_agent` Hermes cron every minute; the dead-man's canary every 15 min; the Lisa IG relay every 2 min; deploy/update jobs are created, triggered, and deleted **programmatically by exact name/id** (the Oct 22 accidental keeper deletion + instant recreation is the cautionary record of how real that control surface is).
- **Surfaces actually used:** the web dashboard (phone) and the REST API. **None** of the 20+ messaging gateway platforms are in service — the user explicitly declined a Hermes notification integration (2026-09-25); phone alerts/commands travel phone → Tailscale → ntfy, never Hermes.
- **Memory:** Hermes' built-in loop serves its dashboard chat. The fleet's memory — the memory that matters — lives outside Hermes entirely: per-knight Open Notebook notebooks, Redis flash, Qdrant context, Mnemosyne's vault.
- **A second Hermes exists:** **Hermes Prime**, a Camelot phial on the host (systemd timer, 60s cycle, read-only command allowlist, 56,277 cycles at last read, verdict DEPLOY) — an MGV observer that starts and restarts *nothing*. Plus "Hermes" as the control-plane pseudo-knight in the voice registry (`runtimeKnight: false`). Upstream knows neither.

## 3. Where they AGREE

| Canonical | Camelot's deployment |
|---|---|
| VPS + phone is the headline topology | Exactly his: 8GB VPS, phone-first operation (dashboard, Termux SSH proven) |
| Point Hermes at your own OpenAI-compatible endpoint | Done literally: `custom` provider → his Bifrost :8180 — the canonical escape hatch, used as designed |
| Cron as the automation backbone | His box runs on Hermes cron — keeper, canary, relay, deploy jobs |
| MIT, fork it, build on it | He treats Hermes as infrastructure substrate for a larger OS — the license's intent |
| SOUL.md ships in the upstream repo | His whole ecosystem runs on soul files; the pattern is convergent |
| Skills are the unit of capability | Same unit — different authorship (see divergence 5) |

## 4. Where they DIVERGE

Ranked by structural weight:

1. **Role inversion — the big one.** Canonical Hermes *is* the agent: it does tasks and delegates to its own subagents. Camelot's Hermes has been **promoted sideways into a control plane**: an external agent operates the box through its API, and a separate knight fleet — supervised by Watchtower, not Hermes — does the work. Hermes' own subagent delegation is unused. Nothing upstream describes this topology; it's an emergent property of building an OS on top of an agent framework.
2. **Memory externalized.** The learning loop (curated memory, FTS5 recall, Honcho user model) is canonical's signature. In Camelot, that function was **rebuilt outside Hermes** as the tri-dynamic CloudBrain (NotebookLM + Open Notebook + Redis + Qdrant), because memory had to be *per-knight and shared-nothing*, which a single agent's memory can't express. Hermes' own memory is a sidecar for dashboard chat.
3. **The gateway's platforms are dark.** Canonical's "lives where you do" = 20+ chat platforms from one gateway process. His gateway serves **zero** of them by deliberate ruling; the human-facing channels are the dashboard, ntfy, and Tailscale — a smaller, self-owned surface instead of platform tenancy.
4. **Supervision outsourced — scar tissue architecture.** Upstream supervises itself (systemd/launchd/Docker + its startup watchdog; v0.22.2 even fixed the reboot-liveness bug class). His box wraps Hermes in **s6 on the host + Watchtower + a keeper cron + a 15-minute dead-man's canary + encrypted off-box backups**, because the Oct 21–22 outage (Watchtower syntax error, stack down ~27h) taught him not to trust any single layer — including Hermes. The revive chain was then *proven* Oct 27–28 (kill test ~20s resurrection; reboot drill, ALL SERVICES UP 7/7).
5. **Governed skills vs self-improving skills.** Upstream's loop writes and improves its own skills autonomously. In Camelot, capability growth is **authored and gated**: specs carry NOT_PRODUCTION_READY until ruled otherwise, diffs pass an iron gate, and the operating skill for Hermes itself lives in the *other* agent's skill library. Autonomy of the loop is traded for auditability.
6. **Version lag, deliberately.** Deployed **0.20.5**; upstream is at **v0.22.5** — two minor lines and a firehose of patches behind (one upstream patch window: ~620 PRs). Upstream even fixed, in 0.22.2, the exact gateway-after-reboot liveness class his revive chain defends against. His posture is stability-first: upgrades are scheduled events, not reflexes. The lag is a choice with a real cost line, and this is it.
7. **Security lives in the operator, not the tool.** Canonical: tiered in-product approval rules. His: an external protocol — task-scoped one-time passwords, never stored, iron-gate approvals — wrapped around Hermes' password session auth. Effective (proven across dozens of tasks), but it is *discipline*, not a Hermes feature; it would not survive a careless operator.
8. **Backends: one of six, by law.** Upstream offers local/Docker/SSH/Modal/Daytona/Vercel backends. His execution is the jobs API on the box itself; Docker appears only as the host packaging that carries the Hermes app — and is banned for Camelot workloads by his own anti-Docker law (microVM design). Modal/Daytona-style serverless hibernation is the opposite pole from his always-on sovereign box.
9. **Profiles unused.** Upstream's isolation answer is multi-profile instances. His isolation is architectural: separate processes, separate notebooks, Watchtower supervision — one Hermes, many non-Hermes citizens.
10. **Hermes Prime.** A read-only observer phial wearing the same name — in Camelot cosmology Hermes is the *control-plane persona*, so the host's MGV watcher inherits it. Upstream has no such layer; the name collision is intentional locally and confusing only if you read upstream docs onto his box.

## 5. The one-sentence contrast

Canonical Hermes is a **self-improving solo agent** that does the work, learns from it, and meets you on every chat platform; Camelot's Hermes is the **same framework re-cast as a sovereign control plane** — its API is the box's front door, its cron is the ops heartbeat, its own agent loop serves one dashboard, while memory, workforce, supervision, and safety were each rebuilt outside it, deliberately, one outage lesson at a time.

**Watch item:** the 0.20.5 → 0.22.x gap includes upstream fixes in his exact pain classes (gateway reboot liveness, supervised-start). An upgrade is a user-ruled event; when it happens it should ride the proven pattern — backup first, boot contract check, revive drill after.
