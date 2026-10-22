import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import {
  Swords, Network, ShieldCheck, ShieldAlert, Brain, Users, CircleDot, Lock, Unlock,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  CLOUDBRAIN_COMPONENTS, KNIGHT_SEATS, ROUTER_LINKS,
} from '../excalibur/cloudbrain-registry';
import { evaluateCrossing, GATE_NAMES, type GateName } from '../excalibur/excalibur-gate';
import type { IntegrationState } from '../excalibur/types';

const STATE_STYLES: Record<IntegrationState, string> = {
  'verified-live': 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40',
  supervised: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40',
  monitored: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/40',
  manual: 'bg-amber-400/10 text-amber-300 border-amber-400/40',
  'adapter-stub': 'bg-amber-400/10 text-amber-300 border-amber-400/40',
  'design-only': 'bg-[#89909b]/15 text-[#aab0ba] border-[#89909b]/40',
  'not-integrated': 'bg-red-400/10 text-red-300/70 border-red-400/30',
};

function StateBadge({ state }: { state: IntegrationState }) {
  return (
    <Badge variant="outline" className={cn('text-[10px] font-mono uppercase tracking-wider', STATE_STYLES[state])}>
      <CircleDot className="w-2.5 h-2.5 mr-1" />
      {state.replace(/-/g, ' ')}
    </Badge>
  );
}

interface ProbeResult {
  id: string; url: string; ok: boolean; status: number | null; latencyMs: number; error?: string;
}
interface LoopbackEntry {
  id: string; name: string; endpoint: string; reachable: null; reason: string;
}
interface ExcaliburStatus {
  probes: ProbeResult[];
  loopbackOnly: LoopbackEntry[];
  configured: { tailscaleBridge: boolean; bobGateway?: boolean };
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-mono uppercase tracking-wider text-[#dfc486] flex items-center gap-2">
      {icon}{children}
    </h3>
  );
}

