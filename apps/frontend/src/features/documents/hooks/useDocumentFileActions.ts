/** Preview, upload and delete stage files; save FAP remarks; approve, dismiss or re-run the FAP comparison. */
import {api} from '@/shared/lib/api';
import {STAGE} from '@/shared/master-data';

/** Document type of the signed FAP form (crm_master_document_types.code); its upload starts the OCR comparison. */
const FAP_CODE = 'FAP';

export function useDocumentFileActions({
  setActiveFileUrl,
  activeFile,
  setActiveFile,
  setZoom,
  setRotation,
  setBusy,
  setError,
  setFapComparison,
  fapRemarks,
  setRemarksSaveStatus,
  setRightViewMode,
  setIsFapOcrScanning,
  a,
  onChange,
  notify,
  onApproveDocument,
}: {
  setActiveFileUrl: React.Dispatch<React.SetStateAction<string>>;
  activeFile: any;
  setActiveFile: React.Dispatch<any>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setRotation: React.Dispatch<React.SetStateAction<number>>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setFapComparison: React.Dispatch<any>;
  fapRemarks: string;
  setRemarksSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'unsaved' | 'saving' | 'saved'>>;
  setRightViewMode: React.Dispatch<React.SetStateAction<'ocr' | 'pdf'>>;
  setIsFapOcrScanning: React.Dispatch<React.SetStateAction<boolean>>;
  a: any;
  onChange: (a: any) => void;
  notify: (s: string) => void;
  onApproveDocument: ((updatedApp?: any) => void) | undefined;
}) {
  async function previewFile(f: any) {
    try {
      const v = await api(`/files/${f.id}/url`);
      setActiveFileUrl(v.url);
      setActiveFile(f);
      setZoom(1);
      setRotation(0);
    } catch (e: any) {
      setError(e.message || 'Failed to load document preview.');
    }
  }

  async function handleFileUpload(item: any, file: File) {
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('checklistId', item.chk.id || item.code);
      body.append('documentCode', item.code);
      body.append('file', file);
      const res = await api(`/applications/${a.id}/documents/upload`, 'POST', body);
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);
      notify(`Evidence ${item.title} uploaded successfully.`);
      if (res?.fapComparison?.isFap) {
        if (res.fapComparison.status === 'processing') {
          setIsFapOcrScanning(true);
          setRightViewMode('ocr');
          notify(
            `Evidence ${item.title} uploaded successfully. Physical document OCR analysis is running in background...`,
          );
          let attempts = 0;
          const pollTimer = setInterval(async () => {
            attempts++;
            try {
              const compRes = await api(`/applications/${a.id}/fap-comparison`);
              const c = compRes?.comparison;
              if (c && c.status !== 'processing') {
                clearInterval(pollTimer);
                setIsFapOcrScanning(false);
                setFapComparison(c);
                setRightViewMode('ocr');
                if (c.hasDifferences) {
                  notify(`FAP Document OCR: ${c.diffs?.length || 0} data differences detected.`);
                } else {
                  notify('FAP Document OCR Verification: Data matches 100%, no differences detected.');
                }
              } else if (attempts >= 45) {
                clearInterval(pollTimer);
                setIsFapOcrScanning(false);
              }
            } catch {
              if (attempts >= 45) {
                clearInterval(pollTimer);
                setIsFapOcrScanning(false);
              }
            }
          }, 2000);
        } else {
          setFapComparison(res.fapComparison);
          setIsFapOcrScanning(false);
          setRightViewMode('ocr');
          if (res.fapComparison.hasDifferences) {
            notify(
              `FAP Document OCR Verification: ${res.fapComparison.diffs?.length || 0} data differences detected.`,
            );
          } else {
            notify('FAP Document OCR Verification: Data matches the system, no differences detected.');
          }
        }
      } else {
        setIsFapOcrScanning(false);
      }
      const updatedChk = (updated.documentChecks || []).find(
        (d: any) => d.documentCode === item.code,
      );
      if (updatedChk?.files?.length) {
        previewFile(updatedChk.files[updatedChk.files.length - 1]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to upload evidence: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFile(item: any, fileId: string) {
    if (!confirm('Delete this evidence file?')) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api(`/applications/${a.id}/documents/files/${fileId}`, 'DELETE');
      onChange(updated);

      const isFap = item.code === FAP_CODE;
      const updatedFap = (updated.documentChecks || []).find((d: any) => d.documentCode === FAP_CODE);
      const remainingFapFiles = updatedFap?.files?.length || 0;

      if (isFap) {
        if (remainingFapFiles === 0) {
          setFapComparison(null);
          setActiveFileUrl('');
          setActiveFile(null);
        } else {
          if (activeFile?.id === fileId) {
            const nextFile = updatedFap.files[updatedFap.files.length - 1];
            previewFile(nextFile);
          }
          try {
            const compRes = await api(`/applications/${a.id}/fap-comparison`);
            setFapComparison(compRes?.comparison || null);
          } catch {
            setFapComparison(null);
          }
        }
      } else {
        if (activeFile?.id === fileId) {
          setActiveFileUrl('');
          setActiveFile(null);
        }
      }
      notify('Evidence file deleted successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to delete evidence file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveFapRemarks() {
    setRemarksSaveStatus('saving');
    try {
      await api(`/applications/${a.id}/fap-comparison/remarks`, 'POST', {remarks: fapRemarks});
      setRemarksSaveStatus('saved');
      notify('FAP verification remarks saved successfully.');
    } catch (err: any) {
      setRemarksSaveStatus('unsaved');
      setError('Failed to save verification remarks: ' + (err.message || ''));
    }
  }

  async function handleApproveFapChanges() {
    setBusy(true);
    setError('');
    try {
      const res = await api(`/applications/${a.id}/fap-changes/approve`, 'POST', {
        remarks: fapRemarks,
      });
      const updated = res?.application || (await api(`/applications/${a.id}`));
      setFapComparison(null);
      notify('Physical FAP document approved. Customer & PIC details locked, proceeding to Pre-analysis.');
      if (onApproveDocument) {
        onApproveDocument(updated);
      } else {
        onChange({...updated, stage: STAGE.PRE_ANALYSIS});
      }
    } catch (err: any) {
      setError('Failed to approve document: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDismissFapChanges() {
    setBusy(true);
    setError('');
    try {
      await api(`/applications/${a.id}/fap-changes/dismiss`, 'POST', {
        remarks: fapRemarks,
      });
      setFapComparison(null);
      notify('Remarks saved. Staying on the current document.');
    } catch (err: any) {
      setError('Failed to dismiss data comparison: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRunFapComparison() {
    setBusy(true);
    setIsFapOcrScanning(true);
    setError('');
    try {
      const res = await api(`/applications/${a.id}/fap-comparison/run`, 'POST');
      if (res?.comparison) {
        setFapComparison(res.comparison);
        setRightViewMode('ocr');
        if (res.comparison.hasDifferences) {
          notify(`OCR scan complete: ${res.comparison.diffs?.length || 0} data differences found.`);
        } else {
          notify('OCR scan complete: Physical document data matches 100% with the system database.');
        }
      } else {
        notify('OCR scan complete.');
      }
    } catch (err: any) {
      setError('Failed to run OCR verification: ' + (err.message || ''));
    } finally {
      setBusy(false);
      setIsFapOcrScanning(false);
    }
  }

  return {
    previewFile,
    handleFileUpload,
    handleDeleteFile,
    handleSaveFapRemarks,
    handleApproveFapChanges,
    handleDismissFapChanges,
    handleRunFapComparison,
  };
}
