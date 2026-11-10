/** Printing the official FAP sheet: the Ctrl+P hotkey and the print button (which saves first). */
import {useEffect} from 'react';
import {printFapDocument} from '@/features/fap/lib/print';

export function usePrintFap({
  a,
  draft,
  tab,
  notify,
  setBusy,
  save,
}: {
  a: any;
  draft: any;
  tab: number;
  notify: (s: string) => void;
  setBusy: (v: boolean) => void;
  save: () => Promise<unknown>;
}) {
  // Ctrl+P / Cmd+P on the FAP form or documents prints the official FAP sheet, not the web page
  useEffect(() => {
    const handlePrintHotkey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && (tab === 0 || tab === 6)) {
        e.preventDefault();
        printFapDocument(a?.fapNumber || draft?.fapNumber, 'system');
      }
    };
    window.addEventListener('keydown', handlePrintHotkey);
    return () => window.removeEventListener('keydown', handlePrintHotkey);
  }, [tab, a?.fapNumber, draft?.fapNumber]);

  const handlePrintFap = async () => {
    if (draft.isNew) {
      notify('Please save the new application before printing the FAP document.');
      return;
    }
    setBusy(true);
    try {
      await save();
      notify('All FAP data saved to database. Opening print form...');
      printFapDocument(a.fapNumber || draft.fapNumber);
    } catch (err: any) {
      console.error('Auto-save before print error:', err);
      notify('Failed to save data to database before printing: ' + (err.message || ''));
    } finally {
      setBusy(false);
    }
  };

  return {handlePrintFap};
}
