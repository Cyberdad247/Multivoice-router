import React, { useState } from 'react';
import { Persona, Source } from '../types/persona';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  FileText, 
  UploadCloud, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  X,
  FileCode,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface VoiceSourceUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona;
  onUpdatePersona: (persona: Persona) => void;
}

export const VoiceSourceUploader: React.FC<VoiceSourceUploaderProps> = ({
  isOpen,
  onClose,
  persona,
  onUpdatePersona
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'url'>('upload');
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const currentSources = persona.sources || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newSource: Source = {
        id: `source-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        type: 'file',
        content: content || ''
      };

      const updatedSources = [...currentSources, newSource];
      const updatedPersona: Persona = {
        ...persona,
        sources: updatedSources
      };

      onUpdatePersona(updatedPersona);
      setIsProcessing(false);
      toast.success(`Reference source "${file.name}" attached to ${persona.name}`, {
        description: 'Cloning Quality & Synthesis Fidelity recalculated!'
      });
    };

    reader.onerror = () => {
      setIsProcessing(false);
      toast.error('Failed to read file content');
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddTextSource = () => {
    if (!docContent.trim()) {
      toast.error('Please enter script or manuscript content');
      return;
    }

    const title = docName.trim() || `${persona.name} Dialogue Script ${currentSources.length + 1}`;
    const newSource: Source = {
      id: `source-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: title,
      type: 'file',
      content: docContent.trim()
    };

    const updatedPersona: Persona = {
      ...persona,
      sources: [...currentSources, newSource]
    };

    onUpdatePersona(updatedPersona);
    setDocName('');
    setDocContent('');
    toast.success(`Dialogue script "${title}" attached to ${persona.name}`, {
      description: 'Synthesis fidelity increased!'
    });
  };

  const handleAddUrlSource = () => {
    if (!sourceUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      new URL(sourceUrl);
    } catch {
      toast.error('Please enter a valid URL (including https://)');
      return;
    }

    const title = docName.trim() || new URL(sourceUrl).hostname;
    const newSource: Source = {
      id: `source-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: title,
      type: 'url',
      url: sourceUrl.trim()
    };

    const updatedPersona: Persona = {
      ...persona,
      sources: [...currentSources, newSource]
    };

    onUpdatePersona(updatedPersona);
    setDocName('');
    setSourceUrl('');
    toast.success(`Reference URL "${title}" attached to ${persona.name}`);
  };

  const handleRemoveSource = (id: string) => {
    const updatedPersona: Persona = {
      ...persona,
      sources: currentSources.filter(s => s.id !== id)
    };
    onUpdatePersona(updatedPersona);
    toast.info('Source removed from persona');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#090d14] border border-[#dfc486]/40 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-[#efece4]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dfc486]/20 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#dfc486]" />
            <h3 className="text-lg font-serif text-[#efece4]">
              Upload Reference Sources &bull; {persona.name}
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-[#89909b]">
          Upload dialogue scripts, phonetic guides, lore manuscripts, or documents. Uploaded sources directly train the synthesis vocabulary and boost your <strong>Cloning Quality</strong> score.
        </p>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <Button
            size="sm"
            variant={activeTab === 'upload' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('upload')}
            className={`text-xs font-mono h-7 gap-1.5 ${
              activeTab === 'upload' ? 'bg-[#dfc486] text-[#080b10]' : 'text-zinc-400'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload File
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'text' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('text')}
            className={`text-xs font-mono h-7 gap-1.5 ${
              activeTab === 'text' ? 'bg-[#dfc486] text-[#080b10]' : 'text-zinc-400'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Paste Script / Transcript
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'url' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('url')}
            className={`text-xs font-mono h-7 gap-1.5 ${
              activeTab === 'url' ? 'bg-[#dfc486] text-[#080b10]' : 'text-zinc-400'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Link URL
          </Button>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === 'upload' && (
          <div className="p-6 rounded-lg bg-black/40 border border-dashed border-[#dfc486]/30 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#dfc486]/10 border border-[#dfc486]/20 flex items-center justify-center mx-auto text-[#dfc486]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Select Document or Speech Transcript</div>
              <div className="text-[11px] text-[#89909b] mt-0.5">
                Supports TXT, MD, JSON, CSV, and script excerpts
              </div>
            </div>

            <label className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#dfc486] hover:bg-[#eccd8f] text-[#080b10] font-mono font-bold text-xs cursor-pointer">
              <FileText className="w-3.5 h-3.5" />
              {isProcessing ? 'Processing File...' : 'Browse Document File'}
              <input
                type="file"
                accept=".txt,.md,.json,.csv,.text"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Tab 2: Text / Transcript Input */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <Input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Script Title (e.g., Sovereign War Speech / Timbre Monologue)"
              className="bg-[#0c121b] border-zinc-800 text-xs text-[#efece4] focus:border-[#dfc486]"
            />
            <Textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Paste spoken monologue, cadence guidelines, or phonetic lines..."
              rows={4}
              className="bg-[#0c121b] border-zinc-800 text-xs text-[#efece4] focus:border-[#dfc486]"
            />
            <Button
              onClick={handleAddTextSource}
              className="w-full bg-[#dfc486] text-[#080b10] hover:bg-[#eccd8f] font-mono text-xs font-bold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Script Source
            </Button>
          </div>
        )}

        {/* Tab 3: URL Source */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <Input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Document / Lore Title"
              className="bg-[#0c121b] border-zinc-800 text-xs text-[#efece4] focus:border-[#dfc486]"
            />
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/lore-or-transcript.txt"
              className="bg-[#0c121b] border-zinc-800 text-xs text-[#efece4] focus:border-[#dfc486]"
            />
            <Button
              onClick={handleAddUrlSource}
              className="w-full bg-[#dfc486] text-[#080b10] hover:bg-[#eccd8f] font-mono text-xs font-bold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Attach Web Reference
            </Button>
          </div>
        )}

        {/* Current Attached Sources */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="text-xs font-mono text-[#aa9872] flex items-center justify-between">
            <span>Attached Sources ({currentSources.length})</span>
            <span className="text-[10px] text-zinc-400">
              {currentSources.reduce((acc, s) => acc + (s.content?.length || 0), 0)} characters
            </span>
          </div>

          {currentSources.length === 0 ? (
            <div className="p-3 rounded-lg bg-black/30 text-center text-xs text-zinc-500 font-mono">
              No sources attached yet. Uploading a source increases cloning quality by +15-25%.
            </div>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {currentSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {source.type === 'file' ? (
                      <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                    ) : (
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-[#efece4] truncate font-medium">{source.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {source.content ? `${source.content.length} chars` : source.url ? 'URL' : ''}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSource(source.id)}
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
