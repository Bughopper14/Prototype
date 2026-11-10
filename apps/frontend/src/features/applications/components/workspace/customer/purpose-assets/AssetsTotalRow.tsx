/** Table row: totals and percentages. */
import {assetSummary} from '@/features/applications/lib/asset-summary';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

export function AssetsTotalRow() {
  const {totHe, totTruck, totUnit, totPct} = assetSummary(useWorkspace().draft);
  return (
    <tr style={{background: '#f1f5f9', fontWeight: 800, borderTop: '1.5pt solid #cbd5e1'}}>
      <td style={{padding: '8px 10px', textAlign: 'left', color: '#0f172a'}}>Total</td>
      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totHe}</td>
      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totTruck}</td>
      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totUnit}</td>
      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totPct}</td>
    </tr>
  );
}
