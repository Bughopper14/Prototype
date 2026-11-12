/** Row mappers for application document files on crm_application_document_files. */
export const fileModel = (f: any) => ({
  id: f.id,
  checklistId: f.checklist_id,
  applicationId: f.application_id,
  versionNumber: Number(f.version_number ?? 1),
  fileName: f.file_name,
  fileKey: f.storage_key,
  storageKey: f.storage_key,
  storedPath: f.storage_path || '',
  storagePath: f.storage_path || '',
  fileSize: Number(f.file_size || 0),
  mimeType: f.mime_type,
  isCurrentActive: Boolean(f.is_current_active),
  uploadedBy: f.uploaded_by,
  uploadedAt: f.uploaded_at,
});
