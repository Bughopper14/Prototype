/** Table of mandatory-field rules with per-row toggle and edit buttons. */
import {resolveRuleSection} from '@/shared/master-data';
import {Check, Pencil, X} from 'lucide-react';
import {isPreStage} from '../../lib/mandatory-rules';
import {MandatoryStatusBadge, SectionBadge, StageBadge} from './MandatoryBadges';

type Rule = Record<string, any>;

export function MandatoryRulesTable({
  rules,
  canManage,
  busyId,
  onToggle,
  onEdit,
}: {
  rules: Rule[];
  canManage: boolean;
  busyId: number | null;
  onToggle: (rule: Rule) => void;
  onEdit: (rule: Rule) => void;
}) {
  return (
    <div className="table-scroll">
      <table
        className="data-table master-table"
        style={{width: '100%', minWidth: 1040, borderCollapse: 'collapse', tableLayout: 'auto'}}
      >
        <thead>
          <tr style={{borderBottom: '2px solid #e2e8f0', background: '#f8fafc'}}>
            <th style={{width: 45, textAlign: 'center', padding: '12px 8px'}}>NO</th>
            <th style={{width: 140, textAlign: 'center', padding: '12px 10px'}}>STAGE</th>
            <th style={{width: 260, minWidth: 260, textAlign: 'left', padding: '12px 14px'}}>SECTION</th>
            <th style={{minWidth: 220, textAlign: 'left', padding: '12px 14px'}}>FIELD LABEL</th>
            <th style={{width: 190, minWidth: 190, textAlign: 'left', padding: '12px 14px'}}>FIELD KEY</th>
            <th style={{textAlign: 'center', width: 150, padding: '12px 14px'}}>MANDATORY STATUS</th>
            {canManage && <th style={{textAlign: 'center', width: 190, padding: '12px 14px'}}>ACTION</th>}
          </tr>
        </thead>
        <tbody>
          {rules.map((x, idx) => {
            const rStage = (x.stage || 'FAP').toUpperCase();
            const busy = busyId === x.id;
            return (
              <tr key={x.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                <td style={{textAlign: 'center', color: '#94a3b8', fontSize: 11, padding: '12px 8px'}}>
                  {idx + 1}
                </td>
                <td
                  style={{
                    textAlign: 'center',
                    padding: '12px 10px',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <StageBadge isPre={isPreStage(rStage)} />
                </td>
                <td style={{width: 260, minWidth: 260, padding: '12px 14px', verticalAlign: 'middle'}}>
                  <SectionBadge section={resolveRuleSection(x)} stage={rStage} />
                </td>
                <td
                  style={{
                    padding: '12px 14px',
                    verticalAlign: 'middle',
                    fontWeight: 600,
                    color: '#0f172a',
                    fontSize: 12,
                  }}
                >
                  {x.field_label}
                </td>
                <td style={{padding: '12px 14px', verticalAlign: 'middle', width: 190, minWidth: 190}}>
                  <code
                    style={{
                      fontSize: 11,
                      background: '#f1f5f9',
                      padding: '3px 7px',
                      borderRadius: 4,
                      color: '#334155',
                      fontFamily: 'monospace',
                    }}
                  >
                    {x.field_key}
                  </code>
                </td>
                <td style={{textAlign: 'center', padding: '12px 14px', verticalAlign: 'middle'}}>
                  <MandatoryStatusBadge mandatory={Boolean(x.mandatory)} />
                </td>
                {canManage && (
                  <td style={{textAlign: 'center', padding: '12px 14px', verticalAlign: 'middle'}}>
                    <div style={{display: 'inline-flex', gap: 6, justifyContent: 'center'}}>
                      <button
                        type="button"
                        disabled={busy}
                        className={x.mandatory ? 'button small' : 'button primary small'}
                        style={{fontSize: 11, padding: '4px 10px'}}
                        onClick={() => onToggle(x)}
                        title={x.mandatory ? 'Change to optional (0)' : 'Make mandatory (1)'}
                      >
                        {busy ? (
                          'Saving...'
                        ) : x.mandatory ? (
                          <>
                            <X size={12} style={{marginRight: 3}} />
                            Set Optional (0)
                          </>
                        ) : (
                          <>
                            <Check size={12} style={{marginRight: 3}} />
                            Set Mandatory (1)
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="button small"
                        style={{fontSize: 11, padding: '4px 8px'}}
                        onClick={() => onEdit(x)}
                        title="Edit field rule"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rules.length && <div className="empty-small">No fields match the search or filter.</div>}
    </div>
  );
}
