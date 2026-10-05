import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Package, CircleDot, FileText, ShieldCheck, ExternalLink } from 'lucide-react';
import { listCartridges } from '../cartridges';
import type { CartridgeStatus, FeatureStatus } from '../cartridges';
import { cn } from '../lib/utils';

/**
 * CartridgePanel renders exclusively from the cartridge registry.
 * Adding a cartridge = adding its manifest module to src/cartridges/index.ts.
 * No cartridge names, features, or contracts are hardcoded here.
 */
const STATUS_STYLES: Record<CartridgeStatus | FeatureStatus, string> = {
  draft: 'bg-[#89909b]/20 text-[#89909b] border-[#89909b]/40',
  specified: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/40',
  decided: 'bg-[#dfc486]/10 text-[#dfc486] border-[#dfc486]/40',
  in_progress: 'bg-amber-400/10 text-amber-300 border-amber-400/40',
  blocked: 'bg-red-400/10 text-red-300 border-red-400/40',
  verified: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40',
  not_production_ready: 'bg-red-400/10 text-red-300 border-red-400/40',
  pilot: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/40',
  production: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40',
  deprecated: 'bg-[#89909b]/20 text-[#89909b] border-[#89909b]/40',
};

function StatusBadge({ status }: { status: CartridgeStatus | FeatureStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-mono uppercase tracking-wider', STATUS_STYLES[status])}
    >
      <CircleDot className="w-2.5 h-2.5 mr-1" />
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export function CartridgePanel() {
  const cartridges = useMemo(() => listCartridges(), []);

  if (cartridges.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-[#89909b]">
        <Package className="w-8 h-8 mx-auto mb-3 opacity-50" />
        No cartridges registered.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cartridges.map((c) => (
        <Card key={c.id} className="border-[#dfc486]/20 bg-black/40">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base text-[#efece4] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#dfc486]" />
                  {c.name}
                  <span className="text-xs font-mono text-[#89909b]">v{c.version}</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-[#89909b]">
                  <span className="font-mono">{c.id}</span> — {c.description}
                </CardDescription>
              </div>
              <StatusBadge status={c.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Features — the dynamic surface: UI matches the manifest */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#dfc486] mb-2">
                Features ({c.features.length})
              </h4>
              <div className="space-y-2">
                {c.features.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-lg border border-[#dfc486]/10 bg-[#0b1622]/60"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#efece4]">{f.title}</span>
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#89909b] leading-relaxed">{f.description}</p>
                    {f.docsRef && (
                      <p className="mt-1 text-[11px] font-mono text-[#89909b]/70 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {f.docsRef}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contracts */}
            {c.contracts.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#dfc486] mb-2">
                  Contracts
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {c.contracts.map((ct) => (
                    <Badge
                      key={ct.name}
                      variant="outline"
                      title={ct.summary}
                      className="text-[11px] font-mono border-cyan-400/30 text-cyan-200/90"
                    >
                      {ct.name}
                      <span className="ml-1 opacity-60">{ct.version}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Invariants */}
            {c.invariants.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#dfc486] mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Invariants
                </h4>
                <ScrollArea className="max-h-40 rounded-lg border border-[#dfc486]/10 bg-black/30 p-3">
                  <ul className="space-y-1.5">
                    {c.invariants.map((inv, i) => (
                      <li key={i} className="text-[11px] font-mono text-[#89909b] leading-relaxed">
                        <span className="text-[#dfc486]/70">I{i + 1}:</span> {inv}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#89909b]">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{c.source.repoUrl}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
