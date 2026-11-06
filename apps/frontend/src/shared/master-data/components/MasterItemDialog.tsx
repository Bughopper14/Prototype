/** Dialog to add or edit one master-data item (used by MasterSelect quick-add and the Master Data page). */
import {api} from '@/shared/lib/api';
import {masterGroups, type MasterItem} from '@liugong/shared';
import {Save, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {equipmentChildren, locationGroups, saveCatalog, setMasterData, useMasterData} from '../catalog/store';

export function MasterItemDialog({
  groupKey,
  item,
  onClose,
  onSaved,
  parentValue,
}: {
  groupKey: string;
  item?: MasterItem;
  onClose: () => void;
  onSaved?: (item: MasterItem) => void;
  parentValue?: string;
}) {
  const data = useMasterData(),
    group = masterGroups.find(x => x.key === groupKey)!;
  const [draft, setDraft] = useState<MasterItem>(
      item
        ? {...item}
        : {
            value: '',
            name: '',
            active: true,
            parentValue: group.parent
              ? data[group.parent].find(x => x.value === parentValue || x.name === parentValue)?.value ||
                (groupKey === 'province' ? data.country.find(x => x.active)?.value : '') ||
                ''
              : '',
            role: 'BS',
            required: false,
            timing: 'arrear',
          },
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [busy, onClose]);
  async function save() {
    setBusy(true);
    setError('');
    try {
      if (
        (locationGroups.has(groupKey) || groupKey === 'postalCode' || equipmentChildren.has(groupKey)) &&
        group.parent &&
        !draft.parentValue
      )
        throw new Error('Please select ' + masterGroups.find(x => x.key === group.parent)?.name + ' first.');
      const value = locationGroups.has(groupKey)
          ? item?.value || crypto.randomUUID()
          : draft.value.trim() || draft.name.trim(),
        row = {...draft, value, name: draft.name.trim()};
      const next = {
        ...data,
        [groupKey]: item
          ? data[groupKey].map(x =>
              x.value === item.value && (groupKey !== 'postalCode' || x.parentValue === item.parentValue)
                ? row
                : x,
            )
          : [...data[groupKey], row],
      };
      await saveCatalog(next);
      onSaved?.(row);
      onClose();
    } catch (e: any) {
      setError(e.message);
      try {
        const latest = await api('/master-data');
        setMasterData(latest);
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <div className="modal-scrim master-modal-scrim">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${item ? 'Edit' : 'Add'} ${group.name}`}
      >
        <div className="modal-head">
          <h2>
            {item ? 'Edit' : 'Add'} · {group.name}
          </h2>
          <button className="icon-button" disabled={busy} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="formgrid">
            <label>
              Option name
              <input
                autoFocus
                maxLength={150}
                value={draft.name}
                onChange={e => setDraft({...draft, name: e.target.value})}
              />
            </label>
            {!locationGroups.has(groupKey) && (
              <label>
                Code / value
                <input
                  disabled={!!item}
                  maxLength={150}
                  placeholder="Auto-generated from name if empty"
                  value={draft.value}
                  onChange={e => setDraft({...draft, value: e.target.value})}
                />
              </label>
            )}
            {group.parent && (
              <label>
                {masterGroups.find(x => x.key === group.parent)?.name}
                <select
                  value={draft.parentValue || ''}
                  onChange={e =>
                    setDraft({
                      ...draft,
                      parentValue: e.target.value,
                      ...(groupKey === 'village' ? {zipCode: ''} : {}),
                    })
                  }
                >
                  <option value="">
                    {locationGroups.has(groupKey) ||
                    groupKey === 'postalCode' ||
                    equipmentChildren.has(groupKey)
                      ? 'Select parent'
                      : 'All / No parent'}
                  </option>
                  {data[group.parent]
                    .filter(x => x.active || x.value === draft.parentValue)
                    .map(x => (
                      <option key={x.value} value={x.value}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {groupKey === 'province' && (
              <label>
                Region
                <input
                  maxLength={100}
                  placeholder="Region name (optional)"
                  value={draft.region || ''}
                  onChange={e => setDraft({...draft, region: e.target.value})}
                />
              </label>
            )}
            {groupKey === 'village' && (
              <label>
                ZIP code
                <select
                  aria-label="ZIP code"
                  value={draft.zipCode || ''}
                  onChange={e => setDraft({...draft, zipCode: e.target.value})}
                >
                  <option value="">Select ZIP code (optional)</option>
                  {data.postalCode
                    .filter(
                      x =>
                        x.value === draft.zipCode ||
                        (x.active &&
                          (!x.parentValue ||
                            x.parentValue ===
                              data.district.find(d => d.value === draft.parentValue)?.parentValue)),
                    )
                    .map(x => (
                      <option key={x.value} value={x.value}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label>
              Status
              <select
                value={draft.active ? 'active' : 'inactive'}
                onChange={e => setDraft({...draft, active: e.target.value === 'active'})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {groupKey === 'documents' && (
              <>
                <label>
                  Review department
                  <select value={draft.role} onChange={e => setDraft({...draft, role: e.target.value})}>
                    {['BS', 'CA', 'LEGAL'].map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Mandatory document
                  <select
                    value={draft.required ? 'yes' : 'no'}
                    onChange={e => setDraft({...draft, required: e.target.value === 'yes'})}
                  >
                    <option value="yes">Mandatory</option>
                    <option value="no">Optional</option>
                  </select>
                </label>
              </>
            )}
            {groupKey === 'paymentMethod' && (
              <label>
                Payment timing rule
                <select value={draft.timing} onChange={e => setDraft({...draft, timing: e.target.value})}>
                  <option value="arrear">Paid in arrear (end of period)</option>
                  <option value="advance">Paid in advance (start of period)</option>
                </select>
              </label>
            )}
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <p className="master-help">
            Active options will appear in form dropdowns. Deactivating an option does not delete existing
            application records.
          </p>
        </div>
        <div className="modal-actions">
          <button className="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy || !draft.name.trim()} onClick={save}>
            <Save size={15} />
            {busy ? 'Saving…' : 'Save selection'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
