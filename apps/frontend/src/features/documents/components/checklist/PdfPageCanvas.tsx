import {useEffect, useRef, useState} from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export interface PdfPageCanvasProps {
  url: string;
  pageNum: number;
  zoom: number;
  rotation: number;
  onNumPages: (n: number) => void;
  onError: () => void;
}

export function PdfPageCanvas({url, pageNum, zoom, rotation, onNumPages, onError}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded: pdfjsLib.PDFDocumentProxy | null = null;
    setPdfDoc(null);

    const task = pdfjsLib.getDocument({url});
    task.promise
      .then(doc => {
        if (cancelled) {
          (doc as any).destroy?.();
          return;
        }
        loaded = doc;
        setPdfDoc(doc);
        onNumPages(doc.numPages);
      })
      .catch(() => {
        if (!cancelled) onError();
      });

    return () => {
      cancelled = true;
      task.destroy().catch(() => {});
      (loaded as any)?.destroy?.().catch?.(() => {});
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;
    setRendering(true);

    const safePage = Math.max(1, Math.min(pageNum, pdfDoc.numPages));
    pdfDoc
      .getPage(safePage)
      .then(page => {
        if (cancelled || !canvasRef.current) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (zoom / 100) * 1.25;
        const viewport = page.getViewport({scale, rotation});
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderTask = page.render({canvasContext: ctx, viewport, canvas});
        return renderTask.promise;
      })
      .catch(() => {
        // ignore cancelled render errors
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNum, zoom, rotation]);

  return (
    <div className="doc-pdf-page-wrap">
      <canvas ref={canvasRef} className="doc-pdf-canvas" style={{opacity: rendering ? 0.65 : 1}} />
    </div>
  );
}
