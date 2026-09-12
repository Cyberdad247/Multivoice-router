import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Persona } from '../types/persona';
import { VoiceSample } from '../types/voice-sample';
import { voiceSampleService } from '../services/voice-sample-service';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  UploadCloud, 
  Trash2, 
  Star, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Download, 
  RefreshCw, 
  FileAudio, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Radio,
  Sliders,
  Shield,
  Clock,
  HardDrive,
  X
} from 'lucide-react';

interface VoiceStudioProps {
  isOpen?: boolean;
  onClose?: () => void;
  personas: Persona[];
  selectedPersona: Persona;
  onSelectPersona?: (persona: Persona) => void;
  onUpdatePersona?: (persona: Persona) => void;
  embedded?: boolean;
}

export const VoiceStudio: React.FC<VoiceStudioProps> = ({
  isOpen = true,
  onClose,
  personas,
  selectedPersona,
  onSelectPersona,
  onUpdatePersona,
  embedded = false
}) => {
  const { user } = useAuth();

  // Active target persona for recording/filtering
  const [targetPersonaId, setTargetPersonaId] = useState<string>(selectedPersona.id);
  const targetPersona = personas.find(p => p.id === targetPersonaId) || selectedPersona;

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingMimeType, setRecordingMimeType] = useState<string>('audio/webm');
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(24).fill(10));

  // Form Metadata
  const [sampleName, setSampleName] = useState<string>('');
  const [sampleTranscript, setSampleTranscript] = useState<string>('');
  const [sampleNotes, setSampleNotes] = useState<string>('');
  const [isBaseReference, setIsBaseReference] = useState<boolean>(true);

  // Upload / Save state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Samples Vault
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState<boolean>(false);
  const [vaultFilter, setVaultFilter] = useState<string>('current'); // 'current' | 'all'

  // Playback State
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder and Web Audio API references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize target persona when selectedPersona prop changes
  useEffect(() => {
    if (selectedPersona) {
      setTargetPersonaId(selectedPersona.id);
    }
  }, [selectedPersona?.id]);

  // Load existing samples on mount and persona change
  const loadSamples = useCallback(async () => {
    setIsLoadingSamples(true);
    try {
      const data = await voiceSampleService.listSamples();
      setSamples(data);
    } catch (e) {
      console.warn('Could not load samples:', e);
    } finally {
      setIsLoadingSamples(false);
    }
  }, []);

  useEffect(() => {
    loadSamples();
  }, [loadSamples, user]);

  // Clean up Web Audio and tracks
  const stopAudioTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAudioTracks();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, [stopAudioTracks]);

  // Handle live visualizer loop
  const updateVisualizer = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Group into 24 frequency buckets
    const bucketCount = 24;
    const bucketSize = Math.floor(dataArray.length / bucketCount);
    const newLevels: number[] = [];

    for (let i = 0; i < bucketCount; i++) {
      let sum = 0;
      for (let j = 0; j < bucketSize; j++) {
        sum += dataArray[i * bucketSize + j];
      }
      const avg = sum / bucketSize;
      // Normalize to 10 - 100 percentage height
      const normalized = Math.max(10, Math.min(100, Math.round((avg / 255) * 100)));
      newLevels.push(normalized);
    }

    setAudioLevels(newLevels);
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, [isRecording]);

  // Start Recording
  const handleStartRecording = async () => {
    try {
      stopAudioTracks();
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Web Audio setup for live visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Select supported audio mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }
      setRecordingMimeType(mimeType || 'audio/webm');

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setRecordedAudioUrl(url);

        // Pre-fill sample name if empty
        if (!sampleName) {
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setSampleName(`${targetPersona.name} Base Reference (${timestamp})`);
        }
      };

      recorder.start(100); // 100ms chunks for smooth recording
      setIsRecording(true);
      setIsPaused(false);
      setRecordDuration(0);

      // Start duration counter
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      toast.info(`Recording started for ${targetPersona.name}`);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      toast.error('Microphone access denied or audio device not found.');
    }
  };

  // Pause / Resume Recording
  const handleTogglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopAudioTracks();
    setIsRecording(false);
    setIsPaused(false);
    toast.success('Recording captured. Review and save below.');
  };

  // Reset current recording
  const handleResetRecording = () => {
    stopAudioTracks();
    setIsRecording(false);
    setIsPaused(false);
    setRecordDuration(0);
    setRecordedBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setAudioLevels(new Array(24).fill(10));
  };

  // Handle local audio file upload / drag-drop
  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload a valid audio file (e.g. .wav, .mp3, .webm, .m4a).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds 20MB limit.');
      return;
    }

    setRecordedBlob(file);
    setRecordingMimeType(file.type || 'audio/webm');
    const url = URL.createObjectURL(file);
    setRecordedAudioUrl(url);

    // Read duration via audio element
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setRecordDuration(Math.round(tempAudio.duration) || 1);
    };

    setSampleName(file.name.replace(/\.[^/.]+$/, ''));
    toast.success(`Loaded audio: ${file.name}`);
  };

  // Save to Firebase Storage and Firestore
  const handleSaveToFirebase = async () => {
    if (!recordedBlob) {
      toast.error('No audio recorded or selected.');
      return;
    }

    const finalName = sampleName.trim() || `${targetPersona.name} Custom Voice Sample`;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const savedSample = await voiceSampleService.uploadSample(
        recordedBlob,
        {
          personaId: targetPersona.id,
          personaName: targetPersona.name,
          name: finalName,
          duration: recordDuration || 1,
          mimeType: recordingMimeType,
          isBaseReference: isBaseReference,
          transcript: sampleTranscript,
          notes: sampleNotes
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // If set as base reference, notify parent
      if (isBaseReference && onUpdatePersona) {
        onUpdatePersona({
          ...targetPersona,
          baseVoiceSampleId: savedSample.id,
          baseVoiceSampleUrl: savedSample.downloadUrl
        });
      }

      toast.success(`Voice sample stored in Firebase Storage for ${targetPersona.name}!`);
      
      // Refresh samples and reset recorder
      await loadSamples();
      handleResetRecording();
      setSampleName('');
      setSampleTranscript('');
      setSampleNotes('');
    } catch (err) {
      console.error('Save sample failed:', err);
      toast.error('Upload failed. Sample was saved locally in offline cache.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Playback control for preview and library
  const handlePlaySample = (sampleId: string, audioUrl: string) => {
    if (currentlyPlayingId === sampleId) {
      // Pause
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setCurrentlyPlayingId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    activeAudioRef.current = audio;
    setCurrentlyPlayingId(sampleId);
    setPlaybackProgress(0);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setCurrentlyPlayingId(null);
      setPlaybackProgress(0);
    };

    audio.onerror = () => {
      toast.error('Could not play audio snippet.');
      setCurrentlyPlayingId(null);
    };

    audio.play().catch(e => {
      console.warn('Playback error:', e);
      setCurrentlyPlayingId(null);
    });
  };

  // Set as Base Reference
  const handleSetBaseReference = async (sample: VoiceSample) => {
    try {
      await voiceSampleService.setAsBaseReference(sample.id, sample.personaId);
      await loadSamples();
      if (onUpdatePersona) {
        const p = personas.find(item => item.id === sample.personaId);
        if (p) {
          onUpdatePersona({
            ...p,
            baseVoiceSampleId: sample.id,
            baseVoiceSampleUrl: sample.downloadUrl
          });
        }
      }
      toast.success(`Designated "${sample.name}" as base voice reference for ${sample.personaName || 'Knight'}!`);
    } catch (e) {
      toast.error('Could not update base reference.');
    }
  };

  // Delete sample
  const handleDeleteSample = async (sample: VoiceSample) => {
    if (!confirm(`Delete sample "${sample.name}" from Firebase Storage?`)) return;

    try {
      await voiceSampleService.deleteSample(sample);
      if (currentlyPlayingId === sample.id && activeAudioRef.current) {
        activeAudioRef.current.pause();
        setCurrentlyPlayingId(null);
      }
      await loadSamples();
      toast.success('Voice sample deleted.');
    } catch (e) {
      toast.error('Error deleting sample.');
    }
  };

  // Filtered samples for display
  const filteredSamples = vaultFilter === 'current'
    ? samples.filter(s => s.personaId === targetPersona.id)
    : samples;

  const currentBaseReference = samples.find(s => s.personaId === targetPersona.id && s.isBaseReference);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const content = (
    <div className="space-y-6 text-[#efece4]">
      {/* Studio Header & Persona Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#dfc486]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-[#dfc486] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#aa9872]">
              Acoustic Reference Vault &bull; Firebase Storage
            </span>
          </div>
          <h2 className="text-2xl font-serif text-[#efece4] tracking-tight">
            Knight Voice Studio
          </h2>
          <p className="text-xs text-[#89909b] max-w-xl">
            Record or upload vocal snippets to establish the acoustic timbre and base reference for your knight persona. Samples are persisted directly to Firebase Storage.
          </p>
        </div>

        {/* Knight Selection Dropdown / Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-[#89909b]">Active Knight:</span>
          <select 
            value={targetPersonaId}
            onChange={(e) => {
              const selected = personas.find(p => p.id === e.target.value);
              if (selected) {
                setTargetPersonaId(selected.id);
                onSelectPersona?.(selected);
              }
            }}
            className="bg-[#0c121b] border border-[#dfc486]/40 text-[#dfc486] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#dfc486] font-mono cursor-pointer"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#080b10] text-[#efece4]">
                {p.name} ({p.voice})
              </option>
            ))}
          </select>

          {currentBaseReference ? (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] font-mono gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              Base Reference Active
            </Badge>
          ) : (
            <Badge variant="outline" className="border-zinc-700 bg-zinc-800/40 text-zinc-400 text-[10px] font-mono">
              No Base Ref Set
            </Badge>
          )}

          {!embedded && onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 text-[#89909b] hover:text-[#efece4]"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Studio Workspace Tabs */}
      <Tabs defaultValue="record" className="w-full">
        <TabsList className="bg-[#0b1622] border border-[#dfc486]/20 p-1 rounded-lg gap-2">
          <TabsTrigger 
            value="record" 
            className="text-xs font-mono data-[state=active]:bg-[#dfc486] data-[state=active]:text-[#080b10] gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" />
            Live Recorder
          </TabsTrigger>
          <TabsTrigger 
            value="upload" 
            className="text-xs font-mono data-[state=active]:bg-[#dfc486] data-[state=active]:text-[#080b10] gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            File Import
          </TabsTrigger>
          <TabsTrigger 
            value="vault" 
            className="text-xs font-mono data-[state=active]:bg-[#dfc486] data-[state=active]:text-[#080b10] gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            Storage Vault ({samples.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Live Voice Recorder */}
        <TabsContent value="record" className="space-y-6 pt-4">
          <div className="p-6 rounded-xl bg-[#0c121b] border border-[#dfc486]/30 shadow-xl space-y-6">
            
            {/* Visualizer & Status */}
            <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-black/50 border border-zinc-800/80 relative overflow-hidden">
              <div className="absolute top-3 left-4 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#89909b]">
                  {isRecording ? (isPaused ? 'Recording Paused' : 'Live Capture (24kHz/48kHz)') : 'Acoustic Standby'}
                </span>
              </div>

              <div className="text-3xl font-mono font-bold tracking-wider text-[#dfc486] my-4">
                {formatTime(recordDuration)}
              </div>

              {/* Dynamic Oscilloscope Waveform Bars */}
              <div className="flex items-end justify-center gap-1.5 h-20 w-full max-w-md px-4">
                {audioLevels.map((lvl, idx) => (
                  <div 
                    key={idx}
                    className="flex-1 rounded-t transition-all duration-75"
                    style={{
                      height: `${isRecording ? lvl : 12}%`,
                      backgroundColor: isRecording 
                        ? (lvl > 70 ? '#f59e0b' : '#dfc486') 
                        : '#27272a'
                    }}
                  />
                ))}
              </div>

              {/* Recorder Actions */}
              <div className="flex items-center gap-4 mt-6">
                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-mono text-xs font-bold px-6 gap-2 shadow-lg shadow-red-950/40"
                  >
                    <Mic className="w-4 h-4" />
                    Record Reference Snippet
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleTogglePause}
                      className="border-[#dfc486]/40 text-[#dfc486] hover:bg-[#dfc486]/10 text-xs font-mono gap-1.5"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>

                    <Button
                      onClick={handleStopRecording}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold px-5 gap-1.5 shadow-lg"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Stop Capture
                    </Button>
                  </>
                )}

                {(recordedBlob || recordDuration > 0) && !isRecording && (
                  <Button
                    variant="ghost"
                    onClick={handleResetRecording}
                    className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Post-recording Preview Player */}
            {recordedAudioUrl && (
              <div className="p-4 rounded-lg bg-[#080b10] border border-[#dfc486]/40 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-[#dfc486]" />
                    <span className="text-xs font-mono font-bold text-[#dfc486]">
                      Captured Audio Preview &bull; {formatTime(recordDuration)}
                    </span>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                      {Math.round((recordedBlob?.size || 0) / 1024)} KB
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePlaySample('preview', recordedAudioUrl)}
                    className="h-7 text-xs font-mono border-[#dfc486]/40 text-[#dfc486] gap-1"
                  >
                    {currentlyPlayingId === 'preview' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {currentlyPlayingId === 'preview' ? 'Pause' : 'Play Preview'}
                  </Button>
                </div>

                {/* Progress bar when playing */}
                {currentlyPlayingId === 'preview' && (
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#dfc486] h-full transition-all duration-100"
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                )}

                {/* Metadata & Tagging Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#89909b]">Sample Title / Purpose</label>
                    <Input 
                      value={sampleName}
                      onChange={(e) => setSampleName(e.target.value)}
                      placeholder={`e.g. ${targetPersona.name} Sovereign Tone Reference`}
                      className="bg-[#0c121b] border-zinc-800 text-xs text-[#efece4] focus:border-[#dfc486]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#89909b]">Spoken Phrase / Transcript (Optional)</label>
                    <Input 
                      value={sampleTranscript}
                      onChange={(e) => setSampleTranscript(e.target.value)}
                      placeholder="e.g. By Excalibur and Camelot, I command thee."
                      className="bg-[#0c121b] border-zinc-800 text-xs text-[#efece4] focus:border-[#dfc486]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#89909b]">Acoustic Characteristics & Notes</label>
                  <Textarea 
                    value={sampleNotes}
                    onChange={(e) => setSampleNotes(e.target.value)}
                    placeholder="e.g. Deep resonance, measured cadence, authoritative baritone inflection."
                    rows={2}
                    className="bg-[#0c121b] border-zinc-800 text-xs text-[#efece4] focus:border-[#dfc486]"
                  />
                </div>

                {/* Base Reference Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Star className={`w-4 h-4 ${isBaseReference ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-[#efece4]">Designate as Primary Base Reference</div>
                      <div className="text-[10px] text-[#89909b]">
                        Active acoustic reference for {targetPersona.name} in voice synthesis & Live chat
                      </div>
                    </div>
                  </div>
                  <Switch 
                    checked={isBaseReference}
                    onCheckedChange={setIsBaseReference}
                  />
                </div>

                {/* Upload & Store button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-[#89909b] flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#dfc486]" />
                    <span>Destination: Firebase Storage &bull; <code className="text-[#dfc486] font-mono">voice-samples/...</code></span>
                  </div>

                  <Button
                    onClick={handleSaveToFirebase}
                    disabled={isUploading}
                    className="bg-gradient-to-r from-[#bba06b] to-[#e5cd99] text-[#15140f] hover:from-[#cbaf7a] hover:to-[#f0dbad] font-mono font-bold text-xs px-5 gap-2"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Uploading ({uploadProgress}%)
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        Save to Firebase Storage
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: Audio File Import */}
        <TabsContent value="upload" className="space-y-6 pt-4">
          <div className="p-8 rounded-xl bg-[#0c121b] border border-dashed border-[#dfc486]/40 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#dfc486]/10 border border-[#dfc486]/30 flex items-center justify-center mx-auto text-[#dfc486]">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-[#efece4]">Import Studio Audio Reference</h3>
              <p className="text-xs text-[#89909b] mt-1 max-w-md mx-auto">
                Upload master recordings, vocal tests, or soundbites in WAV, MP3, WEBM, or OGG format (up to 20MB).
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#dfc486] hover:bg-[#eccd8f] text-[#080b10] font-mono font-bold text-xs cursor-pointer shadow-md transition-all">
              <FileAudio className="w-4 h-4" />
              Browse Audio File
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleFileDrop}
                className="hidden" 
              />
            </label>

            {recordedAudioUrl && (
              <div className="text-xs text-[#dfc486] font-mono mt-2">
                &check; Audio loaded: ready in Live Recorder tab for preview and storage commit!
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: Storage Vault & Reference Library */}
        <TabsContent value="vault" className="space-y-4 pt-4">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={vaultFilter === 'current' ? 'default' : 'outline'}
                onClick={() => setVaultFilter('current')}
                className={`text-xs font-mono h-7 ${
                  vaultFilter === 'current' 
                    ? 'bg-[#dfc486] text-[#080b10]' 
                    : 'border-zinc-800 text-[#89909b]'
                }`}
              >
                {targetPersona.name}&apos;s Samples ({samples.filter(s => s.personaId === targetPersona.id).length})
              </Button>
              <Button
                size="sm"
                variant={vaultFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setVaultFilter('all')}
                className={`text-xs font-mono h-7 ${
                  vaultFilter === 'all' 
                    ? 'bg-[#dfc486] text-[#080b10]' 
                    : 'border-zinc-800 text-[#89909b]'
                }`}
              >
                All Knights ({samples.length})
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={loadSamples}
              disabled={isLoadingSamples}
              className="text-xs text-[#89909b] hover:text-[#efece4] h-7 gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingSamples ? 'animate-spin' : ''}`} />
              Refresh Vault
            </Button>
          </div>

          {filteredSamples.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#0c121b] border border-zinc-800 text-[#89909b] space-y-3">
              <Database className="w-8 h-8 mx-auto text-zinc-600" />
              <div className="text-sm font-serif text-[#efece4]">No Voice Samples Found</div>
              <p className="text-xs max-w-sm mx-auto">
                Record your first reference snippet in the Live Recorder tab to establish a custom vocal signature in Firebase Storage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSamples.map((sample) => {
                const isCurrentBase = sample.isBaseReference;
                const isPlaying = currentlyPlayingId === sample.id;

                return (
                  <div
                    key={sample.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrentBase
                        ? 'bg-[#dfc486]/5 border-[#dfc486]/60 shadow-[0_0_20px_rgba(223,196,134,0.12)]'
                        : 'bg-[#0c121b] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="border-zinc-700 text-[#dfc486] font-mono text-[9px]">
                            {sample.personaName || 'Knight'}
                          </Badge>
                          {isCurrentBase && (
                            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] font-mono gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              BASE REF
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-[#efece4] truncate max-w-[200px]">
                          {sample.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePlaySample(sample.id, sample.downloadUrl)}
                          className={`h-8 w-8 p-0 rounded-full ${
                            isPlaying 
                              ? 'bg-[#dfc486] text-[#080b10]' 
                              : 'border border-[#dfc486]/40 text-[#dfc486] hover:bg-[#dfc486]/10'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {isPlaying && (
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden my-2">
                        <div 
                          className="bg-[#dfc486] h-full transition-all duration-100"
                          style={{ width: `${playbackProgress}%` }}
                        />
                      </div>
                    )}

                    {sample.transcript && (
                      <p className="text-[11px] text-[#89909b] italic my-2 line-clamp-2 bg-black/30 p-2 rounded border border-zinc-900">
                        &ldquo;{sample.transcript}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#89909b] pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <span><Clock className="w-3 h-3 inline mr-0.5 text-zinc-500" />{formatTime(sample.duration)}</span>
                        <span>&bull;</span>
                        <span>{Math.round((sample.size || 0) / 1024)} KB</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrentBase && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetBaseReference(sample)}
                            className="h-6 text-[10px] font-mono text-[#dfc486] hover:bg-[#dfc486]/10 px-2"
                          >
                            Set as Base Ref
                          </Button>
                        )}

                        <a 
                          href={sample.downloadUrl}
                          download={`${sample.name}.webm`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-zinc-200"
                          title="Download Audio"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleDeleteSample(sample)}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete from Firebase Storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  if (embedded) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl p-6 bg-[#080b10] border border-[#dfc486]/40 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
};
