/** The financing purposes ticked in FAP section 05, and how one is toggled. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

export function usePurposeSelection() {
  const {draft, setDraft, canEdit} = useWorkspace();
  const rawPurpose = draft.financingPurposeDetail;
  const purposeList: string[] = Array.isArray(rawPurpose)
    ? rawPurpose.map((s: any) => String(s).toUpperCase())
    : String(rawPurpose || '')
        .split(',')
        .map((s: string) => s.trim().toUpperCase())
        .filter(Boolean);

  const togglePurpose = (val: string) => {
    if (!canEdit) return;
    let next: string[];
    if (purposeList.includes(val)) {
      next = purposeList.filter((x: string) => x !== val);
    } else {
      next = [...purposeList, val];
    }
    setDraft({...draft, financingPurposeDetail: next.join(',')});
  };

  return {purposeList, togglePurpose};
}
