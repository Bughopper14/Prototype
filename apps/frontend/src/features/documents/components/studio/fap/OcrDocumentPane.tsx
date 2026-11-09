/** FAP view, right pane: uploaded physical FAP and its OCR result. */
import {FapSheetPreview} from '@/features/crm/components/lazy';
import {printFapDocument} from '@/features/fap/lib/print';
import {ExternalLink, Eye, FileSpreadsheet, FileText, Loader2, RefreshCw} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function OcrDocumentPane() {
  const {
    a,
    activeFileUrl,
    activeFile,
    zoom,
    rotation,
    busy,
    fapComparison,
    rightViewMode,
    setRightViewMode,
    isFapOcrScanning,
    systemZoom,
    fapNavFilter,
    fapNavTick,
    activeFiles,
    pdfViewerSrc,
    ocrFapData,
    handleRunFapComparison,
  } = useDocumentsStudioContext();
  return (
    <div className="fap-pane-card">
      <div className="fap-pane-head">
        <div className="fap-pane-head-top">
          <div className="fap-pane-head-info">
            <h4>
              <FileSpreadsheet size={16} color="#002060" />
              OCR Physical Signed FAP
            </h4>
            <span className="fap-pane-head-sub" title={activeFile ? activeFile.fileName : ''}>
              {activeFile ? activeFile.fileName : 'No physical document uploaded yet'}
            </span>
          </div>
          <div className="fap-pane-head-actions">
            {activeFile && (
              <>
                <span
                  className="studio-file-tag"
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    fontWeight: 600,
                    height: '24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {activeFile.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}
                </span>
                {activeFileUrl && (
                  <a
                    href={activeFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button small"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      height: '26px',
                      padding: '2px 10px',
                      textDecoration: 'none',
                    }}
                    title="Open document in new tab"
                  >
                    <ExternalLink size={12} /> Open Tab
                  </a>
                )}
              </>
            )}
          </div>
        </div>
        <div className="fap-pane-head-bottom">
          {activeFile && (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <button
                type="button"
                className="button small"
                disabled={busy}
                onClick={handleRunFapComparison}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  height: '26px',
                  padding: '2px 10px',
                }}
                title="Re-scan the physical document and compare with the latest system data"
              >
                {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                Re-scan OCR
              </button>
              <div
                style={{
                  display: 'inline-flex',
                  background: '#f1f5f9',
                  padding: '2px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <button
                  type="button"
                  className={`button small ${rightViewMode === 'ocr' ? 'primary' : ''}`}
                  onClick={() => setRightViewMode('ocr')}
                  style={{fontSize: '11px', padding: '2px 10px', height: '22px', borderRadius: '4px'}}
                  title="Show OCR-extracted FAP form with difference highlights"
                >
                  <FileSpreadsheet size={12} style={{marginRight: 4}} /> OCR Form
                </button>
                <button
                  type="button"
                  className={`button small ${rightViewMode === 'pdf' ? 'primary' : ''}`}
                  onClick={() => setRightViewMode('pdf')}
                  style={{fontSize: '11px', padding: '2px 10px', height: '22px', borderRadius: '4px'}}
                  title="Show original physical PDF file"
                >
                  <Eye size={12} style={{marginRight: 4}} /> Original File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="fap-pane-body fap-pane-body-physical" style={{position: 'relative'}}>
        {isFapOcrScanning && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(3px)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <Loader2 size={38} className="spin" style={{color: '#002060'}} />
            <div style={{fontWeight: 600, color: '#002060', fontSize: '15px'}}>
              Mengekstrak Dokumen FAP dengan OCR...
            </div>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: '13px',
                maxWidth: '380px',
                lineHeight: 1.5,
              }}
            >
              Sistem sedang membaca setiap kolom teks dari dokumen PDF yang diupload. Hasil pembacaan akan
              otomatis langsung tampil di formulir ini begitu selesai.
            </p>
          </div>
        )}
        {activeFiles.length > 0 && activeFileUrl ? (
          rightViewMode === 'ocr' ? (
            <FapSheetPreview
              data={ocrFapData}
              isComparison={true}
              hideToolbar={true}
              diffSide="ocr"
              diffs={activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : []}
              externalZoom={systemZoom}
              activeSection={fapNavFilter === 'all' ? undefined : fapNavFilter}
              syncTick={fapNavTick}
              onPrint={() => printFapDocument(a.fapNumber)}
            />
          ) : activeFile?.mimeType === 'application/pdf' ? (
            <iframe
              src={pdfViewerSrc}
              title="Dokumen Fisik Signed FAP"
              style={{width: '100%', height: '100%', border: 'none', background: '#ffffff', flex: 1}}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: '16px',
                flex: 1,
              }}
            >
              <img
                src={activeFileUrl}
                alt="Dokumen Fisik Signed FAP"
                style={{
                  maxWidth: `${zoom * 100}%`,
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.2s',
                  objectFit: 'contain',
                }}
              />
            </div>
          )
        ) : (
          <div className="fap-physical-empty">
            <FileText size={48} strokeWidth={1.5} />
            <h5>No Physical File Uploaded Yet</h5>
            <p>
              Please upload the physically signed FAP form document in the upload area above to see the
              side-by-side comparison.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
