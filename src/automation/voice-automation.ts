import { MultivoiceSession, planCouncilSession, planPodcastSession, planSingleVoiceSession } from '../voice/multivoice-session';

export type VoiceAutomationTrigger =
  | 'schedule.daily'
  | 'schedule.weekly'
  | 'event.command_failed'
  | 'event.command_completed'
  | 'event.approval_required'
  | 'event.worker_offline'
  | 'event.memory_snapshot_created'
  | 'event.campaign_report_ready'
  | 'event.dashboard_opened'
  | 'manual.user_command';

export type VoiceAutomationMode = 'single' | 'council' | 'podcast';

export interface VoiceAutomationRule {
  ruleId: string;
  name: string;
  trigger: VoiceAutomationTrigger;
  mode: VoiceAutomationMode;
  topicTemplate: string;
  enabled: boolean;
  requiresApprovalBeforeExternalSend: boolean;
}

export const DEFAULT_VOICE_AUTOMATIONS: VoiceAutomationRule[] = [
  {
    ruleId: 'daily_camelot_briefing',
    name: 'Daily Camelot Briefing',
    trigger: 'schedule.daily',
    mode: 'podcast',
    topicTemplate: 'Daily command queue, approvals, worker health, memory changes, and ROI priorities.',
    enabled: false,
    requiresApprovalBeforeExternalSend: true
  },
  {
    ruleId: 'approval_needed_alert',
    name: 'Approval Needed Alert',
    trigger: 'event.approval_required',
    mode: 'single',
    topicTemplate: 'A high-risk action requires human approval.',
    enabled: true,
    requiresApprovalBeforeExternalSend: false
  },
  {
    ruleId: 'failed_command_council',
    name: 'Failed Command Council Review',
    trigger: 'event.command_failed',
    mode: 'council',
    topicTemplate: 'Review failed command, root cause, recovery path, and next action.',
    enabled: true,
    requiresApprovalBeforeExternalSend: false
  }
];

export function planAutomationVoiceSession(rule: VoiceAutomationRule, context: Record<string, unknown> = {}): MultivoiceSession {
  const topic = rule.topicTemplate.replace(/\{(\w+)\}/g, (_, key) => String(context[key] || ''));
  if (rule.mode === 'podcast') return planPodcastSession(topic, rule.name);
  if (rule.mode === 'council') return planCouncilSession(topic);
  return planSingleVoiceSession(topic);
}

export function shouldRunAutomation(rule: VoiceAutomationRule, trigger: VoiceAutomationTrigger) {
  return rule.enabled && rule.trigger === trigger;
}
