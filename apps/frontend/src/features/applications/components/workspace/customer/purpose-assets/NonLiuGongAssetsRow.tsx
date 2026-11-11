/** Table row: non-LiuGong heavy equipment and trucks. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {assetSummary} from '@/features/applications/lib/asset-summary';

export function NonLiuGongAssetsRow() {
  const {draft, setDraft, handleTriggerFieldSync, canEdit} = useWorkspace();
  const {nlgUnit, nlgPct} = assetSummary(useWorkspace().draft);
  return (
    <tr style={{borderBottom: '1px solid #e2e8f0'}}>
      <td
        style={{
          padding: '8px 10px',
          textAlign: 'left',
          fontWeight: 700,
          color: '#475569',
        }}
      >
        Non LiuGong
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
          value={draft.assetSummaryHeNonLiuGong ?? ''}
          onChange={e =>
            setDraft({
              ...draft,
              assetSummaryHeNonLiuGong:
                e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
            })
          }
          onFocus={() => handleTriggerFieldSync('assetSummaryHeNonLiuGong', 'purpose-assets')}
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
          value={draft.assetSummaryTruckNonLiuGong ?? ''}
          onChange={e =>
            setDraft({
              ...draft,
              assetSummaryTruckNonLiuGong:
                e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
            })
          }
          onFocus={() => handleTriggerFieldSync('assetSummaryTruckNonLiuGong', 'purpose-assets')}
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
        {nlgUnit}
      </td>
      <td
        style={{
          padding: '8px 10px',
          fontWeight: 700,
          background: '#f8fafc',
          color: '#64748b',
        }}
      >
        {nlgPct}
      </td>
    </tr>
  );
}
