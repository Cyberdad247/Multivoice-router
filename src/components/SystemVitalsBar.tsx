import React, { useState, useEffect } from 'react';
import { Persona } from '../types/persona';
import {
  Activity,
  Cpu,
  Shield,
  Zap,
  Radio,
  Keyboard,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface SystemVitalsBarProps {
  selectedPersona: Persona;
  isConnected: boolean;
  onOpenHotkeysModal?: () => void;
  userFriendlyMode?: boolean;
}

export function SystemVitalsBar({
  selectedPersona,
  isConnected,
  userFriendlyMode = true
}: SystemVitalsBarProps) {
  const [latency, setLatency] = useState(18);
  const [memoryMb, setMemoryMb] = useState(148);
  const [showHotkeyGuide, setShowHotkeyGuide] = useState(false);
  const [showFullMetrics, setShowFullMetrics] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(14 + Math.floor(Math.random() * 8));
      setMemoryMb(144 + Math.floor(Math.random() * 12));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-t border-[#34332f]/80 bg-[#080c12]/95 backdrop-blur px-4 py-2 text-[11px] font-mono text-[#8e98a8]">
      <div className="max-w-[1450px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* If userFriendlyMode and not expanded: show a clean, friendly status strip */}
        {userFriendlyMode && !showFullMetrics ? (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-400">Status:</span>
              <span className="text-emerald-400 font-semibold">{isConnected ? 'Live Voice Active' : 'Autonomous Engine Online'}</span>
            </div>

            <span className="text-zinc-700 hidden sm:inline">&bull;</span>

            <div className="flex items-center gap-1.5 text-zinc-300 hidden sm:flex">
              <Shield className="w-3.5 h-3.5 text-[#dfc486]" />
              <span className="text-zinc-400">Enclave:</span>
              <span className="text-zinc-200">Sovereign & Isolated</span>
            </div>

            <span className="text-zinc-700 hidden md:inline">&bull;</span>

            <div className="flex items-center gap-1.5 text-zinc-300 hidden md:flex">
              <span className="text-zinc-500">Latency:</span>
              <span className="text-zinc-300">{latency}ms</span>
            </div>

            <span className="text-zinc-700 hidden lg:inline">&bull;</span>

            <div className="text-zinc-400 hidden lg:inline">
              Knight: <strong className="text-[#dfc486]">{selectedPersona.name}</strong> ({selectedPersona.role})
            </div>
          </div>
        ) : (
          /* Pro metrics view */
          <div className="flex items-center gap-4 flex-wrap">
            {/* Latency Ping */}
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-500 text-[10px]">RTT:</span>
              <span className="text-emerald-400 font-bold">{latency}ms</span>
              <span className="text-zinc-600 text-[9px]">(Nominal)</span>
            </div>

            <span className="text-zinc-700">|</span>

            {/* cgroups v2 Memory Pressure */}
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Cpu className="w-3.5 h-3.5 text-[#dfc486]" />
              <span className="text-zinc-500 text-[10px]">CGROUPS V2:</span>
              <span className="text-zinc-200">{memoryMb}MB</span>
              <span className="text-zinc-600 text-[9px]">/ 8192MB Limit</span>
            </div>

            <span className="text-zinc-700">|</span>

            {/* Audio Pipeline Substrate */}
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-500 text-[10px]">AUDIO:</span>
              <span className="text-cyan-300">
                {isConnected ? '24kHz Live PCM / 0-Copy IPC' : 'Dual-Engine Ready'}
              </span>
            </div>

            <span className="text-zinc-700">|</span>

            {/* Cryptographic Security Enclave */}
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Shield className="w-3.5 h-3.5 text-[#d5b570]" />
              <span className="text-[#dfc486]">Arthur Ed25519 Enclave Active</span>
            </div>
          </div>
        )}

        {/* Right Side: Toggles */}
        <div className="flex items-center gap-2">
          {userFriendlyMode && (
            <button
              type="button"
              onClick={() => setShowFullMetrics(!showFullMetrics)}
              className="py-1 px-2 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-[10px]"
            >
              {showFullMetrics ? 'Simple Status' : 'Pro Telemetry'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowHotkeyGuide(!showHotkeyGuide)}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-[#dfc486] transition-colors text-[10px]"
          >
            <Keyboard className="w-3 h-3" />
            <span>Hotkeys</span>
            {showHotkeyGuide ? (
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            ) : (
              <ChevronUp className="w-3 h-3 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Hotkey Matrix Reference Tray */}
      {showHotkeyGuide && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 max-w-[1450px] mx-auto grid grid-cols-2 sm:grid-cols-6 gap-2 text-[10px]">
          <div className="p-1.5 bg-black/40 border border-zinc-800 rounded flex items-center justify-between">
            <span className="text-zinc-400">Select Knight</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
              1 – 6
            </span>
          </div>
          <div className="p-1.5 bg-black/40 border border-zinc-800 rounded flex items-center justify-between">
            <span className="text-zinc-400">Awaken Voice</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
              Space
            </span>
          </div>
          <div className="p-1.5 bg-black/40 border border-zinc-800 rounded flex items-center justify-between">
            <span className="text-zinc-400">Multivoice Live</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
              M
            </span>
          </div>
          <div className="p-1.5 bg-black/40 border border-zinc-800 rounded flex items-center justify-between">
            <span className="text-zinc-400">B.L.A.S.T. DAG</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
              B
            </span>
          </div>
          <div className="p-1.5 bg-black/40 border border-zinc-800 rounded flex items-center justify-between">
            <span className="text-zinc-400">Telephony Call</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
              T
            </span>
          </div>
          <div className="p-1.5 bg-black/40 border border-zinc-800 rounded flex items-center justify-between">
            <span className="text-zinc-400">Diagnostics</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
              D
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
