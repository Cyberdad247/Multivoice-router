
export interface DiagnosticResult {
  id: string;
  name: string;
  status: 'ok' | 'warning' | 'error' | 'loading';
  message: string;
  actionLabel?: string;
  actionPath?: string;
  troubleshootingSteps?: string[];
}

export const DIAGNOSTIC_KEYS = {
  FIREBASE: 'firebase',
  GOOGLE_AUTH: 'google_auth',
  TAILSCALE: 'tailscale',
  GEMINI: 'gemini_api'
} as const;
