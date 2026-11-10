/** Session timeout of one user: quick presets or minutes typed in (0 = never logged out for being idle). */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Row} from '@/features/user-management/lib/types';
import {useState} from 'react';

const PRESETS: [number, string][] = [
  [15, '15 Menit (Default)'],
  [30, '30 Menit'],
  [60, '1 Jam (60m)'],
  [120, '2 Jam (120m)'],
  [0, 'Unlimited (Tanpa Batas)'],
];

export function SessionTimeoutForm({
  user,
  onSave,
  onClose,
}: {
  user: Row;
  onSave: (minutes: number) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState<string>(String(user.session_timeout_minutes ?? 15));
  const value = Number(minutes);
  const valid = minutes.trim() !== '' && Number.isInteger(value) && value >= 0 && value <= 1440;
  return (
    <Dialog
      title={`Session Timeout: ${user.full_name || user.username}`}
      onClose={onClose}
      onSubmit={() => valid && onSave(value)}
    >
      <p className="um-muted" style={{marginTop: 0}}>
        Atur batas waktu idle/inactivity sebelum sistem secara otomatis mengeluarkan (logout) sesi pengguna
        ini.
      </p>
      <span className="pt-form-label">Preset Pilihan Cepat</span>
      <div className="um-actions" style={{margin: '6px 0 14px'}}>
        {PRESETS.map(([m, label]) => (
          <button
            key={m}
            type="button"
            className={`um-btn ${m === 0 ? 'outline' : 'ghost'}`}
            style={
              value === m && minutes !== ''
                ? {background: '#ff9900', borderColor: '#ff9900', color: '#fff'}
                : undefined
            }
            onClick={() => setMinutes(String(m))}
          >
            {m === 0 && <i className="fas fa-infinity" />}
            {label}
          </button>
        ))}
      </div>
      <label className="pt-field">
        <span className="pt-form-label">Batas Waktu Inactivity (Menit)</span>
        <input
          className="pt-input"
          name="timeout_minutes"
          type="number"
          min={0}
          max={1440}
          required
          value={minutes}
          onChange={e => setMinutes(e.target.value)}
        />
      </label>
      <small className="um-muted" style={{display: 'block', marginTop: 4}}>
        Isi <code>0</code> untuk <strong>Unlimited / Tanpa Expiration</strong> (sesi tidak akan pernah logout
        otomatis karena idle).
      </small>
      <div className="um-notice ok" style={{marginTop: 12, cursor: 'default'}}>
        <i className="fas fa-info-circle" />{' '}
        {!valid
          ? 'Isi angka 0 sampai 1440 menit.'
          : value === 0
            ? 'Sesi user ini tidak akan berakhir karena idle.'
            : `User akan dikeluarkan otomatis setelah ${value} menit tidak aktif.`}
      </div>
    </Dialog>
  );
}
