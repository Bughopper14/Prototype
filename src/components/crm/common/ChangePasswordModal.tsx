import {useState} from 'react';
import {Save, Loader2, Key} from 'lucide-react';
import {api} from '@/lib/crm/api';
import {label} from '@/lib/shared/fields';
import {Modal} from '@/components/crm/common/ui';

export function ChangePasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Failed to change password.');
      }
      onSuccess('Password changed successfully.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-body" style={{ minWidth: '320px', maxWidth: '440px', padding: '24px 28px' }}>
        {error && <div className="error" style={{ marginBottom: '14px' }}>{error}</div>}
        <label style={{ marginBottom: '14px' }}>
          Current Password
          <input
            type="password"
            required
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
        </label>
        <label style={{ marginBottom: '14px' }}>
          New Password
          <input
            type="password"
            required
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
          />
        </label>
        <label style={{ marginBottom: '18px' }}>
          Confirm New Password
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
          />
        </label>
        <div className="modal-actions" style={{ padding: '16px 0 0 0', background: 'transparent', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={loading} style={{ background: '#002c5f', borderColor: '#002c5f' }}>
            {loading ? <Loader2 className="spin" size={15} /> : <Key size={15} />}
            <span>Save Password</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
