import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import cookieSession from 'cookie-session';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cookie session setup for OAuth
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'persona-live-secret'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    sameSite: 'none',
    httpOnly: true,
  }));

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/google/callback`
  );

  // Auth Routes
  app.get('/api/auth/google/url', (req, res) => {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    res.json({ url });
  });

  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      (req as any).session.tokens = tokens;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Google OAuth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/auth/status', (req, res) => {
    res.json({ 
      google: !!(req as any).session?.tokens 
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    (req as any).session = null;
    res.json({ success: true });
  });

  // Bridge Proxy
  app.post('/api/bridge/query', async (req, res) => {
    const { ip, port, protocol, path, method, data } = req.body;
    if (!ip) return res.status(400).json({ error: 'Bridge IP is required' });

    const targetUrl = `${protocol || 'http'}://${ip}:${port || 80}${path || '/'}`;
    
    try {
      const response = await fetch(targetUrl, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
        // Set a short timeout for bridge queries
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `Bridge returned error: ${response.statusText}`,
          details: await response.text()
        });
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Bridge Query Error:', error);
      res.status(500).json({ 
        error: 'Failed to reach bridge', 
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Ensure Tailscale is connected and the bridge is reachable at ' + targetUrl
      });
    }
  });

  app.get('/api/bridge/status/:ip', async (req, res) => {
    const { ip } = req.params;
    const { port, protocol } = req.query;
    const targetUrl = `${protocol || 'http'}://${ip}:${port || 80}/health`;

    try {
      const response = await fetch(targetUrl, { signal: AbortSignal.timeout(2000) });
      res.json({ online: response.ok });
    } catch (e) {
      res.json({ online: false });
    }
  });

  // Tailscale API Integration
  app.get('/api/tailscale/devices', async (req, res) => {
    const apiKey = process.env.TAILSCALE_API_KEY;
    const tailnet = process.env.TAILSCALE_TAILNET;

    if (!apiKey || !tailnet) {
      return res.status(400).json({ 
        error: 'Tailscale API not configured',
        details: 'Missing TAILSCALE_API_KEY or TAILSCALE_TAILNET in environment variables.'
      });
    }

    try {
      const auth = Buffer.from(`${apiKey}:`).toString('base64');
      const response = await fetch(`https://api.tailscale.com/api/v2/tailnet/${tailnet}/devices`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Tailscale API error [${response.status}]:`, errorText);
        return res.status(response.status).json({ 
          error: `Tailscale API Error: ${response.statusText}`,
          details: errorText
        });
      }

      const data = await response.json();
      res.json(data.devices || []);
    } catch (error) {
      console.error('Tailscale Network Error:', error);
      res.status(500).json({ error: 'Failed to connect to Tailscale API' });
    }
  });

  // Google Drive API
  app.get('/api/google/drive/files', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
      const response = await drive.files.list({
        pageSize: 20,
        fields: 'nextPageToken, files(id, name, mimeType)',
        q: "mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'application/pdf'",
      });
      res.json(response.data.files);
    } catch (error) {
      console.error('Drive API Error:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  app.get('/api/google/drive/file/:fileId', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const { fileId } = req.params;

    try {
      const file = await drive.files.get({ fileId, fields: 'name, mimeType' });
      let content = '';

      if (file.data.mimeType === 'application/vnd.google-apps.document') {
        const docResponse = await drive.files.export({
          fileId,
          mimeType: 'text/plain',
        });
        content = docResponse.data as string;
      } else {
        const docResponse = await drive.files.get({
          fileId,
          alt: 'media',
        });
        content = docResponse.data as string;
      }

      res.json({ name: file.data.name, content });
    } catch (error) {
      console.error('Drive File Error:', error);
      res.status(500).json({ error: 'Failed to fetch file content' });
    }
  });

  // Notebook (Cloud Brain) Endpoints
  app.post('/api/google/notebook/append', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    const { docId, content } = req.body;
    if (!docId || !content) return res.status(400).json({ error: 'docId and content required' });

    oauth2Client.setCredentials(tokens);
    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    try {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 }, // Insert at the beginning after the title or at the start
              text: `\n\n[CLOUD BRAIN LOG - ${new Date().toISOString()}]\n${content}\n`
            }
          }]
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Notebook Append Error:', error);
      res.status(500).json({ error: 'Failed to append to notebook' });
    }
  });

  app.post('/api/google/notebook/create', async (req, res) => {
    const tokens = (req as any).session?.tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    const { title } = req.body;

    oauth2Client.setCredentials(tokens);
    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    try {
      const doc = await docs.documents.create({
        requestBody: { title: title || 'Persona Cloud Brain' }
      });
      res.json({ docId: doc.data.documentId, title: doc.data.title });
    } catch (error) {
      console.error('Notebook Create Error:', error);
      res.status(500).json({ error: 'Failed to create notebook' });
    }
  });

  // RAG: Generate Vector Embeddings using Gemini
  app.post('/api/rag/embed', async (req, res) => {
    try {
      const { texts } = req.body;
      if (!Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: 'texts must be an array of strings' });
      }

      const ai = getGenAI();
      const batchSize = 16;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize).map(t => typeof t === 'string' ? t.slice(0, 1500) : String(t));
        const result = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: batch,
        });

        if (result.embeddings) {
          result.embeddings.forEach(e => {
            allEmbeddings.push(e.values || []);
          });
        }
      }

      res.json({ embeddings: allEmbeddings });
    } catch (error: any) {
      console.error('RAG Embed Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to embed content' });
    }
  });

  // RAG: Synthesize Character-Grounded Response
  app.post('/api/rag/synthesize', async (req, res) => {
    try {
      const { personaName, role, personality, tone, query, retrievedContext } = req.body;
      const ai = getGenAI();

      const prompt = `You are ${personaName}, a ${role}.
Character Core:
- Personality: ${personality}
- Vocal & Dialogue Tone: ${tone}

Below is your retrieved long-term memory, core attributes, and NotebookLM Cloud Brain context relevant to the user's inquiry:
"""
${retrievedContext}
"""

User Inquiry: "${query}"

Guidelines:
1. Respond strictly in your defined persona, voice cadence, and philosophy.
2. Maintain complete character consistency.
3. Explicitly utilize the retrieved memory fragments or Cloud Brain knowledge to ground your response, citing or recalling relevant facts naturally.
4. Keep the response engaging, articulate, and authentic to your character.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error('RAG Synthesize Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to synthesize response' });
    }
  });

  // RAG: Extract and Commit Session Memories
  app.post('/api/rag/extract-memory', async (req, res) => {
    try {
      const { transcript, personaName } = req.body;
      if (!transcript) return res.status(400).json({ error: 'transcript required' });

      const ai = getGenAI();
      const prompt = `You are an automated memory synthesis agent for the persona "${personaName}".
Review the following conversation snippet and extract 1 to 3 distinct, valuable memory fragments, user preferences, or character revelations that should be preserved in ${personaName}'s NotebookLM Cloud Brain for future RAG retrieval.

Output strictly a valid JSON array of objects with the following schema:
[
  {
    "title": "Short descriptive title (3-6 words)",
    "content": "Specific memory or insight formulated from the persona's first-person perspective",
    "tags": ["tag1", "tag2"],
    "category": "insight"
  }
]

Conversation snippet:
${transcript}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
        }
      });

      let memories = [];
      try {
        memories = JSON.parse(response.text || '[]');
      } catch {
        memories = [];
      }

      res.json({ memories });
    } catch (error: any) {
      console.error('Extract Memory Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to extract memory' });
    }
  });

  // NotebookLM: Source & Memory Synthesis (Digest, Podcast, Fact-check)
  app.post('/api/notebook/synthesize', async (req, res) => {
    try {
      const { personaName, role, type, sourcesText } = req.body;
      const ai = getGenAI();
      let prompt = '';
      let title = '';

      switch (type) {
        case 'summary':
          title = 'Executive Summary';
          prompt = `Based on the following sources and persona background, provide a comprehensive executive summary. 
Use bullet points for key findings and highlight any recurring themes. 
Respond in the persona of ${personaName} (${role}).

${sourcesText}`;
          break;
        case 'podcast':
          title = 'Audio Overview Script';
          prompt = `Transform the provided sources into a dynamic "NotebookLM-style" podcast script. 
There should be two hosts (AI-Persona ${personaName} and a Co-Host). 
Make it engaging, conversational, and deep-dive into the complex topics found in the sources.

${sourcesText}`;
          break;
        case 'factcheck':
          title = 'Fact-Checking & Validation';
          prompt = `Analyze the provided sources for potential contradictions or extraordinary claims. 
Cross-reference information across the sources and highlight any discrepancies or particularly strong evidence found.

${sourcesText}`;
          break;
        default:
          title = 'Synthesis';
          prompt = `Synthesize the provided sources for ${personaName}:\n\n${sourcesText}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      res.json({ title, content: response.text || 'No response generated.' });
    } catch (error: any) {
      console.error('Notebook Synthesize Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to synthesize' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
