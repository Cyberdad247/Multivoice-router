export type CartridgeDashboardEventType =
  | 'cartridge_mounted'
  | 'command_queued'
  | 'route_selected'
  | 'worker_started'
  | 'worker_completed'
  | 'approval_required'
  | 'memory_written'
  | 'ledger_event_created'
  | 'error';

export interface CartridgeDashboardEvent {
  type: CartridgeDashboardEventType;
  cartridgeId?: string;
  commandId?: string;
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export type CartridgeEventListener = (event: CartridgeDashboardEvent) => void;

export class CartridgeEventBus {
  private listeners = new Set<CartridgeEventListener>();
  private history: CartridgeDashboardEvent[] = [];

  emit(event: Omit<CartridgeDashboardEvent, 'timestamp'>) {
    const full: CartridgeDashboardEvent = { ...event, timestamp: new Date().toISOString() };
    this.history.push(full);
    this.listeners.forEach(listener => listener(full));
    return full;
  }

  subscribe(listener: CartridgeEventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getHistory(cartridgeId?: string) {
    return cartridgeId ? this.history.filter(e => e.cartridgeId === cartridgeId) : [...this.history];
  }

  clear() {
    this.history = [];
  }
}

export const cartridgeEventBus = new CartridgeEventBus();
