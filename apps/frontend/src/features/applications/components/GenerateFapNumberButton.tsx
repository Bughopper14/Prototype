/** Makes the FAP number of an application on request (an application is created without one). */
import {api} from '@/shared/lib/api';
import {Hash} from 'lucide-react';
import {useState} from 'react';

export function GenerateFapNumberButton({
  applicationId,
  onGenerated,
  notify,
}: {
  applicationId: string;
  /** Called with the updated application, so the screen shows the new number. */
  onGenerated: (application: any) => void;
  notify: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    try {
      const updated = await api(`/applications/${applicationId}/fap-number`, 'POST', {});
      onGenerated(updated);
      notify(`FAP number ${updated.fapNumber} generated`);
    } catch (e: any) {
      notify(e.message || 'Could not generate the FAP number');
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="button small" disabled={busy} onClick={generate} title="The FAP number is made only when it is needed">
      <Hash size={13} /> {busy ? 'Generating…' : 'Generate FAP number'}
    </button>
  );
}
