/** Shape of a stored document file. */

export const fileModel = (f: any) => ({
  id: f.id,
  checklistId: f.checklist_id,
  fileName: f.file_name,
  fileKey: f.file_key,
  fileSize: Number(f.file_size),
  mimeType: f.mime_type,
  uploadedBy: f.uploaded_by,
  createdAt: f.created_at,
});
