import {API_BASE} from '@/shared/lib/api';

/** Downloads every file of an application's Document Checklist as one ZIP (the server builds it). */
export async function downloadChecklistZip(applicationId: string) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/applications/${encodeURIComponent(applicationId)}/documents/zip`, {
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('Unable to connect to server. Please try again.');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
    let message = 'Failed to download ZIP.';
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {
      /* the body was not JSON */
    }
    throw new Error(message);
  }
  const disposition = response.headers.get('Content-Disposition') || '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const fileName = encoded ? decodeURIComponent(encoded) : 'Documents.zip';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName;
}
