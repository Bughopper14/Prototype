/** The FAP form as the original spreadsheet look: a ribbon plus the document in an iframe, filled live from the data. */
import {useEffect, useMemo, useRef} from 'react';
import {useSheetHighlight} from '@/features/fap/hooks/useSheetHighlight';
import {useSheetZoom} from '@/features/fap/hooks/useSheetZoom';
import {SheetRibbon} from '@/features/fap/components/sheet/SheetRibbon';
import {buildSheetValues} from '@/features/fap/lib/sheet/sheet-values';
import {syncIframeValues} from '@/features/fap/lib/sheet/sync-iframe';
import {FAP_EXCEL_HTML_TEMPLATE} from '@/features/fap/lib/template';
import {useMasterData} from '@/shared/master-data';
import {printFapDocument} from '@/features/fap/lib/print';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';

export function FapSheetPreview(props: FapSheetPreviewProps) {
  const master = useMasterData();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {zoomLevel, handleZoomOut, handleZoomIn, handleResetZoom} = useSheetZoom(
    containerRef,
    props.externalZoom,
  );

  // Compute normalized values from props
  const d = useMemo(
    () => buildSheetValues(props, master),
    [
      props.data,
      props.application,
      props.customer,
      props.profile,
      props.pic,
      props.stakeholders,
      props.projects,
      master,
    ],
  );
  const runSync = () => syncIframeValues({iframe: iframeRef.current, d, props, zoomLevel, master});

  useEffect(() => {
    runSync();
    const timer = setTimeout(runSync, 150);
    return () => clearTimeout(timer);
  }, [d, zoomLevel, props.diffs]);

  useSheetHighlight(iframeRef, props);

  const handlePrint = () => {
    if (props.onPrint) {
      props.onPrint();
      return;
    }
    printFapDocument(props.application?.fapNumber || props.data?.fapNumber, props.diffSide || 'system');
  };

  return (
    <div
      className="excel-fap-viewer"
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: '#f1f5f9',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
      }}
    >
      {!props.hideToolbar && (
        <SheetRibbon
          zoomLevel={zoomLevel}
          onZoomOut={handleZoomOut}
          onZoomIn={handleZoomIn}
          onResetZoom={handleResetZoom}
          onPrint={handlePrint}
          activeSection={props.activeSection}
          onSectionClick={props.onSectionClick}
        />
      )}

      {/* Embedded Native HTML Template Frame */}
      <div
        style={{
          flex: 1,
          width: '100%',
          height: props.hideToolbar ? '100%' : 'calc(100% - 40px)',
          background: '#525659',
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          id={props.diffSide ? `excel-fap-iframe-${props.diffSide}` : 'excel-fap-iframe'}
          className={`excel-fap-iframe ${props.diffSide ? `excel-fap-iframe-${props.diffSide}` : ''}`}
          srcDoc={FAP_EXCEL_HTML_TEMPLATE}
          title="Application Form APPROVED"
          onLoad={runSync}
          style={{width: '100%', height: '100%', border: 'none', background: '#525659', display: 'block'}}
        />
      </div>
    </div>
  );
}

export default FapSheetPreview;
