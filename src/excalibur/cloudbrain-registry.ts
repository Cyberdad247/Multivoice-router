/**
 * CloudBrain registry — canonical ground truth for the Camelot VPS
 * architecture as verified live through 2026-10-22.
 *
 * Rules baked into this data:
 *  - Endpoints are VPS loopback addresses. They are NOT reachable from
 *    this server or the browser; liveness for them is Watchtower's word
 *    (supervised / monitored), never a probe invented here.
 *  - 'verified-live' is reserved for pieces exercised end-to-end:
 *    the Bifrost Bridge / Atom gateway, the RoundTable router, and the
 *    public BoB gateway.
 *  - Design targets and stubs are labelled as such. Nothing in this
 *    file upgrades a design into a service.
 */
import type { CloudBrainComponent, ExcaliburRegistry, KnightSeat, RouterLink } from './types';

const ALL_KNIGHTS = ['gawain', 'percival', 'mnemosyne', 'heimdall'];
const MODEL_ROUTE = 'RoundTable :8182 \u2192 openrouter/nvidia/nemotron-3.5-lightning:free';

export const CLOUDBRAIN_COMPONENTS: CloudBrainComponent[] = [
  {
    id: 'notebooklm', name: 'NotebookLM', layer: 'forefront',
    role: 'Forefront brain — human-curated source packs per knight',
    endpoint: null, healthPath: null, state: 'manual', knights: ALL_KNIGHTS,
    notes: 'No usable API. Source packs are curated by hand and carried to the knights via Lady Mnemosyne; the bridge stays manual by design.',
  },
  {
    id: 'open-notebook', name: 'Open Notebook', layer: 'long-term',
    role: 'Long-term memory — per-knight notebooks and memory blocks',
    endpoint: 'http://127.0.0.1:8001', healthPath: '/health', state: 'supervised', knights: ALL_KNIGHTS,
    notes: 'Watchtower-supervised. Per-knight notebooks include the Anya Omega notebook (notebook:174hhnn6vuj4smzx2uul) and Mnemosyne\u2019s vault-index. Shares a venv with OpenViking.',
  },
  {
    id: 'memcastle', name: 'MemCastle (MemPalace-style vault)', layer: 'vault',
    role: 'Structured wing/diary vault pattern over knight memory',
    endpoint: null, healthPath: null, state: 'design-only', knights: ['mnemosyne'],
    notes: 'No MemPalace/MemCastle service runs on the VPS today. This entry is the target pattern — structured wings and diaries mapped onto Mnemosyne\u2019s vault-index and the per-knight wings — not a live service.',
  },
  {
    id: 'understand-anything', name: 'Understand-Anything CLI', layer: 'code-graph',
    role: 'Codebase knowledge graph (Egonex-AI/Understand-Anything)',
    endpoint: null, healthPath: null, state: 'not-integrated', knights: [],
    notes: 'Not installed on the VPS. Its installer supports the Hermes platform; the graph JSON it emits would feed the Excalibur graph panel once installed.',
  },
  {
    id: 'openviking', name: 'OpenViking', layer: 'context-db',
    role: 'Context database with viking:// L0/L1/L2 tiered resources',
    endpoint: 'http://127.0.0.1:1933', healthPath: '/', state: 'monitored', knights: ALL_KNIGHTS,
    notes: 'Watchtower MONITORED (alert-only, not restarted by Watchtower). volcengine/OpenViking; shares a venv with Open Notebook.',
  },
  {
    id: 'codegraph', name: 'CodeGraph', layer: 'code-graph',
    role: 'SQLite code graph over MCP (@colbymchenry/codegraph)',
    endpoint: null, healthPath: null, state: 'not-integrated', knights: [],
    notes: 'Not installed. Would keep a .codegraph/ SQLite graph per repo, queried over MCP; no Camelot repo carries one yet.',
  },
  {
    id: 'graphify', name: 'Graphify', layer: 'code-graph',
    role: 'Tree-sitter code graph extraction (graphifyy)',
    endpoint: null, healthPath: null, state: 'not-integrated', knights: [],
    notes: 'Ran locally on this repo 2026-10-22 (graphifyy 0.9.94, code pass only, no LLM, 0 tokens): graphify-out/ = 886 nodes / 2,195 edges / 36 communities from 140 files, incl. the full Excalibur module. Not installed on the VPS and not yet wired into the knights — state stays not-integrated for the VPS/knight sense; the local graph is queryable via graphify query/explain/path.',
  },
  {
    id: 'graphiti', name: 'Graphiti', layer: 'temporal-graph',
    role: 'Temporal knowledge graph (Zep Graphiti — "graffity")',
    endpoint: 'http://127.0.0.1:3007', healthPath: null, state: 'adapter-stub', knights: [],
    notes: 'Camelot-VPS/adapters/graphiti/worker.py is a stub FastAPI worker on 127.0.0.1:3007 returning quarantined_for_extraction with 0 nodes — NOT a live graph. Extraction is quarantined until the gate approves it.',
  },
  {
    id: 'redis-go', name: 'Redis (flash memory)', layer: 'flash',
    role: 'Flash memory + Redis Streams mesh ("Redis Go" bifrost-hub side)',
    endpoint: 'redis://127.0.0.1:6379', healthPath: null, state: 'monitored', knights: ALL_KNIGHTS,
    notes: 'Watchtower MONITORED. Mesh broker rides Redis Streams mesh:handoff:<queue>; brain-link keeps flash:<knight> lists (20 entries, 24h TTL) per knight.',
  },
  {
    id: 'qdrant', name: 'Qdrant', layer: 'context-compiler',
    role: 'Vector context compiler (Qdrant 1.19.1)',
    endpoint: 'http://127.0.0.1:6333', healthPath: '/', state: 'monitored', knights: ALL_KNIGHTS,
    notes: 'Watchtower MONITORED. 2.5GB vector budget (alert at 2GB). Per-knight <knight>_ctx collections are a Phase 4 design — collections may be empty; verify before assuming compiled context exists.',
  },
  {
    id: 'bifrost', name: 'Bifrost Bridge / Atom Gateway', layer: 'inference',
    role: 'Inference gateway (maximhq/bifrost v2.2.5)',
    endpoint: 'http://127.0.0.1:8180', healthPath: '/health', state: 'verified-live', knights: ALL_KNIGHTS,
    notes: 'Deployed 2026-10-02 and verified live. Providers: openrouter, huggingface, gemini, plus local vllm (llama.cpp Qwen3-4B). Governance/semantic-cache need the config store — do not enable without one.',
  },
  {
    id: 'roundtable', name: 'RoundTable Unified Router', layer: 'routing',
    role: 'Unified routing layer in front of Bifrost',
    endpoint: 'http://127.0.0.1:8182', healthPath: null, state: 'verified-live', knights: ALL_KNIGHTS,
    notes: 'Verified live E2E. Since the 2026-10-11 cutover every knight\u2019s model_url and the runtime ATOM_URL point here (:8182); the :8181 sidecar remains as fallback.',
  },
  {
    id: 'surrealdb', name: 'SurrealDB', layer: 'long-term',
    role: 'Open Notebook backend store',
    endpoint: 'http://127.0.0.1:8000', healthPath: '/health', state: 'monitored', knights: ALL_KNIGHTS,
    notes: 'Watchtower MONITORED. Backs Open Notebook\u2019s long-term memory on the VPS.',
  },
  {
    id: 'knight-voice', name: 'Knight Voice Harness (Rodimu$prime247)', layer: 'voice',
    role: 'Per-knight TTS + voice chat (:8190)',
    endpoint: 'http://127.0.0.1:8190', healthPath: null, state: 'verified-live', knights: ALL_KNIGHTS,
    notes: 'Verified live 2026-10-15 (Gawain TTS, Mnemosyne voice-chat). /speak = knight\u2019s Kokoro voice; /voice-chat = tiny LLM (Qwen3-0.6B :8090) via Bifrost + TTS. Mistral Voxtral engine wired for Heimdall + Hermes.',
  },
  {
    id: 'watchtower', name: 'Watchtower', layer: 'supervision',
    role: 'Supervisor + health monitor for the VPS stack (v1.2.0)',
    endpoint: 'http://127.0.0.1:8099', healthPath: '/health', state: 'verified-live', knights: ALL_KNIGHTS,
    notes: 'Supervises mesh-broker, anya-omega, brain-server, open-notebook, knight-runtime, atom proxy/gateway, agy-shim + roundtable, puter, knight-voice. Monitors redis, qdrant, surrealdb, openviking. Pages after 5 fails / 15 min.',
  },
];

