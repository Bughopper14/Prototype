/** One table of deeds (the active ones or the history) with its empty message. */
import {DeedRow} from '@/features/legal/components/legal-editor/DeedRow';

export function DeedTable({list, isHistory, emptyMsg}: {list: any[]; isHistory: boolean; emptyMsg: string}) {
  if (!list.length) {
    return (
      <div className={`table-scroll legal-table-wrap ${isHistory ? 'legal-table-history' : ''}`}>
        <div className="empty-small" style={{padding: '24px 20px', color: '#64748b', textAlign: 'center'}}>
          {emptyMsg}
        </div>
      </div>
    );
  }
  return (
    <div className={`table-scroll legal-table-wrap ${isHistory ? 'legal-table-history' : ''}`}>
      <table className="data-table legal-deed-table">
        <thead>
          <tr>
            <th>DEED</th>
            <th>DATE</th>
            <th>STATUS</th>
            <th>VALID UNTIL</th>
            <th>MINISTERIAL DECREE</th>
            <th>REMARKS CATEGORIES</th>
            <th>STAKEHOLDERS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {list.map((x: any) => (
            <DeedRow key={x.id} deed={x} isHistory={isHistory} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
