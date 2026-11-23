/** Polls the FAP OCR / comparison job of the uploaded FAP until it finishes. */
import {api} from '@/shared/lib/api';
import {useEffect} from 'react';

export function useFapOcrPolling({
  selectedCode,
  setFapComparison,
  setFapRemarks,
  setRemarksSaveStatus,
  setIsFapOcrScanning,
  activeFiles,
  activeFileId,
  isFapLocked,
  a,
}: {
  selectedCode: string;
  setFapComparison: React.Dispatch<any>;
  setFapRemarks: React.Dispatch<React.SetStateAction<string>>;
  setRemarksSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'unsaved' | 'saving' | 'saved'>>;
  setIsFapOcrScanning: React.Dispatch<React.SetStateAction<boolean>>;
  activeFiles: any;
  activeFileId?: string;
  /** The stage was submitted: the review is closed, so the comparison is read again. */
  isFapLocked?: boolean;
  a: any;
}) {
  // Load existing FAP comparison from backend on stage switch or when files change
  useEffect(() => {
    let isCancelled = false;
    let pollTimer: any = null;

    if (selectedCode === 'FAP' && activeFiles.length > 0) {
      // the comparison of the file on screen (the current file when none is chosen yet)
      const fileQuery = activeFileId ? `?fileId=${encodeURIComponent(activeFileId)}` : '';
      api(`/applications/${a.id}/fap-comparison${fileQuery}`)
        .then(res => {
          if (isCancelled) return;
          const comp = res?.comparison;
          setFapComparison(comp || null);
          if (comp?.remarks) {
            setFapRemarks(comp.remarks);
            setRemarksSaveStatus('saved');
          } else {
            setFapRemarks('');
            setRemarksSaveStatus('idle');
          }

          if (comp?.status === 'processing') {
            setIsFapOcrScanning(true);
            let attempts = 0;
            pollTimer = setInterval(async () => {
              if (isCancelled) {
                clearInterval(pollTimer);
                return;
              }
              attempts++;
              try {
                const compRes = await api(`/applications/${a.id}/fap-comparison${fileQuery}`);
                const c = compRes?.comparison;
                if (c?.status !== 'processing') {
                  clearInterval(pollTimer);
                  if (!isCancelled) {
                    setFapComparison(c || null);
                    setIsFapOcrScanning(false);
                  }
                } else if (attempts >= 45) {
                  clearInterval(pollTimer);
                  if (!isCancelled) setIsFapOcrScanning(false);
                }
              } catch {
                if (attempts >= 45) {
                  clearInterval(pollTimer);
                  if (!isCancelled) setIsFapOcrScanning(false);
                }
              }
            }, 2000);
          } else {
            setIsFapOcrScanning(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setFapComparison(null);
            setFapRemarks('');
            setRemarksSaveStatus('idle');
            setIsFapOcrScanning(false);
          }
        });
    } else {
      setFapComparison(null);
      setFapRemarks('');
      setRemarksSaveStatus('idle');
      setIsFapOcrScanning(false);
    }

    return () => {
      isCancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [selectedCode, a.id, activeFiles.length, activeFileId, isFapLocked]);
}
