import { spawn } from 'node:child_process';

export type NotebookLmBackend = 'mcp_cli' | 'python_api' | 'stub';

export interface NotebookLmNotebookRef {
  id: string;
  title: string;
  tags?: string[];
}

export interface NotebookLmSourceRef {
  id?: string;
  notebookId: string;
  title?: string;
  kind: 'url' | 'text' | 'file' | 'drive' | 'youtube' | 'note';
  ref?: string;
}

export interface NotebookLmArtifactRef {
  id: string;
  notebookId: string;
  type: 'audio' | 'video' | 'slides' | 'infographic' | 'report' | 'quiz' | 'flashcards' | 'mind_map' | 'data_table';
  downloadPath?: string;
  status: 'queued' | 'running' | 'complete' | 'failed' | 'unknown';
}

export interface NotebookLmCloudBrainConfig {
  backend: NotebookLmBackend;
  cliCommand?: string;
  profile?: string;
  defaultNotebook?: string;
  allowPublicShare?: boolean;
  allowDeletes?: boolean;
}

export interface NotebookLmQueryResult {
  answer: string;
  notebookId: string;
  confidence: 'source_grounded' | 'partial' | 'unknown';
  sources?: NotebookLmSourceRef[];
  raw?: unknown;
}

function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}: ${stderr || stdout}`));
    });
  });
}

export class NotebookLmCloudBrain {
  constructor(private config: NotebookLmCloudBrainConfig = { backend: 'stub' }) {}

  async healthCheck() {
    if (this.config.backend === 'stub') {
      return { ok: true, backend: 'stub', message: 'NotebookLM Cloud Brain stub active.' };
    }

    if (this.config.backend === 'mcp_cli') {
      const command = this.config.cliCommand || 'nlm';
      try {
        const result = await runCommand(command, ['login', '--check']);
        return { ok: true, backend: 'mcp_cli', stdout: result.stdout, stderr: result.stderr };
      } catch (error: any) {
        return { ok: false, backend: 'mcp_cli', error: error.message || String(error) };
      }
    }

    return { ok: false, backend: this.config.backend, message: 'Python API health check should run in a Python worker.' };
  }

  async listNotebooks(): Promise<NotebookLmNotebookRef[]> {
    if (this.config.backend === 'stub') return [];
    const command = this.config.cliCommand || 'nlm';
    const result = await runCommand(command, ['notebook', 'list']);
    return [{ id: 'raw_cli_output', title: result.stdout }];
  }

  async createNotebook(title: string): Promise<NotebookLmNotebookRef> {
    if (this.config.backend === 'stub') return { id: `stub_${Date.now()}`, title };
    const command = this.config.cliCommand || 'nlm';
    const result = await runCommand(command, ['notebook', 'create', title]);
    return { id: 'created_cli_output', title: result.stdout || title };
  }

  async addTextSource(input: { notebookId: string; title: string; text: string }): Promise<NotebookLmSourceRef> {
    if (this.config.backend === 'stub') {
      return { notebookId: input.notebookId, title: input.title, kind: 'text', ref: `stub_text_${Date.now()}` };
    }
    const command = this.config.cliCommand || 'nlm';
    const payload = `${input.title}\n\n${input.text}`;
    const result = await runCommand(command, ['source', 'add', input.notebookId, '--text', payload]);
    return { notebookId: input.notebookId, title: input.title, kind: 'text', ref: result.stdout };
  }

  async addUrlSource(input: { notebookId: string; url: string }): Promise<NotebookLmSourceRef> {
    if (this.config.backend === 'stub') {
      return { notebookId: input.notebookId, kind: 'url', ref: input.url };
    }
    const command = this.config.cliCommand || 'nlm';
    const result = await runCommand(command, ['source', 'add', input.notebookId, '--url', input.url]);
    return { notebookId: input.notebookId, kind: 'url', ref: result.stdout || input.url };
  }

  async query(input: { notebookId: string; question: string }): Promise<NotebookLmQueryResult> {
    if (this.config.backend === 'stub') {
      return {
        notebookId: input.notebookId,
        answer: 'NotebookLM Cloud Brain stub result. Configure nlm or Python worker for live answers.',
        confidence: 'unknown',
      };
    }
    const command = this.config.cliCommand || 'nlm';
    const result = await runCommand(command, ['notebook', 'query', input.notebookId, input.question]);
    return {
      notebookId: input.notebookId,
      answer: result.stdout,
      confidence: 'partial',
      raw: result,
    };
  }

  async createAudioBriefing(input: { notebookId: string; instructions?: string; approved?: boolean }): Promise<NotebookLmArtifactRef> {
    if (!input.approved) {
      return {
        id: `approval_required_${Date.now()}`,
        notebookId: input.notebookId,
        type: 'audio',
        status: 'queued',
      };
    }
    if (this.config.backend === 'stub') {
      return { id: `stub_audio_${Date.now()}`, notebookId: input.notebookId, type: 'audio', status: 'complete' };
    }
    const command = this.config.cliCommand || 'nlm';
    const args = ['audio', 'create', input.notebookId, '--confirm'];
    if (input.instructions) args.push('--instructions', input.instructions);
    const result = await runCommand(command, args);
    return { id: result.stdout || `audio_${Date.now()}`, notebookId: input.notebookId, type: 'audio', status: 'unknown' };
  }
}

export function buildNotebookMemoryNote(input: {
  title: string;
  ukg: unknown;
  provenanceHash?: string;
  refs?: string[];
}) {
  return [
    `# ${input.title}`,
    '',
    '## Provenance',
    input.provenanceHash || 'unknown',
    '',
    '## Refs',
    ...(input.refs || []).map(ref => `- ${ref}`),
    '',
    '## UKG',
    '```json',
    JSON.stringify(input.ukg, null, 2),
    '```'
  ].join('\n');
}
