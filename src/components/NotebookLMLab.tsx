import React, { useState } from 'react';
import { Persona, Source } from '../types/persona';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { 
  Sparkles, 
  FileSearch, 
  Podcast, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Brain,
  MessageSquareQuote
} from 'lucide-react';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';

interface NotebookLMLabProps {
  persona: Persona;
  sources: Source[];
  disabled?: boolean;
}

export function NotebookLMLab({ persona, sources, disabled }: NotebookLMLabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<{ title: string; content: string } | null>(null);

  const generateInsight = async (type: 'summary' | 'podcast' | 'factcheck') => {
    if (sources.length === 0) {
      toast.error('Add some sources first to enable NotebookLM analysis');
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const sourceContext = sources
        .map(s => `SOURCE [${s.name}]:\n${s.content || s.url || 'Empty Content'}`)
        .join('\n\n---\n\n');

      let prompt = "";
      let title = "";

      switch (type) {
        case 'summary':
          title = "Executive Summary";
          prompt = `Based on the following sources, provide a comprehensive executive summary. 
          Use bullet points for key findings and highlight any recurring themes. 
          Respond in the persona of ${persona.name} (${persona.role}).\n\n${sourceContext}`;
          break;
        case 'podcast':
          title = "Audio Overview Script";
          prompt = `Transform the provided sources into a dynamic "NotebookLM-style" podcast script. 
          There should be two hosts (AI-Persona ${persona.name} and a Co-Host). 
          Make it engaging, conversational, and deep-dive into the complex topics found in the sources.\n\n${sourceContext}`;
          break;
        case 'factcheck':
          title = "Fact-Checking & Validation";
          prompt = `Analyze the provided sources for potential contradictions or extraordinary claims. 
          Cross-reference information across the sources and highlight any discrepancies or particularly strong evidence found.\n\n${sourceContext}`;
          break;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const content = response.text || "No response generated.";
      setInsight({ title, content });
      toast.success(`${title} generated`);
    } catch (error) {
      console.error('NotebookLM Error:', error);
      toast.error('Failed to process sources');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          className="h-auto flex-col gap-2 p-4 bg-primary/5 hover:bg-primary/10 border-primary/20"
          onClick={() => generateInsight('summary')}
          disabled={disabled || isGenerating}
        >
          <FileSearch className="w-5 h-5 text-primary" />
          <div className="text-center">
            <div className="text-xs font-bold">Digest</div>
            <div className="text-[10px] text-muted-foreground">Source Summary</div>
          </div>
        </Button>

        <Button 
          variant="outline" 
          className="h-auto flex-col gap-2 p-4 bg-orange-500/5 hover:bg-orange-500/10 border-orange-500/20"
          onClick={() => generateInsight('podcast')}
          disabled={disabled || isGenerating}
        >
          <Podcast className="w-5 h-5 text-orange-500" />
          <div className="text-center">
            <div className="text-xs font-bold">Overview</div>
            <div className="text-[10px] text-muted-foreground">Audio Script</div>
          </div>
        </Button>

        <Button 
          variant="outline" 
          className="h-auto flex-col gap-2 p-4 bg-green-500/5 hover:bg-green-500/10 border-green-500/20"
          onClick={() => generateInsight('factcheck')}
          disabled={disabled || isGenerating}
        >
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div className="text-center">
            <div className="text-xs font-bold">Validate</div>
            <div className="text-[10px] text-muted-foreground">Fact Check</div>
          </div>
        </Button>
      </div>

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 border rounded-xl bg-muted/30 border-dashed">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-bold">Synthesizing Sources...</p>
            <p className="text-[10px] text-muted-foreground">Cross-referencing insights using {persona.name}'s expertise.</p>
          </div>
        </div>
      )}

      {!isGenerating && insight && (
        <Card className="border-primary/20 overflow-hidden bg-primary/5">
          <CardHeader className="bg-primary/10 border-b py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                {insight.title}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setInsight(null)}>
                <AlertCircle className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-6 prose prose-xs dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {insight.content}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {sources.length === 0 && !isGenerating && !insight && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
          <div className="p-4 rounded-full bg-muted">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <div className="max-w-[250px]">
            <p className="text-sm font-bold">Ground your Thinking</p>
            <p className="text-[10px]">Add sources in the "Sources" tab to enable NotebookLM-style synthesis and deep analysis.</p>
          </div>
        </div>
      )}
    </div>
  );
}
