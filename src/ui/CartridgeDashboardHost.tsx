import React from 'react';
import { CARTRIDGE_DASHBOARDS, getDashboardForCartridge } from './cartridge-dashboard-manifest';

export interface CartridgeDashboardHostProps {
  activeCartridge?: string;
  events?: Array<{ type: string; message: string; timestamp?: string }>;
  onAction?: (action: string, cartridgeId: string) => void;
}

function PanelCard(props: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{props.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
      {props.children ? <div className="mt-4">{props.children}</div> : null}
    </section>
  );
}

export function CartridgeDashboardHost({ activeCartridge = 'ANT', events = [], onAction }: CartridgeDashboardHostProps) {
  const dashboard = getDashboardForCartridge(activeCartridge) || CARTRIDGE_DASHBOARDS[0];

  return (
    <div className="w-full space-y-6">
      <header className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-4xl">{dashboard.glyph}</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{dashboard.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{dashboard.summary}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
            <div className="text-muted-foreground">Lead Knight</div>
            <div className="font-semibold text-foreground">{dashboard.leadKnight}</div>
            <div className="mt-3 text-muted-foreground">Mode</div>
            <div className="font-semibold text-primary">{dashboard.mode}</div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboard.panels.map(panel => (
          <PanelCard key={panel.id} title={panel.title} description={panel.description}>
            {panel.kind === 'edge_actions' ? null : null}
          </PanelCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Safe Actions" description="Autonomous actions allowed inside the cartridge boundary.">
          <div className="flex flex-wrap gap-2">
            {dashboard.safeActions.map(action => (
              <button
                key={action}
                onClick={() => onAction?.(action, dashboard.cartridgeId)}
                className="rounded-xl border border-border px-3 py-2 text-xs uppercase tracking-wide hover:border-primary hover:text-primary"
              >
                {action}
              </button>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="HITL Actions" description="These actions require human approval before execution.">
          <div className="flex flex-wrap gap-2">
            {dashboard.hitlActions.map(action => (
              <button
                key={action}
                onClick={() => onAction?.(action, dashboard.cartridgeId)}
                className="rounded-xl border border-destructive/40 px-3 py-2 text-xs uppercase tracking-wide text-destructive hover:bg-destructive/10"
              >
                {action}
              </button>
            ))}
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Live Event Stream" description="Cartridge telemetry from Anya, Sir Link, edge workers, approvals, memory, and ledger.">
        <div className="max-h-64 space-y-2 overflow-auto text-sm">
          {events.length === 0 ? (
            <p className="text-muted-foreground">No events yet. The dashboard is awake, waiting for a command spark.</p>
          ) : events.map((event, index) => (
            <div key={index} className="rounded-xl bg-background/60 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{event.type} {event.timestamp ? `• ${event.timestamp}` : ''}</div>
              <div className="text-foreground">{event.message}</div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
