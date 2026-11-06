import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {GetObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {Problem, ensure} from '../../domain';
import {requireRole, signFileToken, verifyFileToken} from '../../auth/session';
import {many, one, exec} from '../../db/query';
import {intakeDetail} from '../../db/repositories/intake';
import {
  deleteApplicationDocumentFile,
  readApplicationDocuments,
  readDocumentFile,
  saveFapComparison,
  uploadApplicationDocument,
} from '../../db/repositories/documents';
import {del, get, post} from '../router';
import {
  documentsDir,
  filesDir,
  generateDocumentStorageInfo,
  putStoredFile,
  removeStoredDocument,
  s3,
} from '../../storage';
import {logActivity} from '../activity';
import {runOcr} from '../../ocr/runner';
import {compareFapDocumentOcr, isFapChecklist} from './fap';

const DOC_ROLES = ['MKT', 'BS', 'CA', 'LEGAL', 'COMMITTEE'];
const IMAGE_SIGNATURES = {
  png: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
};

function assertValidUpload(file: {buffer: Buffer; mimetype: string}) {
  const head = file.buffer.subarray(0, 8);
  const valid =
    (file.mimetype === 'application/pdf' && head.subarray(0, 5).toString() === '%PDF-') ||
    (file.mimetype === 'image/png' && head.equals(IMAGE_SIGNATURES.png)) ||
    (file.mimetype === 'image/jpeg' && head[0] === 255 && head[1] === 216 && head[2] === 255);
  ensure(valid, 'Upload a valid PDF, PNG or JPEG file');
}

/** `<name>_<APPHASH>_<yyyymmdd_hhmm>.<ext>`: keeps the original name but makes every upload unique and traceable. */
function formattedUploadName(applicationId: string, originalname: string, mimetype: string) {
  const ext = path.extname(originalname) || (mimetype === 'application/pdf' ? '.pdf' : '.png');
  const base = path.basename(originalname, ext).replace(/_[A-Z0-9]{6}_\d{8}_\d{4}$/i, '');
  const hash = applicationId
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${base}_${hash}_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${ext}`;
}

/* ---------- document desk ---------- */

get('/document-desk', () =>
  many(`
  SELECT d.id AS checklist_id, d.application_id, d.document_code, d.document_name, d.assigned_role, d.is_mandatory, d.status,
         f.fap_registration_number AS fap_number, f.company_name,
         (SELECT COUNT(*) FROM application_document_file x WHERE x.checklist_id = d.id) AS file_count
  FROM application_document_checklist d
  JOIN all_applications a ON a.application_id = d.application_id
  JOIN new_application_fap_stage f ON f.id_fap_stage = a.id_fap_stage
  ORDER BY CASE d.status WHEN 'REJECTED' THEN 0 WHEN 'PENDING' THEN 1 WHEN 'UPLOADED' THEN 2 ELSE 3 END,
           a.created_at DESC, d.document_name`),
);

/* ---------- application documents ---------- */

post('/applications/:id/documents/upload', async (req, res) => {
  requireRole(req.actor, DOC_ROLES);
  const id = req.params.id;
  const file = req.file;
  ensure(file, 'Choose a file');
  assertValidUpload(file);
  const current = await intakeDetail(id);
  ensure(current, 'Application not found', 404);

  const fileName = formattedUploadName(id, file.originalname, file.mimetype);
  const result = await uploadApplicationDocument(
    id,
    String(req.body.checklistId),
    {...file, originalname: fileName},
    req.actor.id,
    async key => {
      await putStoredFile(key, file.buffer, file.mimetype);
      if (!s3) {
        await fs.mkdir(documentsDir, {recursive: true});
        await fs.writeFile(path.join(documentsDir, fileName), file.buffer).catch(() => {});
      }
    },
  );
  await logActivity(req.actor, id, current.status, current.status, `Document uploaded: ${fileName}`);

  let fapComparison: unknown = null;
  if (
    String(req.body.checklistId || '')
      .toUpperCase()
      .includes('FAP') ||
    String(req.body.documentCode || '').toUpperCase() === 'FAP'
  ) {
    // Give the OCR comparison a few seconds, otherwise let it finish in the background.
    fapComparison = await Promise.race([
      compareFapDocumentOcr(id, fileName, current),
      new Promise(resolve => setTimeout(() => resolve({isFap: true, status: 'processing', diffs: []}), 6000)),
    ]).catch(() => ({isFap: true, status: 'processing', diffs: []}));
  }
  res.status(201);
  return {...result, fileName, fapComparison};
});

del(['/applications/:id/documents/files/:fileId', '/applications/:id/documents/:fileId'], async req => {
  requireRole(req.actor, DOC_ROLES);
  const {id, fileId} = req.params;
  const current = await intakeDetail(id);
  ensure(current, 'Application not found', 404);
  await deleteApplicationDocumentFile(id, fileId, removeStoredDocument);
  const fap = (await readApplicationDocuments(id)).find(isFapChecklist);
  if (!fap?.files?.length) await saveFapComparison(id, null);
  await logActivity(req.actor, id, current.status, current.status, 'Document file deleted');
  return intakeDetail(id);
});

/* ---------- file access (signed, short-lived links) ---------- */

get('/files/:id/url', async req => {
  const file = await readDocumentFile(req.params.id);
  ensure(file, 'File not found', 404);
  const url = s3
    ? await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: file.fileKey,
          ResponseContentDisposition: 'inline',
        }),
        {expiresIn: 900},
      )
    : `/api/v1/files/${file.id}/content?token=${signFileToken(file.id, req.actor.id)}`;
  return {url, expiresIn: 900};
});

get('/files/:id/content', async (req, res) => {
  let token;
  try {
    token = verifyFileToken(String(req.query.token));
  } catch {
    throw new Problem(403, 'Document link has expired');
  }
  ensure(token.fileId === req.params.id && token.userId === req.actor.id, 'Invalid document link', 403);
  const file = await readDocumentFile(req.params.id);
  ensure(file, 'File not found', 404);
  res
    .setHeader('Content-Type', file.mimeType)
    .setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  return res.send(await fs.readFile(path.join(filesDir, file.fileKey)));
});

/* ---------- identity-document OCR ---------- */

post('/ocr/scan', async (req, res) => {
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
});

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

post('/stakeholders/documents/save', async (req, res) => {
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
  return {status: 'saved', stakeholder_id, doc_type: type, file_name: fileName, document_path: documentPath};
});

get('/stakeholders/documents/:docType/:stakeholderId', async (req, res) => {
  const type = req.params.docType.toLowerCase();
  if (!identityDocuments[type]) {
    res.status(404);
    return {error: 'Invalid doc type'};
  }
  const row = await one(`SELECT * FROM \`${type}\` WHERE stakeholder_id=? ORDER BY updated_at DESC LIMIT 1`, [
    req.params.stakeholderId,
  ]);
  if (!row) {
    res.status(404);
    return {status: 'not_found', data: null};
  }
  const fileName = row.file_name || (row.document_path ? path.basename(row.document_path) : null);
  const fileUrl = row.document_path
    ? row.document_path.startsWith('/')
      ? row.document_path
      : `/${row.document_path.replace(/\\/g, '/')}`
    : fileName
      ? `/documents/${type}/${fileName}`
      : null;
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
});
