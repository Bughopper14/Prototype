import {useEffect, useRef, useState} from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export interface PdfPageCanvasProps {
  url: string;
  pageNum: number;
  jumpSeq: number;
  zoom: number;
  rotation: number;
  onNumPages: (n: number) => void;
  onVisiblePageChange?: (page: number) => void;
  onError: () => void;
}

function SinglePdfPage({
  pdfDoc,
  pageNumber,
  fitWidth,
  zoom,
  rotation,
  onRegisterRef,
}: {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  fitWidth: number;
  zoom: number;
  rotation: number;
  onRegisterRef: (page: number, el: HTMLDivElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || fitWidth <= 0) return;
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    pdfDoc
      .getPage(pageNumber)
      .then(page => {
        if (cancelled || !canvasRef.current) return;
        const baseViewport = page.getViewport({scale: 1, rotation});
        const baseScale = fitWidth / baseViewport.width;
        const scale = baseScale * (zoom / 100);
        const viewport = page.getViewport({scale, rotation});
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNumber, fitWidth, zoom, rotation]);

  return (
    <div ref={el => onRegisterRef(pageNumber, el)} data-page={pageNumber} className="doc-pdf-page-wrap">
      <canvas ref={canvasRef} className="doc-pdf-canvas" />
    </div>
  );
}

export function PdfPageCanvas({
  url,
  pageNum,
  jumpSeq,
  zoom,
  rotation,
  onNumPages,
  onVisiblePageChange,
  onError,
}: PdfPageCanvasProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [fitWidth, setFitWidth] = useState(560);

  useEffect(() => {
    const parent = stackRef.current?.parentElement;
    if (!parent) return;
    const updateWidth = () => {
      const w = Math.max(280, parent.clientWidth - 40);
      setFitWidth(w);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded: pdfjsLib.PDFDocumentProxy | null = null;
    setPdfDoc(null);
    setTotalPages(0);

    const task = pdfjsLib.getDocument({url});
    task.promise
      .then(doc => {
        if (cancelled) {
          (doc as any).destroy?.();
          return;
        }
        loaded = doc;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
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
    if (jumpSeq === 0) return;
    const el = pageRefs.current[pageNum];
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [jumpSeq, pageNum]);

  useEffect(() => {
    if (!totalPages || !onVisiblePageChange) return;
    const root = stackRef.current?.parentElement;
    if (!root) return;
    const io = new IntersectionObserver(
      entries => {
        let bestPage: number | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestPage = Number((entry.target as HTMLElement).dataset.page || 0);
          }
        }
        if (bestPage && bestPage > 0) {
          onVisiblePageChange(bestPage);
        }
      },
      {root, threshold: [0.25, 0.5, 0.75]},
    );
    for (let i = 1; i <= totalPages; i++) {
      const el = pageRefs.current[i];
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [totalPages, onVisiblePageChange]);

  return (
    <div ref={stackRef} className="doc-pdf-pages-stack">
      {pdfDoc &&
        Array.from({length: totalPages}, (_, idx) => idx + 1).map(n => (
          <SinglePdfPage
            key={n}
            pdfDoc={pdfDoc}
            pageNumber={n}
            fitWidth={fitWidth}
            zoom={zoom}
            rotation={rotation}
            onRegisterRef={(pg, el) => {
              pageRefs.current[pg] = el;
            }}
          />
        ))}
    </div>
  );
}