export const KNIGHT_SEATS: KnightSeat[] = [
  { id: 'gawain', name: 'Sir Gawain', duty: 'vps-triage', queue: 'gawain', modelRoute: MODEL_ROUTE, voice: 'Kokoro spk 0', runtimeKnight: true },
  { id: 'percival', name: 'Sir Percival', duty: 'edge-triage', queue: 'percival', modelRoute: MODEL_ROUTE, voice: 'Kokoro spk 2', runtimeKnight: true },
  { id: 'mnemosyne', name: 'Lady Mnemosyne', duty: 'memory vault keeper', queue: 'mnemosyne', modelRoute: MODEL_ROUTE, voice: 'Kokoro spk 4', runtimeKnight: true },
  {
    id: 'heimdall', name: 'Sir Heimdall', duty: 'bridge-triage (Bifrost guardian)', queue: 'heimdall',
    modelRoute: MODEL_ROUTE, voice: 'Mistral Voxtral (en_paul_neutral), Kokoro spk 6 fallback', runtimeKnight: true,
  },
  {
    id: 'hermes', name: 'Sir Hermes', duty: 'VPS control plane — routing/dispatch',
    queue: 'control-plane (no runtime queue)', modelRoute: 'Hermes control plane (dispatch, not a routed knight model)',
    voice: 'Mistral Voxtral profile in the knight-voice harness', runtimeKnight: false,
  },
];

