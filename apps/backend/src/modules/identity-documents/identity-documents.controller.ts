import {Controller, Get, Post, Res} from '@nestjs/common';
import {storedDocumentUrl} from '@liugong/shared';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {exec, one} from '../../core/db/query';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {generateDocumentStorageInfo} from '../../core/storage';
import {runOcr} from '../ocr/ocr-runner';

/* ---------- stakeholder identity documents (KTP, NPWP, passport, KITAS) ---------- */

const identityDocuments: Record<string, string[]> = {
  ktp: [
    'nik',
    'nama',
    'tempat_lahir',
    'tanggal_lahir',
    'jenis_kelamin',
    'golongan_darah',
    'alamat',
    'rt_rw',
    'kel_desa',
    'kecamatan',
    'agama',
    'status_perkawinan',
    'pekerjaan',
    'kewarganegaraan',
    'berlaku_hingga',
  ],
  npwp: [
    'npwp_number',
    'raw_npwp',
    'nama',
    'nik',
    'alamat',
    'kelurahan_kecamatan',
    'kota_provinsi',
    'kpp',
    'tanggal_terdaftar',
  ],
  passport: [
    'passport_number',
    'country_code',
    'country_name',
    'nama',
    'surname',
    'given_names',
    'nationality',
    'tanggal_lahir',
    'tempat_lahir',
    'jenis_kelamin',
    'tanggal_pengeluaran',
    'tanggal_berlaku',
    'kantor_penerbit',
    'personal_id',
  ],
  kitas: [
    'niora',
    'permit_number',
    'nama',
    'kewarganegaraan',
    'tanggal_lahir',
    'jenis_kelamin',
    'berlaku_hingga',
    'instansi_penerbit',
    'alamat',
  ],
};

async function saveIdentityDocument(
  type: string,
  stakeholderId: string,
  data: Record<string, any>,
  fileName: string | null,
  documentPath: string | null,
) {
  const columns = identityDocuments[type];
  const values = columns.map(col =>
    type === 'ktp' && col === 'berlaku_hingga' ? 'SEUMUR HIDUP' : (data[col] ?? null),
  );
  const raw = JSON.stringify(data || {});
  const existing = await one(`SELECT id FROM \`${type}\` WHERE stakeholder_id=?`, [stakeholderId]);
  if (existing) {
    await exec(
      `UPDATE \`${type}\` SET ${columns.map(c => `\`${c}\`=?`).join(',')}, file_name=COALESCE(?,file_name), document_path=COALESCE(?,document_path), raw_ocr_json=?, updated_at=NOW() WHERE stakeholder_id=?`,
      [...values, fileName, documentPath, raw, stakeholderId],
    );
  } else {
    await exec(
      `INSERT INTO \`${type}\` (id,stakeholder_id,${columns.map(c => `\`${c}\``).join(',')},file_name,document_path,raw_ocr_json,created_at,updated_at)
       VALUES (?,?,${columns.map(() => '?').join(',')},?,?,?,NOW(),NOW())`,
      [crypto.randomUUID(), stakeholderId, ...values, fileName, documentPath, raw],
    );
  }
}

@Controller(API_PREFIX)
export class IdentityDocumentsController {
  @Post('ocr/scan')
  async scan(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const file = req.file;
    if (!file) {
      res.status(400);
      return {error: 'File tidak ditemukan'};
    }
    const docType = String(req.body.doc_type || 'auto').toLowerCase();
    const stakeholderId = String(req.body.stakeholder_id || '').trim();
    const appId = String(req.body.application_id || req.body.app_id || 'APP').trim();

    const storage = await generateDocumentStorageInfo(
      docType === 'auto' ? 'ktp' : docType,
      appId,
      stakeholderId,
      file.originalname,
    );
    await fs.writeFile(storage.savedFilePath, file.buffer);

    let result;
    try {
      result = await runOcr(storage.savedFilePath, docType);
    } catch (err: any) {
      res.status(500);
      return {error: 'OCR processing error: ' + (err.message || String(err))};
    }
    if (result.type_mismatch) {
      // Wrong tab (e.g. a KITAS on the passport tab): drop the stored file and keep the data out of the tables
      await fs.unlink(storage.savedFilePath).catch(() => undefined);
      const found = String(result.type_mismatch).toUpperCase() === 'KITAS' ? 'KITAS' : 'passport';
      const expected = docType === 'kitas' ? 'KITAS' : 'passport';
      const otherTab = found === 'KITAS' ? 'KITAS' : 'Passport';
      res.status(422);
      return {
        error: `This looks like a ${found}, not a ${expected}. Please upload it in the ${otherTab} tab.`,
        code: 'WRONG_DOCUMENT_TYPE',
      };
    }
    const detectedType = String(result.doc_type || storage.docType).toLowerCase();
    Object.assign(result, {
      fileName: storage.fileName,
      file_name: storage.fileName,
      filePath: storage.relativePath,
      document_path: storage.relativePath,
      fileUrl: storage.fileUrl,
    });
    if (stakeholderId && result.data && identityDocuments[detectedType]) {
      try {
        await saveIdentityDocument(
          detectedType,
          stakeholderId,
          result.data,
          storage.fileName,
          storage.relativePath,
        );
      } catch (e) {
        console.warn('Auto save OCR metadata to DB error:', e);
      }
    }
    return result;
  }

  @Post('stakeholders/documents/save')
  async save(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const {stakeholder_id, doc_type, data} = req.body || {};
    if (!stakeholder_id) {
      res.status(400);
      return {error: 'stakeholder_id wajib diisi'};
    }
    const type = String(doc_type || 'ktp').toLowerCase();
    if (!identityDocuments[type]) {
      res.status(404);
      return {error: 'Invalid doc type'};
    }
    const fileName = data?.file_name || data?.fileName || null;
    const documentPath =
      data?.document_path || data?.filePath || (fileName ? `Documents/${type}/${fileName}` : null);
    await saveIdentityDocument(type, stakeholder_id, data || {}, fileName, documentPath);
    return {
      status: 'saved',
      stakeholder_id,
      doc_type: type,
      file_name: fileName,
      document_path: documentPath,
    };
  }

  @Get('stakeholders/documents/:docType/:stakeholderId')
  async find(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const type = req.params.docType.toLowerCase();
    if (!identityDocuments[type]) {
      res.status(404);
      return {error: 'Invalid doc type'};
    }
    const row = await one(
      `SELECT * FROM \`${type}\` WHERE stakeholder_id=? ORDER BY updated_at DESC LIMIT 1`,
      [req.params.stakeholderId],
    );
    if (!row) {
      res.status(404);
      return {status: 'not_found', data: null};
    }
    const fileName = row.file_name || (row.document_path ? path.basename(row.document_path) : null);
    const fileUrl =
      storedDocumentUrl(row.document_path) || (fileName ? `/documents/${type}/${fileName}` : null);
    return {
      status: 'success',
      data: {
        ...row,
        file_name: fileName,
        fileName,
        fileUrl,
        filePath: row.document_path,
        document_path: row.document_path,
      },
    };
  }
}
