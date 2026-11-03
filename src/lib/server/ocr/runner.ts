import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);
const OCR_DIR = path.resolve('services/ocr');

function pythonExecutable() {
  if (process.env.PYTHON_PATH?.trim()) return process.env.PYTHON_PATH.trim();
  const venv =
    process.platform === 'win32'
      ? path.join(OCR_DIR, '.venv', 'Scripts', 'python.exe')
      : path.join(OCR_DIR, '.venv', 'bin', 'python');
  return existsSync(venv) ? venv : 'python';
}

/** Runs services/ocr/ocr_cli.py once for this file. */
export async function runOcr(filePath: string, docType: string, timeoutMs = 45_000) {
  const {stdout} = await execFileAsync(
    pythonExecutable(),
    [path.join(OCR_DIR, 'ocr_cli.py'), filePath, docType],
    {
      timeout: timeoutMs,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        TESSDATA_PREFIX: process.env.TESSDATA_PREFIX || path.join(OCR_DIR, 'tessdata'),
      },
    },
  );
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  const result =
    start !== -1 && end !== -1 ? JSON.parse(stdout.slice(start, end + 1)) : JSON.parse(stdout.trim());
  if (result.error) throw new Error(result.error);
  return result;
}
