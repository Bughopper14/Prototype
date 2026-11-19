/** Create authority (a free text name; the names the application checks are only suggestions) or edit its description. */
import {AUTHORITY_CATALOG} from '@liugong/shared';
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Overview, Row} from '@/features/user-management/lib/types';
import {useState} from 'react';

export function AuthorityForm({
  data,
  authority,
  onSave,
  onClose,
}: {
  data: Overview;
  authority?: Row;
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  const [appId, setAppId] = useState<number>(data.applications[0]?.id);
  const taken = new Set(data.authorities.filter(a => a.app_id === appId).map(a => a.authority_name));
  const available = AUTHORITY_CATALOG.filter(a => !taken.has(a.name));
  const [name, setName] = useState('');
  const picked = AUTHORITY_CATALOG.find(a => a.name === name);

  if (authority) {
    return (
      <Dialog title="Edit Authority" onClose={onClose} onSubmit={f => onSave(Object.fromEntries(f))}>
        <div className="pt-field">
          <span className="pt-form-label">Authority</span>
          <code>{authority.authority_name}</code>
        </div>
        <Field label="Description" name="description" defaultValue={authority.description || ''} />
      </Dialog>
    );
  }
  return (
    <Dialog
      title="Add Authority"
      onClose={onClose}
      onSubmit={f => onSave({app_id: appId, authority_name: name, description: f.get('description')})}
    >
      {/* One column: each field on its own line at full width (side by side it squeezed the name and cut the placeholder). */}
      <div style={{display: 'grid', gap: 16, width: '100%'}}>
      <label className="pt-field" style={{width: '100%'}}>
        <span className="pt-form-label">Application</span>
        <select
          className="pt-select"
          style={{width: '100%'}}
          value={appId}
          onChange={e => {
            setAppId(Number(e.target.value));
            setName('');
          }}
          required
        >
          {data.applications.map(a => (
            <option key={a.id} value={a.id}>
              {a.app_name}
            </option>
          ))}
        </select>
      </label>
      <label className="pt-field" style={{width: '100%'}}>
        <span className="pt-form-label">Authority name</span>
        <input
          className="pt-input"
          style={{width: '100%'}}
          list="authority-suggestions"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={100}
          required
          placeholder="Type any name, or pick one the application already checks"
        />
        <datalist id="authority-suggestions">
          {available.map(a => (
            <option key={a.name} value={a.name} />
          ))}
        </datalist>
      </label>
      <Field key={name} label="Description" name="description" defaultValue={picked?.description || ''} />
      </div>
    </Dialog>
  );
}
