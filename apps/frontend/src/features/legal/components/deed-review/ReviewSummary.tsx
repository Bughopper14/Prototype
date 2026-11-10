/** Key facts of the deed under review. */
import type {useMasterData} from '@/shared/master-data';

export function ReviewSummary({deed, master}: {deed: any; master: ReturnType<typeof useMasterData>}) {
  return (
    <dl className="deed-review-summary">
      <div>
        <dt>Deed type</dt>
        <dd>{deed.type === 'amendment' ? 'Amendment deed' : 'Establishment deed'}</dd>
      </div>
      <div>
        <dt>Deed date</dt>
        <dd>{deed.deedDate}</dd>
      </div>
      <div>
        <dt>Ministerial Decree number</dt>
        <dd>{deed.ministerialDecreeNumber || '—'}</dd>
      </div>
      <div>
        <dt>Ministerial Decree date</dt>
        <dd>{deed.ministerialDecreeDate || '—'}</dd>
      </div>
      {deed.type === 'amendment' && (
        <div>
          <dt>Remarks category</dt>
          <dd>
            {(Array.isArray(deed.remarkCategoryIds) && deed.remarkCategoryIds.length
              ? deed.remarkCategoryIds
              : [deed.remarkCategoryId].filter(Boolean)
            )
              .map(
                (id: string) =>
                  master.remarkCategoryId.find(x => x.value === id)?.name ||
                  (id === 'establishment-deed' ? 'Establishment deed' : id),
              )
              .join(', ') || '—'}
          </dd>
        </div>
      )}
      {deed.remarks && (
        <div>
          <dt>Remarks</dt>
          <dd>{deed.remarks}</dd>
        </div>
      )}
    </dl>
  );
}
