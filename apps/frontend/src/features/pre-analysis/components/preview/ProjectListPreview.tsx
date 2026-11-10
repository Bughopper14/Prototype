/** Project lists and the investment plan as they appear in the live document. */
import {ensureProjectGroups} from '@/features/pre-analysis/lib/projects';
import type {PreAnalysisData} from '@/features/pre-analysis/lib/types';
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';

export function renderProjectGroupListPreview(groupsOrItems?: any, fallbackHeadName: string = '') {
  const groups = ensureProjectGroups(groupsOrItems, undefined, fallbackHeadName);

  const validGroups = groups.filter(g => {
    const hasHead = Boolean(g.headName?.trim());
    const hasValidProjects = (g.projects || []).some(
      p => p && (p.projectName?.trim() || p.location?.trim() || p.scope?.trim()),
    );
    return hasHead || hasValidProjects;
  });

  if (!validGroups.length) return <span>-</span>;

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
      {validGroups.map((g, gIdx) => {
        const letter = String.fromCharCode(65 + gIdx);
        const validProjects = (g.projects || []).filter(
          p => p && (p.projectName?.trim() || p.location?.trim() || p.scope?.trim()),
        );
        const showHeadName = Boolean(g.headName?.trim()) || validGroups.length > 1;
        const headLabel = g.headName?.trim() || `Head Project ${letter}`;

        return (
          <div key={g.id || gIdx} style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
            {showHeadName && (
              <div style={{fontWeight: 700, fontSize: '0.72rem', color: '#0f172a', lineHeight: 1.4}}>
                {letter}. {headLabel}
              </div>
            )}
            <div
              style={{
                paddingLeft: showHeadName ? '12px' : '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {validProjects.map((p, pIdx) => {
                const parts = [p.projectName, p.location, p.scope].filter(Boolean);
                return (
                  <div key={p.id || pIdx} style={{lineHeight: 1.4, fontSize: '0.7rem'}}>
                    {validProjects.length > 1 ? `${pIdx + 1}. ` : ''}
                    {parts.join(' - ')}
                  </div>
                );
              })}
              {validProjects.length === 0 && (
                <div style={{fontStyle: 'italic', color: '#94a3b8', fontSize: '0.68rem'}}>
                  (No project items listed)
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function renderInvestmentPlanPreview(d: PreAnalysisData) {
  const selected = d.investmentPlanSelected || [];
  const remarksMap = d.investmentPlanRemarks || {};
  if (selected.length === 0) {
    if (d.investmentPlan && typeof d.investmentPlan === 'string' && d.investmentPlan.trim()) {
      return renderRichHtml(d.investmentPlan);
    }
    return <span>-</span>;
  }
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '3px'}}>
      {selected.map(optCode => {
        const rem = remarksMap[optCode] || '';
        return (
          <div key={optCode} style={{lineHeight: 1.4}}>
            <span style={{fontWeight: 600}}>{optCode}</span>
            {rem ? ' - ' + rem : ''}
          </div>
        );
      })}
    </div>
  );
}
