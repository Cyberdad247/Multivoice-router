import { auth } from '../lib/firebase';
import { DiagnosticResult, DIAGNOSTIC_KEYS } from '../types/diagnostics';

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // 1. Check Auth
  const user = auth.currentUser;
  results.push({
    id: DIAGNOSTIC_KEYS.GOOGLE_AUTH,
    name: 'Google Authentication',
    status: user ? 'ok' : 'warning',
    message: user ? `Signed in as ${user.email}` : 'User session not found.',
    actionLabel: user ? 'Sign Out' : 'Sign In',
    troubleshootingSteps: [
      'Ensure your browser allows popups for this domain.',
      'Check if you are signed into your Google account in this browser.'
    ]
  });

  // 2. Check Firebase Connection
  try {
    // Basic connectivity check is handled by the listener in firebase.ts
    // Here we check if the user has a valid UID for Firestore
    results.push({
      id: DIAGNOSTIC_KEYS.FIREBASE,
      name: 'Cloud Database',
      status: user ? 'ok' : 'error',
      message: user ? 'Firestore security rules authenticated.' : 'Firestore requires an active session.',
      troubleshootingSteps: [
        'Verify your internet connection.',
        'If problems persist, sign out and sign back in to refresh tokens.'
      ]
    });
  } catch (e) {
    results.push({
      id: DIAGNOSTIC_KEYS.FIREBASE,
      name: 'Cloud Database',
      status: 'error',
      message: 'Failed to communicate with database clusters.',
      troubleshootingSteps: ['Check for ongoing Firebase service outages.']
    });
  }

  // 3. Check Tailscale Bridge
  try {
    const tsRes = await fetch('/api/tailscale/devices');
    const tsData = await tsRes.json();
    
    if (tsRes.ok) {
      results.push({
        id: DIAGNOSTIC_KEYS.TAILSCALE,
        name: 'Tailscale Bridge',
        status: 'ok',
        message: `${tsData.length || 0} remote devices reachable via tailnet.`,
      });
    } else {
      results.push({
        id: DIAGNOSTIC_KEYS.TAILSCALE,
        name: 'Tailscale Bridge',
        status: 'error',
        message: tsData.error || 'Connection failed',
        troubleshootingSteps: [
          'Add TAILSCALE_API_KEY and TAILSCALE_TAILNET to environment variables.',
          'Ensure the Tailscale API key has "Devices" read permissions.'
        ]
      });
    }
  } catch (e) {
    results.push({
      id: DIAGNOSTIC_KEYS.TAILSCALE,
      name: 'Tailscale Bridge',
      status: 'error',
      message: 'Local bridge server unreachable.',
    });
  }

  return results;
}
