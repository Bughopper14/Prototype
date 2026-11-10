/** Prints the FAP sheet from its preview iframe (system or OCR side), falling back to the page. */

export function printFapDocument(_fapNumber?: string, side: 'system' | 'ocr' = 'system') {
  // 1. Look for targeted system or OCR FAP iframe
  let targetIframe: HTMLIFrameElement | null = null;

  if (side === 'ocr') {
    targetIframe = document.querySelector<HTMLIFrameElement>(
      '#excel-fap-iframe-ocr, .fap-pane-body-ocr iframe',
    );
  } else {
    targetIframe = document.querySelector<HTMLIFrameElement>(
      '#excel-fap-iframe-system, .fap-pane-body-system iframe',
    );
  }

  // Fallback to FAP Form tab preview iframe or any FAP iframe
  if (!targetIframe) {
    targetIframe = document.querySelector<HTMLIFrameElement>(
      '#excel-fap-iframe, .fap-detail-preview-col iframe, iframe[title="Application Form APPROVED"], iframe.excel-fap-iframe',
    );
  }

  if (targetIframe && targetIframe.contentWindow && targetIframe.contentDocument) {
    const iframeWin = targetIframe.contentWindow;
    const iframeDoc = targetIframe.contentDocument;
    const prevZoom = iframeDoc.body ? iframeDoc.body.style.zoom : '';

    const restoreZoom = () => {
      try {
        if (iframeDoc && iframeDoc.body) {
          iframeDoc.body.style.zoom = prevZoom || '';
        }
      } catch (e) {
        console.warn('Could not restore zoom:', e);
      }
      try {
        iframeWin.removeEventListener('afterprint', restoreZoom);
      } catch (e) {
        // ignore
      }
    };

    try {
      iframeWin.addEventListener('afterprint', restoreZoom);
      if (iframeDoc.body) {
        iframeDoc.body.style.zoom = '0.175';
      }
      iframeWin.focus();
      iframeWin.print();

      setTimeout(restoreZoom, 30000);
      return;
    } catch (err) {
      console.error('Failed to trigger iframe print:', err);
    }
  }

  // Fallback if no iframe found
  window.print();
}
