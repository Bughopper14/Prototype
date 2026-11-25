import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Injectable, type OnModuleDestroy} from '@nestjs/common';

/**
 * Client for the Python OCR workers (apps/backend/ocr/ocr_worker.py).
 *
 * Loading the OCR models takes a long time, so the worker processes are started once (warmUp, or the first use) and then reused. A worker
 * handles one document at a time, so several processes run side by side (a pool of OCR_WORKERS, default 2) and every request goes to the least
 * busy one. When more than OCR_MAX_QUEUE requests are already waiting, a new one is refused with OcrBusyError (503) instead of waiting for minutes.
 * A request that exceeds its timeout kills its worker only; it is started again on the next call.
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

const POOL_SIZE = Math.max(1, Math.floor(Number(process.env.OCR_WORKERS) || 2));
const MAX_QUEUE = Math.max(0, Math.floor(Number(process.env.OCR_MAX_QUEUE) || 20));
/** Threads per worker: the cores are shared by the pool (logical cores count half, they are hyper-threads), at least 1. */
const OCR_THREADS = Math.max(1, Math.floor(Number(process.env.OCR_THREADS) || os.cpus().length / 2 / POOL_SIZE));
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

type Source = {file: string} | {name: string; data: string};

/** The pool is full: more requests wait than OCR_MAX_QUEUE. */
export class OcrBusyError extends Error {
  constructor() {
    super('OCR is busy right now. Try again in a moment.');
  }
}

/** One Python worker process with its own queue (it reads one document at a time). */
class OcrWorker {
  /** Requests queued or running on this worker. */
  load = 0;
  /** Threads the Python process says it was given (OCR_THREADS), known once it is ready. */
  threads: number | null = null;
  private process: ChildProcessWithoutNullStreams | null = null;
  private starting: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 1;
  private buffer = '';
  private stderrTail = '';

  get pid() {
    return this.process?.pid ?? null;
  }

  get ready() {
    return !!this.process && !this.starting;
  }

  /** Starts the worker if it is not running and resolves once the models are loaded. */
  start(): Promise<void> {
    if (this.process && !this.starting) return Promise.resolve();
    if (this.starting) return this.starting;

    this.starting = new Promise<void>((resolve, reject) => {
      const child = spawn(pythonExecutable(), [path.join(OCR_DIR, 'ocr_worker.py')], {
        cwd: OCR_DIR,
        env: {
          ...process.env,
          OCR_THREADS: String(OCR_THREADS),
          OMP_THREAD_LIMIT: String(OCR_THREADS),
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

  /** Queues one request on this worker. */
  enqueue(source: Source, type: string, timeoutMs: number): Promise<any> {
    this.load++;
    const job = this.queue.then(async () => {
      await this.start();
      return this.send(source, type, timeoutMs);
    });
    this.queue = job.catch(() => undefined);
    return job.finally(() => {
      this.load--;
    });
  }

  private send(source: Source, type: string, timeoutMs: number): Promise<any> {
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
      child.stdin.write(JSON.stringify({id, ...source, type}) + '\n');
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
        this.threads = Number.isFinite(message.threads) ? Number(message.threads) : null;
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

  stop(reason: Error) {
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

@Injectable()
export class OcrWorkerService implements OnModuleDestroy {
  private readonly workers = Array.from({length: POOL_SIZE}, () => new OcrWorker());

  /** Loads the OCR models of every worker in the background so the first real scans are fast. Never throws. */
  warmUp() {
    for (const worker of this.workers) worker.start().catch(error => console.warn('OCR warm-up failed:', error.message));
  }

  onModuleDestroy() {
    for (const worker of this.workers) worker.stop(new Error('Server is shutting down'));
  }

  /** The pool as it runs: the settings that came from the environment and what each worker reports. */
  status() {
    return {
      workers: POOL_SIZE,
      threadsPerWorker: OCR_THREADS,
      maxQueue: MAX_QUEUE,
      pool: this.workers.map((w, index) => ({index, ready: w.ready, pid: w.pid, threads: w.threads, load: w.load})),
    };
  }

  /** Runs one stored document (a path) through a worker. */
  run(file: string, type: string, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<any> {
    return this.dispatch({file}, type, timeoutMs);
  }

  /** Runs a document that is only in memory (an upload being scanned): nothing is written to disk. */
  runBuffer(name: string, body: Buffer, type: string, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<any> {
    return this.dispatch({name, data: body.toString('base64')}, type, timeoutMs);
  }

  private dispatch(source: Source, type: string, timeoutMs: number): Promise<any> {
    const waiting = this.workers.reduce((n, w) => n + Math.max(0, w.load - 1), 0);
    if (waiting >= MAX_QUEUE) return Promise.reject(new OcrBusyError());
    const worker = this.workers.reduce((best, w) => (w.load < best.load ? w : best));
    return worker.enqueue(source, type, timeoutMs);
  }
}
