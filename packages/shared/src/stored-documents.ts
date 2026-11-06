/**
 * Browser URL of a file kept in the backend's storage/documents folder.
 *
 * The database stores paths as `Documents/<type>/<file>` (capital D, sometimes with backslashes), while the backend
 * serves them under `/documents/...` and the frontend proxy only forwards that lowercase prefix:
 *   "Documents/ktp/a.jpg", "\\Documents\\ktp\\a.jpg", "/documents/ktp/a.jpg" → "/documents/ktp/a.jpg".
 * Absolute URLs (http, blob, data) are returned unchanged.
 */
export function storedDocumentUrl(documentPath?: string | null): string | null {
  if (!documentPath) return null;
  const value = String(documentPath).replace(/\\/g, '/');
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  const relative = value.replace(/^\/+/, '');
  if (/^documents\//i.test(relative)) return `/documents/${relative.slice('documents/'.length)}`;
  return value.startsWith('/') ? value : `/${value}`;
}
