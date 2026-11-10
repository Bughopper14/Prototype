/** Every stakeholder of the application, from the draft, the saved application and the deeds, without duplicates. */
export function collectStakeholders(a: any, draft: any): any[] {
  const list: any[] = [];
  const seen = new Set<string>();

  const addStk = (s: any) => {
    if (!s) return;
    const key = `${s.id || ''}_${s.idNumber || ''}_${s.name || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push(s);
    }
  };

  (draft.stakeholders || []).forEach(addStk);
  (a.stakeholders || []).forEach(addStk);
  (draft.legal?.deeds || []).forEach((d: any) => (d.stakeholders || []).forEach(addStk));
  (a.legal?.deeds || []).forEach((d: any) => (d.stakeholders || []).forEach(addStk));

  return list;
}
