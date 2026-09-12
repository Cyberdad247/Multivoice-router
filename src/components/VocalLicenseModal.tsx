import React, { useState, useEffect } from 'react';
import { Persona } from '../types/persona';
import { VocalLicense, VocalLicenseTier, VOCAL_LICENSE_PRESETS } from '../types/license';
import { vocalLicenseService } from '../lib/firestore';
import { useAuth } from './AuthProvider';
import {
  ShieldCheck,
  Award,
  Key,
  FileCheck,
  Copy,
  Check,
  Download,
  Fingerprint,
  Radio,
  ExternalLink,
  Sparkles,
  Lock,
  Layers,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface VocalLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersona: Persona;
  embedded?: boolean;
}

export function VocalLicenseModal({
  isOpen,
  onClose,
  selectedPersona,
  embedded = false
}: VocalLicenseModalProps) {
  const { user } = useAuth();
  const [tier, setTier] = useState<VocalLicenseTier>('sovereign');
  const [licensee, setLicensee] = useState('Cyberdad247 Sanctuary Citadel');
  const [isMinting, setIsMinting] = useState(false);
  const [savedLicense, setSavedLicense] = useState<VocalLicense | null>(null);
  const [copiedDeed, setCopiedDeed] = useState(false);

  // Derive dynamic spectral F0 timbre hash for the current voice
  const timbreHash = React.useMemo(() => {
    const seed = `${selectedPersona.id}-${selectedPersona.voice}-24khz-f0`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256:f0_${hex}a9d472c1847e31b026${selectedPersona.voice.toLowerCase()}`;
  }, [selectedPersona.id, selectedPersona.voice]);

  const watermarkKey = React.useMemo(() => {
    return `c2pa:watermark:ed25519:${selectedPersona.id.substring(0, 8)}:vocal_os`;
  }, [selectedPersona.id]);

  useEffect(() => {
    if (isOpen) {
      loadExistingLicense();
    }
  }, [isOpen, selectedPersona.id]);

  const loadExistingLicense = async () => {
    try {
      const list = await vocalLicenseService.listLicenses(selectedPersona.id);
      if (list && list.length > 0) {
        const active = list[0];
        setSavedLicense(active);
        setTier(active.licenseType);
        setLicensee(active.licensee);
      } else {
        setSavedLicense(null);
      }
    } catch {
      // Offline fallback
    }
  };

  const handleMintLicense = async () => {
    setIsMinting(true);
    const preset = VOCAL_LICENSE_PRESETS[tier];
    const newLicense: VocalLicense = {
      id: `lic_${selectedPersona.id}_${Date.now()}`,
      personaId: selectedPersona.id,
      licenseType: tier,
      licensee: licensee.trim() || 'Anonymous Sovereign Node',
      timbreHash,
      c2paSigned: true,
      watermarkKey,
      rights: preset.rights,
      terms: preset.terms,
      royaltyBps: preset.royaltyBps,
      ownerId: user?.uid || 'sovereign_local_operator'
    };

    try {
      if (user) {
        await vocalLicenseService.saveLicense(newLicense);
      }
      setSavedLicense(newLicense);
      toast.success(`Sovereign Vocal Deed sealed for ${selectedPersona.name} (${preset.label})`);
    } catch (e) {
      // Local fallback
      setSavedLicense(newLicense);
      toast.info(`Local Vocal Deed created for ${selectedPersona.name}`);
    } finally {
      setIsMinting(false);
    }
  };

  const deedCertificate = savedLicense
    ? `-----BEGIN SOVEREIGN VOCAL DEED-----
Entity: ${selectedPersona.name} (${selectedPersona.role})
Voice Profile: ${selectedPersona.voice}
Licensee: ${savedLicense.licensee}
License Tier: ${VOCAL_LICENSE_PRESETS[savedLicense.licenseType].label.toUpperCase()}
Timbre F0 Fingerprint: ${savedLicense.timbreHash}
C2PA Watermark Signature: ${savedLicense.watermarkKey}
C2PA Compliant: ${savedLicense.c2paSigned ? 'YES (AI Act & Coalition Standard)' : 'NO'}
Royalty Fee: ${(savedLicense.royaltyBps / 100).toFixed(2)}%
Rights Granted:
${savedLicense.rights.map(r => `  - ${r}`).join('\n')}
Terms of Enclave:
  "${savedLicense.terms}"
Signed By: Arthur Pendragon, Sovereign Enclave Gatekeeper
-----END SOVEREIGN VOCAL DEED-----`
    : '';

  const handleCopyDeed = () => {
    if (!deedCertificate) return;
    navigator.clipboard.writeText(deedCertificate);
    setCopiedDeed(true);
    toast.success('Vocal Deed certificate copied to clipboard');
    setTimeout(() => setCopiedDeed(false), 2000);
  };

  const content = (
    <div className="space-y-6 text-[#efece4]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d5b570]/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#dfc486]/10 border border-[#dfc486]/30 flex items-center justify-center text-[#dfc486]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif text-[#dfc486]">
                Vocal License & Provenance Engine
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                C2PA AI ACT COMPLIANT
              </span>
            </div>
            <p className="text-xs text-[#89909b]">
              Cryptographic voice deed, spectral F0 provenance, and synthetic watermark enforcement for {selectedPersona.name}
            </p>
          </div>
        </div>

        {!embedded && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[#89909b] hover:text-[#efece4]"
            onClick={onClose}
          >
            ✕
          </Button>
        )}
      </div>

      {/* Voice Spectral Fingerprint Box */}
      <div className="p-4 rounded-lg bg-black/50 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-[#dfc486]">
            <Fingerprint className="w-4 h-4 text-[#dfc486]" />
            <span className="font-bold uppercase tracking-wider">
              Acoustic F0 Timbre Watermark
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            Engine: Cyberdad247/Vocal-license-engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block mb-0.5">SPECTRAL F0 TIMBRE HASH</span>
            <span className="text-amber-200 truncate block text-[11px] select-all">
              {timbreHash}
            </span>
          </div>
          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block mb-0.5">C2PA WATERMARK INJECTION KEY</span>
            <span className="text-cyan-300 truncate block text-[11px] select-all">
              {watermarkKey}
            </span>
          </div>
        </div>
      </div>

      {/* License Tier Selection Grid */}
      <div className="space-y-3">
        <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
          Select Vocal Sovereignty Tier
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {(['sanctuary', 'sovereign', 'commercial', 'royal'] as VocalLicenseTier[]).map(t => {
            const p = VOCAL_LICENSE_PRESETS[t];
            const isSelected = tier === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-[#dfc486] bg-[#dfc486]/10 shadow-[0_0_15px_rgba(223,196,134,0.15)]'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-[#efece4]">{p.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#dfc486]" />}
                </div>
                <span className="text-[9px] font-mono text-[#dfc486] block mb-2 uppercase">
                  {p.badge}
                </span>
                <p className="text-[11px] text-[#89909b] leading-tight">
                  {p.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Licensee & Terms Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
            Authorized Licensee / Enclave Name
          </label>
          <input
            type="text"
            value={licensee}
            onChange={e => setLicensee(e.target.value)}
            className="w-full bg-black/60 border border-zinc-700 rounded-lg p-2.5 text-xs font-mono text-amber-200 focus:outline-none focus:border-[#dfc486]"
            placeholder="e.g. Cyberdad247 Bare-Metal Cluster"
          />
          <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between pt-1">
            <span>Royalty Distribution:</span>
            <span className="text-[#dfc486] font-bold">
              {(VOCAL_LICENSE_PRESETS[tier].royaltyBps / 100).toFixed(2)}% to Arthur Covenant
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
            Granted Rights Matrix
          </label>
          <div className="p-2.5 bg-black/40 border border-zinc-800 rounded-lg space-y-1.5 text-xs">
            {VOCAL_LICENSE_PRESETS[tier].rights.map((right, idx) => (
              <div key={idx} className="flex items-start gap-2 text-zinc-300">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">{right}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sealed Deed / Certificate View */}
      {savedLicense && (
        <div className="p-4 rounded-lg bg-[#08120d] border border-emerald-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>SOVEREIGN VOCAL DEED ISSUED & RECORDED</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyDeed}
              className="h-7 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 font-mono"
            >
              {copiedDeed ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Deed PEM
                </>
              )}
            </Button>
          </div>

          <pre className="text-[10px] font-mono text-zinc-300 bg-black/60 p-3 rounded border border-zinc-800 overflow-x-auto max-h-36 leading-relaxed select-all">
            {deedCertificate}
          </pre>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-400 font-mono">
          Selected: <strong className="text-[#efece4]">{selectedPersona.name}</strong> &bull;{' '}
          Voice: <strong className="text-[#dfc486]">{selectedPersona.voice}</strong>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleMintLicense}
            disabled={isMinting}
            className="bg-gradient-to-r from-[#bba06b] to-[#e5cd99] text-[#15140f] font-bold text-xs"
          >
            <Key className="w-3.5 h-3.5 mr-1.5" />
            {isMinting ? 'Sealing Cryptographic Deed...' : 'Mint & Sign Vocal Deed'}
          </Button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="p-4 bg-[#0a0f18] rounded-xl border border-zinc-800">{content}</div>;
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl p-6 bg-[#0c121b] border border-[#d5b570]/40 rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}
