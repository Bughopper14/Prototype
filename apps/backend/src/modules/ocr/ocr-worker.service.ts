import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {Injectable, type OnModuleDestroy} from '@nestjs/common';

/**
 * Client for the Python OCR worker (apps/backend/ocr/ocr_worker.py).
 *
 * Loading the OCR models takes a long time, so a single worker process is started on first use (or by warmUp)
 * and then reused for every request. Requests are processed one at a time; a request that exceeds its timeout
 * kills the worker, which is started again on the next call.
 */

function resolveOcrDir(): string {
  if (process.env.OCR_DIR) {
    const custom = path.resolve(process.env.OCR_DIR);
    if (existsSync(path.join(custom, 'ocr_worker.py'))) return custom;
  }
  const inCwd = path.resolve(process.cwd(), 'ocr');
  if (existsSync(path.join(inCwd, 'ocr_worker.py'))) return inCwd;
  const inSrc = path.resolve(__dirname, '../../ocr');
  if (existsSync(path.join(inSrc, 'ocr_worker.py'))) return inSrc;
  const inBackend = path.resolve(__dirname, '../../../ocr');
  if (existsSync(path.join(inBackend, 'ocr_worker.py'))) return inBackend;
  const inRepo = path.resolve(__dirname, '../../../../apps/backend/ocr');
  if (existsSync(path.join(inRepo, 'ocr_worker.py'))) return inRepo;
  return path.resolve(process.env.OCR_DIR || 'ocr');
}

const OCR_DIR = resolveOcrDir();
const STARTUP_TIMEOUT_MS = 120_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

type Pending = {resolve: (value: any) => void; reject: (error: Error) => void};

function pythonExecutable() {
  if (process.env.PYTHON_PATH?.trim()) return process.env.PYTHON_PATH.trim();
  const venv =
    process.platform === 'win32'
      ? path.join(OCR_DIR, '.venv', 'Scripts', 'python.exe')
      : path.join(OCR_DIR, '.venv', 'bin', 'python');
  if (existsSync(venv)) return venv;
  if (process.platform === 'win32') {
    const localPython = path.join(process.env.LOCALAPPDATA || '', 'Python', 'bin', 'python.exe');
    if (existsSync(localPython)) return localPython;
  }
  return 'python';
}

@Injectable()
export class OcrWorkerService implements OnModuleDestroy {
  private process: ChildProcessWithoutNullStreams | null = null;
  private starting: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 1;
  private buffer = '';
  private stderrTail = '';

  /** Starts the worker if it is not running and resolves once the models are loaded. */
  private start(): Promise<void> {
    if (this.process && !this.starting) return Promise.resolve();
    if (this.starting) return this.starting;

    this.starting = new Promise<void>((resolve, reject) => {
      const child = spawn(pythonExecutable(), [path.join(OCR_DIR, 'ocr_worker.py')], {
        cwd: OCR_DIR,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1',
          TESSDATA_PREFIX: process.env.TESSDATA_PREFIX || path.join(OCR_DIR, 'tessdata'),
        },
      });
      this.process = child;
      this.buffer = '';
      this.stderrTail = '';

      const startupTimer = setTimeout(() => {
        this.stop(new Error('OCR worker did not become ready in time'));
      }, STARTUP_TIMEOUT_MS);

      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => this.onData(String(chunk), resolve, startupTimer));
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', chunk => {
        this.stderrTail = (this.stderrTail + chunk).slice(-2000);
      });
      child.on('error', error => {
        clearTimeout(startupTimer);
        reject(new Error(`OCR service could not be started: ${error.message}`));
        this.reset(error);
      });
      child.on('exit', code => {
        clearTimeout(startupTimer);
        const detail = this.stderrTail.trim().split('\n').slice(-3).join(' | ');
        const error = new Error(`OCR worker stopped (exit ${code})${detail ? `: ${detail}` : ''}`);
        reject(error);
        this.reset(error);
      });
    });
    this.starting.catch(() => undefined);
    return this.starting;
  }

  /** Loads the OCR models in the background so the first real scan is fast. Never throws. */
  warmUp() {
    this.start().catch(error => console.warn('OCR warm-up failed:', error.message));
  }

  onModuleDestroy() {
    this.stop(new Error('Server is shutting down'));
  }

  /** Runs one document through the worker. */
  run(file: string, type: string, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<any> {
    const job = this.queue.then(async () => {
      await this.start();
      return this.send(file, type, timeoutMs);
    });
    this.queue = job.catch(() => undefined);
    return job;
  }

  private send(file: string, type: string, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = this.process;
      if (!child) return reject(new Error('OCR worker is not running'));
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`OCR timed out after ${Math.round(timeoutMs / 1000)}s`));
        this.stop(new Error('OCR request timed out'));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: value => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: error => {
          clearTimeout(timer);
          reject(error);
        },
      });
      child.stdin.write(JSON.stringify({id, file, type}) + '\n');
    });
  }

  private onData(chunk: string, onReady: () => void, startupTimer: NodeJS.Timeout) {
    this.buffer += chunk;
    let newline: number;
    while ((newline = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      let message: any;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (message.ready) {
        clearTimeout(startupTimer);
        this.starting = null;
        onReady();
      } else if (message.id !== undefined) {
        const waiting = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) waiting?.reject(new Error(message.error));
        else waiting?.resolve(message.result);
      }
    }
  }

  private stop(reason: Error) {
    this.process?.kill();
    this.reset(reason);
  }

  private reset(reason: Error) {
    this.process = null;
    this.starting = null;
    for (const waiting of this.pending.values()) waiting.reject(reason);
    this.pending.clear();
  }
}
