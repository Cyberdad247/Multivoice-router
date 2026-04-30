import { EdgeCommandHandler, EdgeWorkerManifest } from '../runtime/worker-contract';

export const rustDeskDesktopManifest: EdgeWorkerManifest = {
  workerId: 'rustdesk_desktop_worker',
  deviceId: 'desktop_primary',
  kind: 'desktop',
  capabilities: [
    { name: 'screenshot', actions: ['screenshot'], riskLimit: 'L2_SAFE_EXECUTE' },
    { name: 'desktop_input', actions: ['open_app', 'open_url', 'hotkey', 'type_text'], riskLimit: 'L2_SAFE_EXECUTE' },
    { name: 'guarded_shell', actions: ['shell_command'], riskLimit: 'L4_HIGH_RISK' }
  ]
};

export const phoneClawAndroidManifest: EdgeWorkerManifest = {
  workerId: 'phoneclaw_android_worker',
  deviceId: 'android_primary',
  kind: 'android',
  capabilities: [
    { name: 'android_ui', actions: ['tap', 'swipe', 'type_text', 'screenshot', 'open_app'], riskLimit: 'L2_SAFE_EXECUTE' },
    { name: 'android_sensitive', actions: ['send_message', 'delete_item', 'change_permission'], riskLimit: 'L4_HIGH_RISK' }
  ]
};

export const chromeWebMcpManifest: EdgeWorkerManifest = {
  workerId: 'chrome_webmcp_worker',
  deviceId: 'browser_primary',
  kind: 'browser',
  capabilities: [
    { name: 'webmcp', actions: ['discover_tools', 'invoke_tool'], riskLimit: 'L2_SAFE_EXECUTE' },
    { name: 'cdp', actions: ['navigate', 'click', 'type_text', 'screenshot', 'extract_dom'], riskLimit: 'L2_SAFE_EXECUTE' },
    { name: 'browser_sensitive', actions: ['submit_form', 'purchase', 'account_change'], riskLimit: 'L4_HIGH_RISK' }
  ]
};

export const termuxCliManifest: EdgeWorkerManifest = {
  workerId: 'termux_cli_worker',
  deviceId: 'termux_primary',
  kind: 'termux',
  capabilities: [
    { name: 'status', actions: ['pwd', 'ls', 'git_status', 'node_version'], riskLimit: 'L1_DRAFT' },
    { name: 'guarded_cli', actions: ['git', 'npm', 'python', 'shell_command'], riskLimit: 'L4_HIGH_RISK' }
  ]
};

export const dryRunEdgeHandler: EdgeCommandHandler = async (command, manifest) => {
  return {
    ok: true,
    stage: 'dry_run_edge_worker',
    payload: {
      workerId: manifest.workerId,
      deviceId: manifest.deviceId,
      commandId: command.commandId,
      input: command.input,
      note: 'Dry-run only. Replace with real device adapter.'
    }
  };
};
