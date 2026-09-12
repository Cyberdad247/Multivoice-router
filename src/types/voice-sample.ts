export interface VoiceSample {
  id: string;
  personaId: string;
  personaName?: string;
  name: string;
  storagePath: string;
  downloadUrl: string;
  duration: number; // Duration in seconds
  mimeType: string;
  size: number; // Bytes
  isBaseReference: boolean;
  transcript?: string;
  notes?: string;
  ownerId: string;
  createdAt: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioLevels: number[];
}
