/** Zoom of the sheet: follows the width of the viewer unless an external zoom is given. */
import {useEffect, useState, type RefObject} from 'react';

export function useSheetZoom(containerRef: RefObject<HTMLDivElement | null>, externalZoom?: number) {
  const [zoomLevel, setZoomLevel] = useState<number>(0.15);

  useEffect(() => {
    if (externalZoom !== undefined && externalZoom > 0) {
      setZoomLevel(externalZoom);
    }
  }, [externalZoom]);

  useEffect(() => {
    if (!containerRef.current || (externalZoom !== undefined && externalZoom > 0)) return;
    const updateWidth = () => {
      if (containerRef.current && (!externalZoom || externalZoom <= 0)) {
        const w = containerRef.current.clientWidth;
        const targetZoom = Math.min(0.5, Math.max(0.08, Number(((w - 40) / 4410).toFixed(2))));
        setZoomLevel(targetZoom);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [externalZoom]);

  const handleZoomOut = () => setZoomLevel(z => Math.max(0.05, Number((z - 0.05).toFixed(2))));
  const handleZoomIn = () => setZoomLevel(z => Math.min(1.5, Number((z + 0.05).toFixed(2))));
  const handleResetZoom = () => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const targetZoom = Math.min(0.5, Math.max(0.08, Number(((w - 40) / 4410).toFixed(2))));
      setZoomLevel(targetZoom);
    } else {
      setZoomLevel(0.15);
    }
  };

  return {zoomLevel, handleZoomOut, handleZoomIn, handleResetZoom};
}