export const ROUTER_LINKS: RouterLink[] = [
  { id: 'client-roundtable', name: 'Clients \u2192 RoundTable', from: 'knights / clients', to: 'RoundTable unified router', endpoint: 'http://127.0.0.1:8182', state: 'verified-live' },
  { id: 'roundtable-bifrost', name: 'RoundTable \u2192 Bifrost', from: 'RoundTable unified router', to: 'Bifrost Bridge / Atom gateway', endpoint: 'http://127.0.0.1:8180', state: 'verified-live' },
  { id: 'bifrost-providers', name: 'Bifrost \u2192 Providers', from: 'Bifrost Bridge / Atom gateway', to: 'openrouter / huggingface / gemini / local vllm', endpoint: 'http://127.0.0.1:8180', state: 'verified-live' },
  { id: 'agy-shim-bifrost', name: 'agy-shim \u2192 Bifrost', from: 'Antigravity CLI (agy)', to: 'Bifrost Bridge / Atom gateway', endpoint: 'http://127.0.0.1:8318', state: 'verified-live' },
  { id: 'knight-voice-bifrost', name: 'knight-voice \u2192 Bifrost / tiny LLM', from: 'knight-voice harness', to: 'Bifrost TTS + tiny LLM (Qwen3-0.6B)', endpoint: 'http://127.0.0.1:8190 \u2192 :8180 / :8090', state: 'verified-live' },
  { id: 'bob-gateway-public', name: 'BoB Gateway (public)', from: 'public internet — Sir BoB storefront', to: 'BoB gateway on the VPS', endpoint: 'https://bob.lisascustomkeychains.com/health', state: 'verified-live' },
  { id: 'mesh-broker', name: 'Mesh Broker', from: 'knights / control plane', to: 'Redis Streams mesh:handoff:<queue>', endpoint: 'http://127.0.0.1:8002', state: 'supervised' },
  { id: 'anya-omega', name: 'Anya Omega', from: 'mesh broker', to: 'symbollect compression + digest layer', endpoint: 'http://127.0.0.1:8003', state: 'supervised' },
];

export const EXCALIBUR_REGISTRY: ExcaliburRegistry = {
  components: CLOUDBRAIN_COMPONENTS,
  knights: KNIGHT_SEATS,
  routers: ROUTER_LINKS,
};

export function getComponentById(id: string): CloudBrainComponent | undefined {
  return CLOUDBRAIN_COMPONENTS.find((c) => c.id === id);
}
