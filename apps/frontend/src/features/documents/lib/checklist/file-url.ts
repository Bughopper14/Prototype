/** The URL of a stored checklist file: its storage path (`<application number>/<file name>`) under /documents. */
export const storedFileUrl = (file?: {storagePath?: string | null} | null) => (file?.storagePath ? `/documents/${file.storagePath}` : '');
