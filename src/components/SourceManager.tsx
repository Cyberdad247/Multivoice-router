import React, { useState, useEffect } from 'react';
import { Source } from '../types/persona';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { 
  FileText, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  FileUp, 
  Globe, 
  Cloud, 
  LogOut,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface SourceManagerProps {
  sources: Source[];
  onAddSource: (source: Source) => void;
  onRemoveSource: (id: string) => void;
  disabled?: boolean;
}

export function SourceManager({ sources, onAddSource, onRemoveSource, disabled }: SourceManagerProps) {
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'google') {
        setIsGoogleConnected(true);
        toast.success('Google Workspace connected');
        fetchDriveFiles();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsGoogleConnected(data.google);
      if (data.google) fetchDriveFiles();
    } catch (e) {
      console.error('Auth status check failed');
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (e) {
      toast.error('Failed to get auth URL');
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsGoogleConnected(false);
      setDriveFiles([]);
      setShowDrivePicker(false);
      toast.info('Google Workspace disconnected');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const fetchDriveFiles = async () => {
    setIsLoadingDrive(true);
    try {
      const res = await fetch('/api/google/drive/files');
      if (res.ok) {
        const files = await res.json();
        setDriveFiles(files);
      }
    } catch (e) {
      toast.error('Failed to fetch Drive files');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleImportDriveFile = async (fileId: string) => {
    setIsLoadingDrive(true);
    try {
      const res = await fetch(`/api/google/drive/file/${fileId}`);
      if (res.ok) {
        const { name, content } = await res.json();
        onAddSource({
          id: crypto.randomUUID(),
          type: 'file',
          name: `[Drive] ${name}`,
          content: content
        });
        toast.success(`Imported ${name} from Drive`);
      }
    } catch (e) {
      toast.error('Failed to import file');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleAddUrl = () => {
    if (!url) return;
    try {
      new URL(url);
      onAddSource({
        id: crypto.randomUUID(),
        type: 'url',
        name: url.replace(/^https?:\/\//, '').split('/')[0],
        url: url
      });
      setUrl('');
      toast.success('URL source added');
    } catch (e) {
      toast.error('Please enter a valid URL');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      onAddSource({
        id: crypto.randomUUID(),
        type: 'file',
        name: file.name,
        content: text
      });
      toast.success(`${file.name} uploaded successfully`);
    } catch (err) {
      toast.error('Failed to read file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Knowledge Sources
          </CardTitle>
          {isGoogleConnected ? (
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground" onClick={handleGoogleLogout}>
              <LogOut className="w-3 h-3" /> Disconnect
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleGoogleConnect}>
              <Cloud className="w-3 h-3" /> Connect Google
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          Ground the AI in web content, local files, or Google Workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input 
              placeholder="https://example.com/article" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-xs"
              disabled={disabled}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
          </div>
          <Button 
            size="sm" 
            variant="secondary" 
            className="h-8 px-3" 
            onClick={handleAddUrl}
            disabled={disabled || !url}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>

        {/* File Upload & Google Drive */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".txt,.md,.json,.csv"
              onChange={handleFileUpload}
              disabled={disabled || isUploading}
            />
            <Label 
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center gap-1 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors hover:bg-primary/5 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FileUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {isUploading ? 'Uploading...' : 'Local File'}
              </span>
            </Label>
          </div>

          <Button
            variant="outline"
            className="h-auto flex-col gap-1 p-3 border-2 border-dashed hover:bg-primary/5"
            onClick={() => isGoogleConnected ? setShowDrivePicker(!showDrivePicker) : handleGoogleConnect()}
            disabled={disabled}
          >
            <Cloud className={`w-4 h-4 ${isGoogleConnected ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <span className="text-[10px] font-medium text-muted-foreground">
              {isGoogleConnected ? 'Google Drive' : 'Connect Drive'}
            </span>
          </Button>
        </div>

        {/* Drive File Picker */}
        {showDrivePicker && isGoogleConnected && (
          <div className="p-2 border rounded-lg bg-background space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Recent Drive Docs</span>
              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => fetchDriveFiles()}>
                <Plus className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <ScrollArea className="h-[120px]">
              {isLoadingDrive ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : driveFiles.length > 0 ? (
                <div className="space-y-1">
                  {driveFiles.map(file => (
                    <button
                      key={file.id}
                      className="w-full text-left p-1.5 rounded hover:bg-muted text-[10px] truncate flex items-center gap-2"
                      onClick={() => handleImportDriveFile(file.id)}
                    >
                      <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                      {file.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-center text-muted-foreground py-4">No compatible files found</p>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Active Sources List */}
        {sources.length > 0 && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Active Knowledge</Label>
            <ScrollArea className="h-[120px] pr-4">
              <div className="space-y-2">
                {sources.map((source) => (
                  <div 
                    key={source.id} 
                    className="flex items-center justify-between p-2 rounded-md bg-background border text-xs group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {source.type === 'url' ? (
                        <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      )}
                      <span className="truncate font-medium">{source.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => onRemoveSource(source.id)}
                      disabled={disabled}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
