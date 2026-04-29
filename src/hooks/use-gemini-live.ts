import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';
import { Persona } from '../types/persona';
import { float32ToInt16, arrayBufferToBase64, base64ToArrayBuffer, int16ToFloat32 } from '../lib/audio-utils';
import { routeIntent } from '../router/intent-router';
import { enforcePolicy } from '../policy/policy-engine';
import { dispatchToEdge } from '../router/edge-router';
import { toast } from 'sonner';

const SAMPLE_RATE = 16000;

export function useGeminiLive(persona: Persona) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const lastDispatchedTranscriptRef = useRef<string>('');

  const stopAudio = useCallback(() => {
    if (processorRef.current) processorRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    audioContextRef.current = null;
    processorRef.current = null;
    sourceRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    setIsConnected(false);
    stopAudio();
  }, [stopAudio]);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current || !audioContextRef.current) return;

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(chunk);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextInQueue();
    };
    source.start();
  }, []);

  const dispatchTranscript = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === lastDispatchedTranscriptRef.current) return;
    lastDispatchedTranscriptRef.current = trimmed;

    try {
      const route = routeIntent(trimmed);
      const governed = enforcePolicy(route);
      const result = await dispatchToEdge(governed);

      if (result.status === 'approval_required') toast.warning(`Approval needed: ${result.message}`);
      else if (result.status === 'queued') toast.success(`Routed to ${result.targetNode}`);
    } catch (error) {
      console.error('Jarvis dispatch error:', error);
      toast.error('Jarvis routing failed');
    }
  }, []);

  const buildSourceContext = useCallback((p: Persona) => {
    const fileSources = p.sources?.filter(s => s.type === 'file') || [];
    if (fileSources.length === 0) return '';
    return '\n\n### ATTACHED DOCUMENTS (NotebookLM Context):\n' + fileSources.map(s => `[Source: ${s.name}]\n${s.content}`).join('\n\n---\n\n');
  }, []);

  const buildTools = useCallback((p: Persona) => {
    const urlSources = p.sources?.filter(s => s.type === 'url').map(s => s.url) || [];
    return [
      ...(urlSources.length > 0 ? [{ urlContext: { urls: urlSources } }] : []),
      ...(p.bridgeConfig?.enabled ? [{
        functionDeclarations: [{
          name: 'query_bridge',
          description: 'Query the linked Rust bridge on the user\'s Tailscale network to perform actions or retrieve device data.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING, description: 'The API path to query (e.g. /status, /sensors, /control)' },
              method: { type: Type.STRING, description: 'HTTP method (GET, POST, etc.)' },
              data: { type: Type.OBJECT, description: 'Payload for POST/PUT requests' }
            },
            required: ['path']
          }
        }]
      }] : []),
      {
        functionDeclarations: [
          { name: 'list_tailscale_devices', description: 'List all devices in the user\'s Tailscale network.', parameters: { type: Type.OBJECT, properties: {} } },
          { name: 'get_rustdesk_info', description: 'Get connection information for the linked RustDesk remote desktop agent.', parameters: { type: Type.OBJECT, properties: {} } },
          ...(p.notebookConfig?.enabled ? [
            { name: 'query_cloud_brain', description: 'Read the contents of your linked Google Doc Cloud Brain.', parameters: { type: Type.OBJECT, properties: {} } },
            {
              name: 'write_to_cloud_brain',
              description: 'Save a new thought, memory, or log entry to your persistent Cloud Brain.',
              parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING, description: 'The information to save to the notebook.' } }, required: ['content'] }
            }
          ] : [])
        ]
      }
    ];
  }, []);

  const updateConfig = useCallback((newPersona: Persona) => {
    if (!sessionRef.current || !isConnected) return;
    sessionRef.current.sendRealtimeInput({
      config: {
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: newPersona.voice } } },
        systemInstruction: newPersona.systemInstruction + '\n\nYour memory includes: ' + newPersona.memory.join('. ') + buildSourceContext(newPersona) + '\n\nPlease use the provided documents and URLs to ground your responses. If asked about specific details from the sources, refer to them accurately.',
        tools: buildTools(newPersona),
      }
    });
    toast.success(`Switched to ${newPersona.name}`);
  }, [isConnected, buildSourceContext, buildTools]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const sourceContext = buildSourceContext(persona);
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voice } } },
          systemInstruction: persona.systemInstruction +
            '\n\nYour memory includes: ' + persona.memory.join('. ') +
            sourceContext +
            (persona.notebookConfig?.enabled ? `\n\nCLOUD BRAIN (Notebook): You are linked to a Google Doc (ID: ${persona.notebookConfig.id}). You can use 'query_cloud_brain' to retrieve long-term context and 'write_to_cloud_brain' to save important insights, user preferences, or mission logs during this session.` : '') +
            '\n\nYou are connected to the Camelot Jarvis routing layer. For action requests, explain what will be routed and respect approval gates. Do not claim an action completed until the edge route reports completion.' +
            '\n\nPlease use the provided documents and URLs to ground your responses. If asked about specific details from the sources, refer to them accurately.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: buildTools(persona),
        },
        callbacks: {
          onopen: async () => {
            setIsConnected(true);
            setIsConnecting(false);
            audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setAudioLevel(Math.sqrt(sum / inputData.length));
              const int16Buffer = float32ToInt16(inputData);
              const base64Data = arrayBufferToBase64(int16Buffer);
              sessionRef.current?.sendRealtimeInput({ audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const arrayBuffer = base64ToArrayBuffer(base64Audio);
              const float32Data = int16ToFloat32(new Int16Array(arrayBuffer));
              audioQueueRef.current.push(float32Data);
              playNextInQueue();
            }

            const userTranscription = message.serverContent?.inputTranscription?.text;
            if (userTranscription) {
              setTranscription(prev => [...prev, { role: 'user', text: userTranscription }]);
              await dispatchTranscript(userTranscription);
            }

            const modelTranscription = message.serverContent?.outputTranscription?.text;
            if (modelTranscription) setTranscription(prev => [...prev, { role: 'model', text: modelTranscription }]);

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              toast.info('Interrupted. Audio queue cleared.');
            }

            if ((message.serverContent as any)?.goAway) {
              console.log('Session duration limit reached. Closing connection gracefully.');
              disconnect();
              return;
            }

            const toolCall = message.toolCall;
            if (toolCall) {
              for (const call of toolCall.functionCalls) {
                if (call.name === 'query_bridge') {
                  try {
                    const response = await fetch('/api/bridge/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip: persona.bridgeConfig?.ip, port: persona.bridgeConfig?.port, protocol: persona.bridgeConfig?.protocol, ...call.args }) });
                    const result = await response.json();
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'query_bridge', response: { result }, id: call.id }] });
                  } catch (_error) {
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'query_bridge', response: { error: 'Failed to reach bridge' }, id: call.id }] });
                  }
                }

                if (call.name === 'list_tailscale_devices') {
                  try {
                    const response = await fetch('/api/tailscale/devices');
                    const devices = await response.json();
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'list_tailscale_devices', response: { devices }, id: call.id }] });
                  } catch (_error) {
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'list_tailscale_devices', response: { error: 'Failed to fetch Tailscale devices' }, id: call.id }] });
                  }
                }

                if (call.name === 'get_rustdesk_info') {
                  sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'get_rustdesk_info', response: { enabled: persona.rustDeskConfig?.enabled || false, id: persona.rustDeskConfig?.id, server: persona.rustDeskConfig?.server, deepLink: `rustdesk://${persona.rustDeskConfig?.id}` }, id: call.id }] });
                }

                if (call.name === 'query_cloud_brain') {
                  try {
                    const response = await fetch(`/api/google/drive/file/${persona.notebookConfig?.id}`);
                    const data = await response.json();
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'query_cloud_brain', response: { content: data.content }, id: call.id }] });
                  } catch (_e) {
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'query_cloud_brain', response: { error: 'Failed to access Cloud Brain' }, id: call.id }] });
                  }
                }

                if (call.name === 'write_to_cloud_brain') {
                  try {
                    await fetch('/api/google/notebook/append', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docId: persona.notebookConfig?.id, content: call.args.content }) });
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'write_to_cloud_brain', response: { status: 'Memory persisted to Cloud Brain' }, id: call.id }] });
                    toast.success(`${persona.name} updated the Cloud Brain.`);
                  } catch (_e) {
                    sessionRef.current?.sendToolResponse({ functionResponses: [{ name: 'write_to_cloud_brain', response: { error: 'Failed to write to Cloud Brain' }, id: call.id }] });
                  }
                }
              }
            }
          },
          onclose: () => {
            setIsConnected(false);
            setIsConnecting(false);
            stopAudio();
          },
          onerror: (error) => {
            console.error('Gemini Live Error:', error);
            setIsConnected(false);
            setIsConnecting(false);
            stopAudio();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to connect to Gemini Live:', error);
      setIsConnecting(false);
    }
  }, [persona, stopAudio, playNextInQueue, isConnecting, isConnected, disconnect, dispatchTranscript, buildSourceContext, buildTools]);

  useEffect(() => () => disconnect(), [disconnect]);

  return { isConnected, isConnecting, connect, disconnect, updateConfig, transcription, audioLevel };
}
