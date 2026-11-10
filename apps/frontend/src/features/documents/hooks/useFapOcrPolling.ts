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
  a,
}: {
  selectedCode: string;
  setFapComparison: React.Dispatch<any>;
  setFapRemarks: React.Dispatch<React.SetStateAction<string>>;
  setRemarksSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'unsaved' | 'saving' | 'saved'>>;
  setIsFapOcrScanning: React.Dispatch<React.SetStateAction<boolean>>;
  activeFiles: any;
  a: any;
}) {
  // Load existing FAP comparison from backend on stage switch or when files change
  useEffect(() => {
    let isCancelled = false;
    let pollTimer: any = null;

    if (selectedCode === 'FAP' && activeFiles.length > 0) {
      api(`/applications/${a.id}/fap-comparison`)
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

          if (
            comp &&
            (!comp.extractedData ||
              Object.keys(comp.extractedData).length === 0 ||
              comp.status === 'processing')
          ) {
            setIsFapOcrScanning(true);
            let attempts = 0;
            pollTimer = setInterval(async () => {
              if (isCancelled) {
                clearInterval(pollTimer);
                return;
              }
              attempts++;
              try {
                const compRes = await api(`/applications/${a.id}/fap-comparison`);
                const c = compRes?.comparison;
                if (c && c.extractedData && Object.keys(c.extractedData).length > 0) {
                  clearInterval(pollTimer);
                  if (!isCancelled) {
                    setFapComparison(c);
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
  }, [selectedCode, a.id, activeFiles.length]);
}
