/** Confirm a stage transition (approve, return, reject…) with a note. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {api} from '@/shared/lib/api';
import {STAGE} from '@/shared/master-data';
import {Modal} from '@/shared/ui/Modal';
import {label} from '@liugong/shared';
import {ArrowRight} from 'lucide-react';
import {useEffect, useState} from 'react';

type Gap = {target: string; label: string; detail?: string};

/** Where each kind of missing item is filled in: the stage view and tab that hold it. */
const GAP_PLACE: Record<string, {stage?: string; tab: number; name: string}> = {
  FAP_FORM: {stage: STAGE.FAP, tab: 0, name: 'FAP Form'},
  LEGAL: {stage: STAGE.FAP, tab: 5, name: 'Legal'},
  DOCUMENTS: {tab: 6, name: 'Documents'},
};

export function StageTransitionDialog() {
  const {
    a,
    onChange,
    notify,
    busy,
    setBusy,
    error,
    setError,
    transition,
    setTransition,
    comments,
    setComments,
    setActiveStage,
    setTab,
  } = useWorkspace();
  const [gaps, setGaps] = useState<Gap[]>([]);
  // The final approval lists what is still missing as soon as the dialog opens (the server decides again on Confirm)
  useEffect(() => {
    setGaps([]);
    if (transition !== 'APPROVE_COMMITTEE') return;
    let live = true;
    api(`/applications/${a.id}/approval-check`)
      .then((r: any) => live && setGaps(Array.isArray(r?.missing) ? r.missing : []))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [transition, a.id]);
  const close = () => {
    setGaps([]);
    setTransition('');
  };
  const open = (gap: Gap) => {
    const place = GAP_PLACE[gap.target];
    if (!place) return;
    close();
    setError('');
    if (place.stage) setActiveStage(place.stage);
    setTab(place.tab);
  };
  return (
    <>
      {transition && (
        <Modal title={label(transition)} onClose={close}>
          <div className="modal-body">
            <p className="muted">
              {a.customer.companyName} · {a.fapNumber}
            </p>
            <p>Required information and documents will be checked before this action is recorded.</p>
            <label>
              Decision notes
              <textarea
                rows={4}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add context for the next reviewer…"
              />
            </label>
            {gaps.length > 0 ? (
              <div className="error" style={{maxHeight: 260, overflowY: 'auto'}}>
                <strong>Belum lengkap ({gaps.length}), lengkapi dulu:</strong>
                {Object.entries(GAP_PLACE).map(([target, place]) => {
                  const items = gaps.filter(gap => gap.target === target);
                  if (!items.length) return null;
                  return (
                    <div key={target} style={{marginTop: 10}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
                        <strong>
                          {place.name} ({items.length})
                        </strong>
                        <button type="button" className="button" onClick={() => open(items[0])}>
                          Open {place.name} <ArrowRight size={13} />
                        </button>
                      </div>
                      <ul style={{margin: '4px 0 0', paddingLeft: 18}}>
                        {items.map((gap, i) => (
                          <li key={i}>
                            {gap.label}
                            {gap.detail && <span className="muted"> · {gap.detail}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              error && <div className="error">{error}</div>
            )}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={close}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                setGaps([]);
                try {
                  onChange(
                    await api(`/applications/${a.id}/transition`, 'POST', {action: transition, comments}),
                  );
                  setTransition('');
                  notify('Workflow action recorded');
                } catch (e: any) {
                  setError(e.message);
                  setGaps(Array.isArray(e.missing) ? e.missing : []);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm {label(transition).toLowerCase()}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
