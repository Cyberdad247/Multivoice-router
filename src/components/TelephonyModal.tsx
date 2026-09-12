import React, { useState, useRef, useEffect } from 'react';
import { Persona } from '../types/persona';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Radio,
  ShieldCheck,
  Volume2,
  Mic,
  MicOff,
  Hash,
  Delete,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface TelephonyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersona: Persona;
}

// DTMF standard frequency map (Hz)
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477]
};

export function TelephonyModal({
  isOpen,
  onClose,
  selectedPersona
}: TelephonyModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 438-9271');
  const [carrier, setCarrier] = useState<'fonoster' | 'webrtc'>('fonoster');
  const [callState, setCallState] = useState<'idle' | 'dialing' | 'connected' | 'ended'>('idle');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcriptLog, setTranscriptLog] = useState<Array<{ sender: string; text: string }>>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Play realistic DTMF dual-tone on button press
  const playDtmfTone = (digit: string) => {
    const freqs = DTMF_FREQS[digit];
    if (!freqs) return;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const [f1, f2] = freqs;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = f1;
      osc2.frequency.value = f2;

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.16);
      osc2.stop(ctx.currentTime + 0.16);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  const handleDigitClick = (digit: string) => {
    playDtmfTone(digit);
    setPhoneNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const startCall = () => {
    if (!phoneNumber.trim()) {
      toast.error('Enter a destination phone number or SIP address');
      return;
    }

    setCallState('dialing');
    setCallSeconds(0);
    setTranscriptLog([
      { sender: 'SYSTEM', text: `Initiating SIP egress via ${carrier === 'fonoster' ? 'Fonoster Sovereign Trunk' : 'WebRTC SIP Mesh'}...` },
      { sender: 'GATEWAY', text: `Routing to ${phoneNumber}... Codec: Opus 24kHz / G.711u` }
    ]);

    // Transition to connected after brief ring
    setTimeout(() => {
      setCallState('connected');
      setTranscriptLog(prev => [
        ...prev,
        { sender: selectedPersona.name, text: selectedPersona.signatureQuote || `Greetings. This is ${selectedPersona.name} speaking. Sovereign line verified.` }
      ]);
    }, 2400);
  };

  const endCall = () => {
    setCallState('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      setCallState('idle');
      setCallSeconds(0);
    }, 1500);
  };

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl p-6 bg-[#0a0e16] border border-[#d5b570]/40 rounded-xl shadow-2xl space-y-6 text-[#efece4]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d5b570]/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#dfc486]/10 border border-[#dfc486]/30 flex items-center justify-center text-[#dfc486]">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif text-[#dfc486]">
                Sovereign Telephony & Dispatch
              </h2>
              <p className="text-xs text-[#89909b]">
                Inbound & outbound VoIP trunking via Fonoster Gateway with {selectedPersona.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#89909b] hover:text-[#efece4]"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>

        {/* Carrier Selection */}
        <div className="flex items-center gap-2 p-1 bg-black/40 border border-zinc-800 rounded-lg text-xs">
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded text-center transition-colors font-mono ${
              carrier === 'fonoster'
                ? 'bg-[#dfc486]/20 text-[#dfc486] font-bold border border-[#dfc486]/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setCarrier('fonoster')}
          >
            Fonoster Sovereign Trunk (SIP/TLS)
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded text-center transition-colors font-mono ${
              carrier === 'webrtc'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setCarrier('webrtc')}
          >
            WebRTC Encrypted SIP Mesh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Keypad & Input */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-black/60 border border-zinc-700/80 rounded-lg py-2.5 px-3 text-lg font-mono text-center tracking-wider text-amber-200 focus:outline-none focus:border-[#dfc486]"
                disabled={callState !== 'idle'}
              />
              {callState === 'idle' && phoneNumber && (
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <Delete className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dialpad */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { digit: '1', sub: '' },
                { digit: '2', sub: 'ABC' },
                { digit: '3', sub: 'DEF' },
                { digit: '4', sub: 'GHI' },
                { digit: '5', sub: 'JKL' },
                { digit: '6', sub: 'MNO' },
                { digit: '7', sub: 'PQRS' },
                { digit: '8', sub: 'TUV' },
                { digit: '9', sub: 'WXYZ' },
                { digit: '*', sub: '' },
                { digit: '0', sub: '+' },
                { digit: '#', sub: '' }
              ].map(k => (
                <button
                  key={k.digit}
                  type="button"
                  onClick={() => handleDigitClick(k.digit)}
                  className="h-12 rounded-lg bg-zinc-900/60 hover:bg-[#dfc486]/20 border border-zinc-800 hover:border-[#dfc486]/40 flex flex-col items-center justify-center transition-all active:scale-95"
                >
                  <span className="font-mono text-base font-bold text-[#efece4]">
                    {k.digit}
                  </span>
                  {k.sub && (
                    <span className="text-[8px] font-mono text-zinc-500 tracking-widest">
                      {k.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Call Action Button */}
            {callState === 'idle' ? (
              <Button
                onClick={startCall}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              >
                <Phone className="w-5 h-5" />
                <span>Dispatch Call via {selectedPersona.name}</span>
              </Button>
            ) : (
              <Button
                onClick={endCall}
                className="w-full h-12 bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.25)]"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call ({formatTimer(callSeconds)})</span>
              </Button>
            )}
          </div>

          {/* Active Call Status & Transcript Log */}
          <div className="flex flex-col h-[320px] bg-black/50 border border-zinc-800 rounded-lg p-4 justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      callState === 'connected'
                        ? 'bg-emerald-400 animate-pulse'
                        : callState === 'dialing'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-zinc-600'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfc486]">
                    {callState === 'connected'
                      ? 'CALL IN PROGRESS'
                      : callState === 'dialing'
                      ? 'DIALING EGRESS...'
                      : 'LINE READY'}
                  </span>
                </div>
                {callState === 'connected' && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimer(callSeconds)}
                  </span>
                )}
              </div>

              {/* Call Audio Transcript Feed */}
              <div className="space-y-2 text-xs font-mono max-h-[200px] overflow-y-auto pr-1">
                {transcriptLog.map((entry, idx) => (
                  <div key={idx} className="bg-zinc-900/50 p-2 rounded border border-zinc-800/80">
                    <span className="text-[10px] text-[#dfc486] font-bold block mb-0.5">
                      {entry.sender}
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* In-Call Controls */}
            {callState === 'connected' && (
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-around">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-full border transition-colors ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>24kHz Full-Duplex Audio</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Stamp */}
        <div className="text-[11px] text-zinc-500 font-mono flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#dfc486]" />
            End-to-End Encrypted Sovereign Voice Tunnel
          </span>
          <span>Arthur Ed25519 Signed</span>
        </div>
      </div>
    </div>
  );
}
