/** Which view the screen shows (digital twin or original PDF), the zoom, and which form sections are open. */
import {useRef, useState, useEffect} from 'react';

export function usePreAnalysisView() {
  const isInitialMountRef = useRef(true);

  const [viewMode, setViewMode] = useState<'digital-twin' | 'original-pdf'>('digital-twin');

  const [zoomLevel, setZoomLevel] = useState<number>(0.75);

  // Accordion section toggles - All 7 sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: true,
    sec3: true,
    sec4: true,
    sec5: true,
    sec6: true,
    sec7: true,
  });

  // Fetch saved pre-analysis data from server
  useEffect(() => {
    // Keep both left form and right preview at the top on initial open
    const resetScroll = () => {
      const formCol = document.querySelector('.fap-detail-form-col');
      if (formCol) formCol.scrollTop = 0;
      const canvasCol = document.querySelector('.pre-analysis-canvas');
      if (canvasCol) {
        canvasCol.scrollTop = 0;
        canvasCol.scrollLeft = 0;
      }
    };
    resetScroll();
    const t1 = setTimeout(resetScroll, 100);
    const t2 = setTimeout(resetScroll, 400);
    const t3 = setTimeout(() => {
      resetScroll();
      isInitialMountRef.current = false;
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return {isInitialMountRef, setViewMode, viewMode, setZoomLevel, zoomLevel, openSections, setOpenSections};
}

export type PreAnalysisViewState = ReturnType<typeof usePreAnalysisView>;
