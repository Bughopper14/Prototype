/** Orchestrates the 5 states of Redesign 2 for the Documents tab (FAP view). */
import {useEffect, useMemo, useState} from 'react';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';
import {buildComparisonRows} from '@/features/documents/lib/fap-comparison-rows';
import {FapComparisonTableView} from './FapComparisonTableView';
import {FapEmptyUploadView} from './FapEmptyUploadView';
import {FapFileHeaderCard} from './FapFileHeaderCard';
import {FapFocusDocumentView} from './FapFocusDocumentView';
import {FapSideBySideView} from './FapSideBySideView';

export function FapRedesignView({onOpenChecklist}: {onOpenChecklist?: () => void}) {
  const {a, activeFiles, fapComparison, liveFapData, ocrFapData} = useDocumentsStudioContext();
  const [viewMode, setViewMode] = useState<'comparison' | 'side-by-side'>('comparison');
  const [statusFilter, setStatusFilter] = useState<'all' | 'diff' | 'match'>('diff');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Reset sub-view when switching applications
  useEffect(() => {
    setViewMode('comparison');
    setStatusFilter('diff');
    setSectionFilter('all');
    setFocusedField(null);
  }, [a.id]);

  const rows = useMemo(
    () => buildComparisonRows(fapComparison, liveFapData, ocrFapData),
    [fapComparison, liveFapData, ocrFapData],
  );

  // If there are 0 diffs, automatically default filter to 'all' so user sees matched rows
  useEffect(() => {
    if (fapComparison && rows.length > 0 && rows.every(r => r.status === 'match') && statusFilter === 'diff') {
      setStatusFilter('all');
    }
  }, [fapComparison, rows.length]);

  if (activeFiles.length === 0) {
    return <FapEmptyUploadView onOpenChecklist={onOpenChecklist} />;
  }

  const focusList =
    statusFilter === 'diff'
      ? rows.filter(r => r.status !== 'match')
      : statusFilter === 'match'
        ? rows.filter(r => r.status === 'match')
        : rows;

  return (
    <div className="fap-r2-wrap">
      <FapFileHeaderCard />

      {focusedField ? (
        <FapFocusDocumentView
          rows={focusList.length ? focusList : rows}
          focusedField={focusedField}
          onSelectField={setFocusedField}
          onBack={() => setFocusedField(null)}
        />
      ) : viewMode === 'comparison' ? (
        <FapComparisonTableView
          rows={rows}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sectionFilter={sectionFilter}
          setSectionFilter={setSectionFilter}
          onSelectRow={row => setFocusedField(row.field)}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      ) : (
        <FapSideBySideView viewMode={viewMode} setViewMode={setViewMode} />
      )}
    </div>
  );
}
