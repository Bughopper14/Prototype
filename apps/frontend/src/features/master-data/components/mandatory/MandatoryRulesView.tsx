/** Field Mandatory tab: owns filters, the save call and the edit dialog; layout pieces live next to it. */
import {api} from '@/shared/lib/api';
import {setMandatoryRules, useMandatoryRules} from '@/shared/master-data';
import {Check} from 'lucide-react';
import {useState} from 'react';
import {filterRules, splitByStage, stageLabel, type MandatoryFilters} from '../../lib/mandatory-rules';
import {EditMandatoryDialog} from './EditMandatoryDialog';
import {MandatoryRulesTable} from './MandatoryRulesTable';
import {MandatorySummary} from './MandatorySummary';
import {MandatoryToolbar} from './MandatoryToolbar';

export function MasterMandatoryView({
  canManage = true,
  onLogActivity,
}: {
  canManage?: boolean;
  onLogActivity?: (msg: string) => void;
}) {
  const rules = useMandatoryRules();
  const [filters, setFilters] = useState<MandatoryFilters>({
    search: '',
    stage: 'ALL',
    section: 'ALL',
    status: 'ALL',
  });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const counts = splitByStage(rules);
  const visible = filterRules(rules, filters);

  async function handleToggle(item: any, forceStatus?: number) {
    if (!canManage) return;
    const nextVal = forceStatus !== undefined ? forceStatus : item.mandatory ? 0 : 1;
    setBusyId(item.id);
    try {
      const res = await api('/mandatory', 'PUT', {id: item.id, mandatory: nextVal});
      if (Array.isArray(res)) setMandatoryRules(res);
      const label = item.field_label || item.field_key;
      const stageName = stageLabel(item.stage);
      setToast(
        `[${stageName}] Field "${label}" successfully updated to ${nextVal ? 'Mandatory (1)' : 'Optional (0)'}.`,
      );
      onLogActivity?.(
        `Updated mandatory status for [${stageName}] field ${label} (${item.field_key}) to ${nextVal ? 'Mandatory' : 'Optional'}`,
      );
      setTimeout(() => setToast(''), 3500);
    } catch (e: any) {
      alert('Failed to update mandatory status: ' + e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="master-content" style={{width: '100%', padding: '24px 32px', boxSizing: 'border-box'}}>
      <div className="section-title">
        <div>
          <h3 style={{fontSize: 18, color: '#002060', fontWeight: 700}}>Field Mandatory</h3>
          <p className="muted" style={{fontSize: 12, marginTop: 4}}>
            Manage column rules for whether a field is mandatory (1) or optional (0) for <b>FAP</b> and{' '}
            <b>PRE-AN</b>. Changes are saved directly to the database and automatically display a red asterisk
            (*) on form labels.
          </p>
        </div>
      </div>

      {toast && (
        <div
          style={{
            padding: '10px 14px',
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
            color: '#065f46',
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={16} color="#059669" />
          <span>{toast}</span>
        </div>
      )}

      <MandatoryToolbar
        filters={filters}
        onChange={patch => setFilters(f => ({...f, ...patch}))}
        rules={rules}
        fapRules={counts.fap}
        preRules={counts.pre}
      />

      <MandatorySummary
        total={rules.length}
        fap={counts.fap.length}
        fapMandatory={counts.fapMandatory}
        pre={counts.pre.length}
        preMandatory={counts.preMandatory}
        mandatory={counts.mandatory}
      />

      <MandatoryRulesTable
        rules={visible}
        canManage={canManage}
        busyId={busyId}
        onToggle={x => handleToggle(x)}
        onEdit={setEditingItem}
      />

      {editingItem && (
        <EditMandatoryDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={status => {
            handleToggle(editingItem, status);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
