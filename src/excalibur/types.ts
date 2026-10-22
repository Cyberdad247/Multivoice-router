/**
 * Excalibur — hybrid remix types.
 *
 * Multivoice-router is the root project (UI/UX lead); Excalibur is the
 * edge command center scaled from it: a live, honest map of the Camelot
 * CloudBrain on the Hermes VPS — its memory layers, routers, and the
 * knight roster — bound by the Excalibur consent gate (VS-005).
 *
 * Integration states are deliberately honest: a component is only
 * 'verified-live' when it was actually exercised end-to-end. Anything
 * else says what it is — supervised, monitored, a stub, a design, or
 * not integrated at all.
 */

export type CloudBrainLayer =
  | 'forefront'
  | 'long-term'
  | 'flash'
  | 'context-compiler'
  | 'vault'
  | 'code-graph'
  | 'temporal-graph'
  | 'context-db'
  | 'inference'
  | 'routing'
  | 'voice'
  | 'supervision';

export type IntegrationState =
  | 'verified-live'
  | 'supervised'
  | 'monitored'
  | 'adapter-stub'
  | 'design-only'
  | 'manual'
  | 'not-integrated';

export interface CloudBrainComponent {
  id: string;
  name: string;
  layer: CloudBrainLayer;
  role: string;
  /** Loopback endpoint on the VPS, or null when there is no service. */
  endpoint: string | null;
  healthPath: string | null;
  state: IntegrationState;
  /** Knight ids this component serves ('all' is not used — ids are explicit). */
  knights: string[];
  notes: string;
}

export interface KnightSeat {
  id: string;
  name: string;
  duty: string;
  queue: string;
  modelRoute: string;
  voice: string | null;
  /** True for knight_runtime knights; false for pseudo-knights like Hermes. */
  runtimeKnight: boolean;
}

export interface RouterLink {
  id: string;
  name: string;
  from: string;
  to: string;
  endpoint: string;
  state: IntegrationState;
}

export interface ExcaliburRegistry {
  components: CloudBrainComponent[];
  knights: KnightSeat[];
  routers: RouterLink[];
}
