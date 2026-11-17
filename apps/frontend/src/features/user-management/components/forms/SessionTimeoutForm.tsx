/** Session timeout of one user: quick presets or minutes typed in (0 = never logged out for being idle). */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Row} from '@/features/user-management/lib/types';
import {useState} from 'react';

const PRESETS: [number, string][] = [
  [15, '15 Minutes (Default)'],
  [30, '30 Minutes'],
  [60, '1 Hour (60m)'],
  [120, '2 Hours (120m)'],
  [0, 'Unlimited (No Expiry)'],
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
        Set idle/inactivity timeout before the system automatically logs out this user session.
      </p>
      <span className="pt-form-label">Quick Presets</span>
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
        <span className="pt-form-label">Inactivity Timeout (Minutes)</span>
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
        Enter <code>0</code> for <strong>Unlimited / No Expiration</strong> (session will never automatically logout due to idle time).
      </small>
      <div className="um-notice ok" style={{marginTop: 12, cursor: 'default'}}>
        <i className="fas fa-info-circle" />{' '}
        {!valid
          ? 'Enter a number between 0 and 1440 minutes.'
          : value === 0
            ? 'This user session will never expire due to inactivity.'
            : `User will be automatically logged out after ${value} minutes of inactivity.`}
      </div>
    </Dialog>
  );
}
