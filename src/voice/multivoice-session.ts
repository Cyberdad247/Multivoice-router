import { VoiceMode, VoiceProfile, getVoiceProfile, listVoiceProfilesForMode } from './voice-profile-registry';

export interface VoiceTurn {
  speakerId: string;
  displayName: string;
  role: 'host' | 'architect' | 'strategist' | 'auditor' | 'researcher' | 'narrator';
  text: string;
  requiresVerification: boolean;
}

export interface MultivoiceSession {
  sessionId: string;
  mode: VoiceMode;
  title: string;
  topic: string;
  speakers: VoiceProfile[];
  turns: VoiceTurn[];
  requiresApprovalBeforePublish: boolean;
}

function id() {
  return `voice_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function speaker(speakerId: string) {
  const profile = getVoiceProfile(speakerId);
  if (!profile) throw new Error(`Unknown speaker: ${speakerId}`);
  return profile;
}

export function planCouncilSession(topic: string): MultivoiceSession {
  const speakers = [speaker('anya_host'), speaker('merlin_architect'), speaker('alex_roi'), speaker('gideon_auditor')];
  return {
    sessionId: id(),
    mode: 'council',
    title: `Council Review: ${topic}`,
    topic,
    speakers,
    requiresApprovalBeforePublish: true,
    turns: [
      { speakerId: 'anya_host', displayName: 'Anya Ω', role: 'host', text: `Frame the request: ${topic}`, requiresVerification: false },
      { speakerId: 'merlin_architect', displayName: 'Merlin Ω', role: 'architect', text: 'Explain the architecture and implementation path.', requiresVerification: false },
      { speakerId: 'alex_roi', displayName: 'Sir Alex', role: 'strategist', text: 'Rank the approach by ROI, effort, risk, and timing.', requiresVerification: true },
      { speakerId: 'gideon_auditor', displayName: 'Sir Gideon', role: 'auditor', text: 'Identify risks, missing tests, and approval gates.', requiresVerification: true },
      { speakerId: 'anya_host', displayName: 'Anya Ω', role: 'host', text: 'Summarize next action and ask for confirmation if risky.', requiresVerification: false }
    ]
  };
}

export function planPodcastSession(topic: string, title = 'Camelot Briefing'): MultivoiceSession {
  const speakers = listVoiceProfilesForMode('podcast');
  return {
    sessionId: id(),
    mode: 'podcast',
    title,
    topic,
    speakers,
    requiresApprovalBeforePublish: true,
    turns: [
      { speakerId: 'anya_host', displayName: 'Anya Ω', role: 'host', text: `Welcome and introduce the episode topic: ${topic}`, requiresVerification: false },
      { speakerId: 'apis_research', displayName: 'Lady Apis', role: 'researcher', text: 'Present sourced findings and confidence levels.', requiresVerification: true },
      { speakerId: 'merlin_architect', displayName: 'Merlin Ω', role: 'architect', text: 'Connect findings into the system architecture.', requiresVerification: false },
      { speakerId: 'alex_roi', displayName: 'Sir Alex', role: 'strategist', text: 'Explain business value, ROI, and next leverage move.', requiresVerification: true },
      { speakerId: 'gideon_auditor', displayName: 'Sir Gideon', role: 'auditor', text: 'Audit weak claims, risks, and necessary caveats.', requiresVerification: true },
      { speakerId: 'sonus_narrator', displayName: 'Sir Sonus', role: 'narrator', text: 'Add transition, intro/outro notes, and sonic direction.', requiresVerification: false },
      { speakerId: 'anya_host', displayName: 'Anya Ω', role: 'host', text: 'Close with action items and dashboard links.', requiresVerification: false }
    ]
  };
}

export function planSingleVoiceSession(topic: string, speakerId = 'anya_host'): MultivoiceSession {
  const profile = speaker(speakerId);
  return {
    sessionId: id(),
    mode: 'single',
    title: `Anya Response: ${topic}`,
    topic,
    speakers: [profile],
    requiresApprovalBeforePublish: false,
    turns: [
      { speakerId: profile.speakerId, displayName: profile.displayName, role: 'host', text: topic, requiresVerification: false }
    ]
  };
}
