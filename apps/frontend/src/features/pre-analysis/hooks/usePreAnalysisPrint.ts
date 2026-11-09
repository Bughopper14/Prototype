/** Print: the original PDF iframe or the digital-twin document in a print window. */
import type {PreAnalysisData} from '@/features/pre-analysis/lib/types';
import {useRef} from 'react';

type ViewMode = 'digital-twin' | 'original-pdf';

export function usePreAnalysisPrint({data, viewMode}: {data: PreAnalysisData; viewMode: ViewMode}) {
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (viewMode === 'original-pdf') {
      const iframe = pdfIframeRef.current;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          return;
        } catch (e) {
          console.warn('Failed to print iframe directly:', e);
        }
      }
    }

    const docElement = document.getElementById('preana-digital-twin-doc');
    if (!docElement) {
      window.print();
      return;
    }

    let printFrame = document.getElementById('preana-print-hidden-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'preana-print-hidden-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pre-Analysis - ${data.preAnalysisNo || 'Document'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              font-family: Calibri, 'Segoe UI', Arial, sans-serif !important;
              color: #000000 !important;
              font-size: 9pt;
            }
            .pre-analysis-print-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 8mm 10mm 10mm 10mm !important;
              border: none !important;
              box-shadow: none !important;
              transform: none !important;
              zoom: 1 !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid !important;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #000000 !important;
              padding: 3px 5px !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div class="pre-analysis-print-wrapper">
            ${docElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.error('Error triggering iframe print:', err);
        window.print();
      }
    }, 250);
  };

  return {pdfIframeRef, handlePrint};
}
