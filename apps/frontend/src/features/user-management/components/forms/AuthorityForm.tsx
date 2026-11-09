/** Create authority (pick from the names the application checks) or edit its description. */
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
      <Dialog title="Edit authority" onClose={onClose} onSubmit={f => onSave(Object.fromEntries(f))}>
        <div className="pt-field">
          <span className="pt-form-label">Authority</span>
          <code>{authority.authority_name}</code>
        </div>
        <Field label="Deskripsi" name="description" defaultValue={authority.description || ''} />
      </Dialog>
    );
  }
  return (
    <Dialog
      title="Tambah authority"
      onClose={onClose}
      onSubmit={f => onSave({app_id: appId, authority_name: name, description: f.get('description')})}
    >
      <label className="pt-field">
        <span className="pt-form-label">Aplikasi</span>
        <select
          className="pt-select"
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
      <label className="pt-field">
        <span className="pt-form-label">Authority (hanya yang dikenali aplikasi)</span>
        <select className="pt-select" value={name} onChange={e => setName(e.target.value)} required>
          <option value="">— pilih authority —</option>
          {available.map(a => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        {available.length === 0 && <small>Semua authority yang dikenali sudah ditambahkan.</small>}
      </label>
      <Field key={name} label="Deskripsi" name="description" defaultValue={picked?.description || ''} />
    </Dialog>
  );
}
