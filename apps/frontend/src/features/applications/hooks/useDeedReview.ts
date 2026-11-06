/** Start a deed review and poll the application while the Stakeholders tab is open. */
import {legalDeedList} from '@/features/legal/components/DeedViews';
import {api} from '@/shared/lib/api';
import {deedData} from '@liugong/shared';
import {useEffect} from 'react';

export function useDeedReview({
  setReviewDeedId,
  tab,
  draft,
  setDraft,
  setBusy,
  setError,
  canLegal,
  a,
  onChange,
}: {
  setReviewDeedId: React.Dispatch<React.SetStateAction<string | null>>;
  tab: number;
  draft: any;
  setDraft: React.Dispatch<any>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  canLegal: true;
  a: any;
  onChange: (a: any) => void;
}) {
  async function beginDeedReview(id: string) {
    setError('');
    setBusy(true);
    try {
      if (canLegal) {
        const list = legalDeedList(draft.legal || {}, a),
          selected =
            draft.legal?.selectedDeedId ||
            list.find(x => x.type === (draft.legal?.selectedDeed || 'establishment'))?.id ||
            list[0]?.id,
          target = list.find(d => d.id === id);
        if (!target) throw Error('Deed not found.');
        const deed = deedData({
          ...target,
          stakeholders: Array.isArray(target.stakeholders) ? target.stakeholders : draft.stakeholders || [],
        });
        const v = await api(`/applications/${a.id}/deeds/${id}/draft`, 'PUT', {deed});
        onChange(v);
        setDraft(structuredClone(v));
      }
      setReviewDeedId(id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (tab !== 1) return;
    const timer = setInterval(
      () =>
        api('/applications/' + a.id)
          .then(onChange)
          .catch(() => {}),
      15000,
    );
    return () => clearInterval(timer);
  }, [tab, a.id]);

  return {beginDeedReview};
}
