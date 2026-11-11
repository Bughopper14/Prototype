/** Table row: LiuGong heavy equipment and trucks. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {assetSummary} from '@/features/applications/lib/asset-summary';

export function LiuGongAssetsRow() {
  const {draft, setDraft, handleTriggerFieldSync, canEdit} = useWorkspace();
  const {lgUnit, lgPct} = assetSummary(useWorkspace().draft);
  return (
    <tr style={{borderBottom: '1px solid #e2e8f0'}}>
      <td
        style={{
          padding: '8px 10px',
          textAlign: 'left',
          fontWeight: 700,
          color: '#1d4ed8',
        }}
      >
        LiuGong
      </td>
      <td style={{padding: '4px'}}>
        <input
          type="number"
          min="0"
          className="input-field"
          style={{
            width: '100%',
            textAlign: 'center',
            padding: '4px 2px',
            fontSize: '0.8rem',
          }}
          disabled={!canEdit}
          placeholder="0"
          value={draft.assetSummaryHeLiuGong ?? ''}
          onChange={e =>
            setDraft({
              ...draft,
              assetSummaryHeLiuGong: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
            })
          }
          onFocus={() => handleTriggerFieldSync('assetSummaryHeLiuGong', 'purpose-assets')}
        />
      </td>
      <td style={{padding: '4px'}}>
        <input
          type="number"
          min="0"
          className="input-field"
          style={{
            width: '100%',
            textAlign: 'center',
            padding: '4px 2px',
            fontSize: '0.8rem',
          }}
          disabled={!canEdit}
          placeholder="0"
          value={draft.assetSummaryTruckLiuGong ?? ''}
          onChange={e =>
            setDraft({
              ...draft,
              assetSummaryTruckLiuGong:
                e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
            })
          }
          onFocus={() => handleTriggerFieldSync('assetSummaryTruckLiuGong', 'purpose-assets')}
        />
      </td>
      <td
        style={{
          padding: '8px 10px',
          fontWeight: 700,
          background: '#f8fafc',
          color: '#0f172a',
        }}
      >
        {lgUnit}
      </td>
      <td
        style={{
          padding: '8px 10px',
          fontWeight: 700,
          background: '#f8fafc',
          color: '#2563eb',
        }}
      >
        {lgPct}
      </td>
    </tr>
  );
}