export function ExcaliburCommandCenter() {
  const [status, setStatus] = useState<ExcaliburStatus | null>(null);
  const [probeFailed, setProbeFailed] = useState(false);
  const [gates, setGates] = useState<Record<GateName, boolean>>({
    identity: true, integrity: true, intent: true, payload: true, access: true,
  });
  const [bridgeSealed, setBridgeSealed] = useState(false);
  const [mutation, setMutation] = useState(false);
  const [humanApproved, setHumanApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/excalibur/status')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http ${r.status}`))))
      .then((data: ExcaliburStatus) => { if (!cancelled) setStatus(data); })
      .catch(() => { if (!cancelled) setProbeFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const crossing = useMemo(
    () => evaluateCrossing({ ...gates, bridgeSealed, mutation, humanApproved }),
    [gates, bridgeSealed, mutation, humanApproved],
  );

  const probeUnconfigured =
    probeFailed || (status !== null && !status.configured.tailscaleBridge && !status.configured.bobGateway);
  const bobProbe = status?.probes.find((p) => p.id === 'bob-gateway');

  return (
    <ScrollArea className="max-h-[38vh] pr-2">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-[#efece4] flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#dfc486]" /> Excalibur Command Center
            </h2>
            <p className="text-xs text-[#89909b] mt-1 max-w-xl">
              The edge command center scaled from Multivoice-router: the Camelot CloudBrain,
              its routers, and the knight roster — with integration states stated honestly.
            </p>
          </div>
          {bobProbe ? (
            <Badge variant="outline" className={cn('text-[10px] font-mono',
              bobProbe.ok
                ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40'
                : 'bg-red-400/10 text-red-300 border-red-400/40')}>
              BoB gateway {bobProbe.ok ? `live · ${bobProbe.latencyMs}ms` : 'unreachable'}
            </Badge>
          ) : null}
        </div>

        {probeUnconfigured && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Live probe not configured on this server — showing the canonical registry states.
            VPS loopback services are verified via Watchtower, never probed from here.
          </div>
        )}
        {status && status.loopbackOnly.length > 0 && (
          <p className="text-[11px] text-[#89909b]">
            {status.loopbackOnly.length} registry services are loopback-only on the VPS — verify via Watchtower.
          </p>
        )}

        <section className="space-y-2">
          <SectionTitle icon={<Network className="w-3.5 h-3.5" />}>Router Stack</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ROUTER_LINKS.map((r) => (
              <div key={r.id} className="rounded-lg border border-[#dfc486]/20 bg-black/40 px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-[#efece4] font-medium truncate">{r.name}</div>
                  <div className="text-[11px] text-[#89909b] truncate">{r.from} → {r.to}</div>
                  <div className="text-[10px] font-mono text-[#89909b] truncate">{r.endpoint}</div>
                </div>
                <StateBadge state={r.state} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <SectionTitle icon={<Users className="w-3.5 h-3.5" />}>Knight Roster</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {KNIGHT_SEATS.map((k) => (
              <div key={k.id} className="rounded-lg border border-[#dfc486]/20 bg-black/40 px-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#efece4] font-medium">{k.name}</span>
                  <Badge variant="outline" className={cn('text-[10px] font-mono',
                    k.runtimeKnight
                      ? 'bg-[#dfc486]/10 text-[#dfc486] border-[#dfc486]/40'
                      : 'bg-[#89909b]/15 text-[#aab0ba] border-[#89909b]/40')}>
                    {k.runtimeKnight ? 'runtime knight' : 'pseudo-knight'}
                  </Badge>
                </div>
                <div className="text-[11px] text-[#89909b]">Duty: {k.duty} · Queue: <span className="font-mono">{k.queue}</span></div>
                <div className="text-[11px] text-[#89909b] font-mono break-all">{k.modelRoute}</div>
                <div className="text-[11px] text-[#89909b]">Voice: {k.voice ?? '—'}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <SectionTitle icon={<Brain className="w-3.5 h-3.5" />}>CloudBrain Grid</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {CLOUDBRAIN_COMPONENTS.map((c) => (
              <Card key={c.id} size="sm" className="border-[#dfc486]/20 bg-black/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-[#efece4]">{c.name}</CardTitle>
                    <StateBadge state={c.state} />
                  </div>
                  <CardDescription className="text-[11px] text-[#89909b]">
                    <span className="font-mono uppercase">{c.layer}</span> — {c.role}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-[10px] font-mono text-[#89909b] break-all">
                    {c.endpoint ? `${c.endpoint}${c.healthPath ?? ''}` : 'no endpoint'}
                  </div>
                  <p className="text-[11px] text-[#aab0ba] leading-snug">{c.notes}</p>
                  {c.knights.length > 0 && (
                    <div className="text-[10px] text-[#89909b]">Knights: {c.knights.join(', ')}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <SectionTitle icon={<ShieldCheck className="w-3.5 h-3.5" />}>Excalibur Gate — Human Consent (VS-005)</SectionTitle>
          <Card className="border-[#dfc486]/20 bg-black/40">
            <CardContent className="pt-2 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {GATE_NAMES.map((g) => (
                  <label key={g} className="flex items-center justify-between gap-2 text-xs text-[#efece4] capitalize">
                    {g} gate
                    <Switch checked={gates[g]} onCheckedChange={(v: boolean) => setGates((s) => ({ ...s, [g]: v }))} />
                  </label>
                ))}
                <label className="flex items-center justify-between gap-2 text-xs text-red-300">
                  {bridgeSealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />} Bridge sealed
                  <Switch checked={bridgeSealed} onCheckedChange={(v: boolean) => setBridgeSealed(v)} />
                </label>
                <label className="flex items-center justify-between gap-2 text-xs text-[#efece4]">
                  Mutation crossing
                  <Switch checked={mutation} onCheckedChange={(v: boolean) => setMutation(v)} />
                </label>
                <label className="flex items-center justify-between gap-2 text-xs text-[#efece4]">
                  Human approved
                  <Switch checked={humanApproved} onCheckedChange={(v: boolean) => setHumanApproved(v)} />
                </label>
              </div>
              <div className={cn('rounded-lg border px-3 py-2 text-xs flex gap-2',
                crossing.allowed
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                  : 'border-red-400/40 bg-red-400/10 text-red-200')}>
                {crossing.allowed ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
                <div>
                  <div className="font-mono font-bold uppercase tracking-wider">
                    {crossing.allowed ? 'Crossing allowed' : 'Crossing denied — fail-closed'}
                  </div>
                  <ul className="mt-1 space-y-0.5 text-[11px] opacity-90">
                    {crossing.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </ScrollArea>
  );
}
