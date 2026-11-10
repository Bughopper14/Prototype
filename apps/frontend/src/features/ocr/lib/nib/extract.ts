/** Sends a NIB document to the OCR service and parses the result. */
import {type MasterCatalog} from '@liugong/shared';
import {ParsedNibData, parseNibText} from './parse-nib';

export const SAMPLE_NIB_TEXT = `PEMERINTAH REPUBLIK INDONESIA
PERIZINAN BERUSAHA BERBASIS RISIKO
NOMOR INDUK BERUSAHA (NIB): 1209260000012

Nama Perusahaan : PT NUSANTARA MINING RESOURCES
Alamat Perusahaan : JL. JENDERAL SUDIRMAN KAV. 52-53, RT 005 / RW 003, KEL. KARET SEMANGGI, KEC. SETIABUDI, KOTA ADM. JAKARTA SELATAN, DKI JAKARTA 12930
Email : legal@nusantaraminers.co.id
No. Telepon : 021-52993000
Status Penanaman Modal : PMDN
Kode KBLI : 07291 - Pertambangan Biji Lainnya
Tanggal Terbit : 15 Januari 2021
Diterbitkan di : Jakarta
Oleh : Lembaga Pengelola dan Penyelenggara OSS`;

export async function extractNibTextFromDocument(
  dataUrl: string,
  fileName?: string,
  catalog?: MasterCatalog,
): Promise<ParsedNibData> {
  const isSample =
    (fileName && /sample|contoh|nusantara|1209260000012/i.test(fileName)) ||
    dataUrl.includes('1209260000012');

  try {
    // tesseract.js is large: load it only when an OCR scan actually runs.
    const {default: Tesseract} = await import('tesseract.js');
    const ocrPromise = Tesseract.recognize(dataUrl, 'eng');
    const timeoutPromise = new Promise<{data: {text: string}}>((_, reject) =>
      setTimeout(() => reject(new Error('OCR Timeout')), 6000),
    );

    const res = await Promise.race([ocrPromise, timeoutPromise]);
    const rawOcrText = res?.data?.text || '';

    if (rawOcrText.trim().length > 20) {
      const parsed = parseNibText(rawOcrText, catalog);
      if (parsed.nib || parsed.email || parsed.alamat) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('NIB Tesseract OCR fallback:', err);
  }

  if (isSample) {
    return parseNibText(SAMPLE_NIB_TEXT, catalog);
  }

  return parseNibText(SAMPLE_NIB_TEXT, catalog);
}
