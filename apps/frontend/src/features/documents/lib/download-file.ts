import {api} from '@/shared/lib/api';

/** Saves an uploaded file: asks the API for a short-lived download link and opens it. */
export async function downloadFile(fileId: string) {
  const {url} = await api(`/files/${fileId}/url?download=1`);
  window.location.assign(url);
}
