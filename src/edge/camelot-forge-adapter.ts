import { writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

export interface CamelotForgeAdapterOptions {
  binaryPath: string;
  workDir: string;
}

export interface CamelotForgeEncodeResult {
  manifestPath: string;
  qrPath: string;
  stdout: string;
  stderr: string;
}

function runBinary(binaryPath: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`camelot-forge exited ${code}: ${stderr || stdout}`));
    });
  });
}

export async function writeQrManifest(input: {
  payload: unknown;
  name: string;
  workDir: string;
}): Promise<string> {
  const safeName = input.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const manifestPath = path.join(input.workDir, `${safeName}.json`);
  await writeFile(manifestPath, JSON.stringify(input.payload, null, 2), 'utf-8');
  return manifestPath;
}

export async function encodeManifestToQr(input: {
  manifestPath: string;
  qrPath?: string;
  size?: number;
  adapter: CamelotForgeAdapterOptions;
}): Promise<CamelotForgeEncodeResult> {
  const qrPath = input.qrPath || input.manifestPath.replace(/\.[^.]+$/, '.qr.png');
  const { stdout, stderr } = await runBinary(input.adapter.binaryPath, [
    '-mode', 'encode',
    '-in', input.manifestPath,
    '-out', qrPath,
    '-size', String(input.size || 1024),
  ], input.adapter.workDir);
  return { manifestPath: input.manifestPath, qrPath, stdout, stderr };
}

export async function decodeQrToManifest(input: {
  qrPath: string;
  outputPath: string;
  adapter: CamelotForgeAdapterOptions;
}) {
  const { stdout, stderr } = await runBinary(input.adapter.binaryPath, [
    '-mode', 'decode',
    '-in', input.qrPath,
    '-out', input.outputPath,
  ], input.adapter.workDir);
  const recovered = await readFile(input.outputPath, 'utf-8');
  return { outputPath: input.outputPath, recovered, stdout, stderr };
}

export async function createEnrollmentQrWithForge(input: {
  payload: unknown;
  name: string;
  adapter: CamelotForgeAdapterOptions;
  size?: number;
}) {
  const manifestPath = await writeQrManifest({ payload: input.payload, name: input.name, workDir: input.adapter.workDir });
  return encodeManifestToQr({ manifestPath, adapter: input.adapter, size: input.size });
}
