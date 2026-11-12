/** All state, derived values and handlers of LegalEditor; shared with its sections through LegalEditorContext. */
import {legalDeedList} from '@/features/legal/components/DeedViews';
import {api} from '@/shared/lib/api';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {useKtpOcr} from '@/features/legal/hooks/useKtpOcr';
import {classifyDeeds} from '@/features/legal/lib/classify-deeds';
import {stakeholderSaveError} from '@/features/legal/lib/stakeholder-validation';
import {stakeholderForSave} from '@/features/legal/lib/stakeholder-values';
import {isFieldMandatory, useMandatoryRules, useMasterData} from '@/shared/master-data';
import {deedPending, deedSentBack, legalDeedFields, DEED_EDIT_AUTHORITY} from '@liugong/shared';
import {useEffect, useState} from 'react';

export type LegalEditorProps = {
  value: any;
  application: any;
  stakeholders: any[];
  onChange: (v: any) => void;
  onStakeholdersChange: (legal: any, rows: any[]) => void;
  disabled: boolean;
  user: any;
  onReview: (id: string) => void;
  /** Open this deed's editor (or stakeholder list) as soon as it is set, e.g. from the review dialog. */
  editRequest?: {id: string; what: 'deed' | 'stakeholders'} | null;
  onEditRequestHandled?: () => void;
  /** Called with the deed id once an editor opened through editRequest has been closed (saved or cancelled). */
  onEditFinished?: (deedId: string) => void;
  notify?: (msg: string) => void;
};

export function useLegalEditor({
  value,
  application,
  stakeholders,
  onChange,
  onStakeholdersChange,
  disabled,
  user,
  onReview,
  editRequest,
  onEditRequestHandled,
  onEditFinished,
  notify,
}: LegalEditorProps) {
  const [formError, setFormError] = useState('');
  const [actionMenu, setActionMenu] = useState<any>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null),
    [deleting, setDeleting] = useState<any>(null),
    [stakeholderModal, setStakeholderModal] = useState<any>(null),
    [stakeholderList, setStakeholderList] = useState<any>(null),
    [viewStakeholderDetail, setViewStakeholderDetail] = useState<any>(null),
    [deleteStakeholder, setDeleteStakeholder] = useState<any>(null),
    [shareholderCountDeed, setShareholderCountDeed] = useState<any>(null),
    [viewRemarkDeed, setViewRemarkDeed] = useState<any>(null),
    [legacyRemarkCategories] = useState<any[]>(() => {
      try {
        const stored = JSON.parse(localStorage.getItem('liugong-los-remarks-master-v1') || '[]');
        return Array.isArray(stored) ? stored : [];
      } catch {
        return [];
      }
    });
  useEffect(() => setFormError(''), [editing?.id, stakeholderModal?.deedId, stakeholderModal?.index]);
  // Remark categories come from Master Data (active items); the built-in list is only a fallback
  const defaultRemarkCategories = [
    {id: 'ESTABLISHMENT_DEED', name: 'Establishment Deed', remarks: ''},
    {id: 'AMENDMENT_SHARE_CHANGE', name: 'Shareholding Change', remarks: ''},
    {id: 'AMENDMENT_MANAGEMENT_CHANGE', name: 'Management Change', remarks: ''},
    {id: 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', name: 'Business Activity Change', remarks: ''},
    {id: 'AMENDMENT_ARTICLES_CHANGE', name: 'Articles of Association Change', remarks: ''},
    {id: 'AMENDMENT_OTHER', name: 'Other Amendment', remarks: ''},
  ];
  const isEstablishmentCat = (id?: string) => id === 'ESTABLISHMENT_DEED' || id === 'establishment-deed';
  const master = useMasterData();
  const mandatoryRules = useMandatoryRules();
  const masterCats = (master.remarkCategoryId || [])
    .filter((x: any) => x.active !== false && x.value !== 'akta-pendirian' && x.value !== 'akta-perubahan')
    .map((x: any) => ({id: x.value, name: x.name, remarks: ''}));
  const remarkCategories =
    masterCats.length > 0
      ? [...masterCats, ...legacyRemarkCategories.filter(l => !masterCats.some(m => m.id === l.id))]
      : defaultRemarkCategories;
  const establishmentDeedCat =
    remarkCategories.find(x => isEstablishmentCat(x.id)) || defaultRemarkCategories[0];
  const amendmentRemarkCategories = remarkCategories.filter(x => !isEstablishmentCat(x.id));
  const getDeedCategoryIds = (d: any): string[] => {
    if (Array.isArray(d?.remarkCategoryIds) && d.remarkCategoryIds.length > 0) return d.remarkCategoryIds;
    if (d?.remarkCategoryId) return [d.remarkCategoryId];
    return d?.type === 'establishment' ? ['ESTABLISHMENT_DEED'] : [];
  };
  const deeds = legalDeedList(value, application),
    selectedId =
      value.selectedDeedId ||
      deeds.find(x => x.type === (value.selectedDeed || 'establishment'))?.id ||
      deeds[0]?.id,
    parties = editing?.parties || {};
  const locked = (d: any) =>
    disabled ||
    (!checkIsAdmin(user) &&
      (!hasAuthority(user, DEED_EDIT_AUTHORITY) ||
        deedPending(d) ||
        (!['DRAFT', 'RETURNED'].includes(application.status) && !deedSentBack(d))));
  const [returnToReview, setReturnToReview] = useState<string | null>(null);
  useEffect(() => {
    if (!editRequest) return;
    const target = deeds.find(d => d.id === editRequest.id);
    if (target) {
      setReturnToReview(target.id);
      if (editRequest.what === 'stakeholders') {
        onChange({...value, selectedDeedId: target.id});
        setStakeholderList(target.id);
      } else setEditing({...structuredClone(target), stakeholders: rowsFor(target)});
    } else onEditFinished?.(editRequest.id);
    onEditRequestHandled?.();
  }, [editRequest]);
  // Every editor opened from the review dialog is closed again: hand the user back to it
  useEffect(() => {
    if (returnToReview && !editing && !stakeholderList && !stakeholderModal) {
      const id = returnToReview;
      setReturnToReview(null);
      onEditFinished?.(id);
    }
  }, [returnToReview, editing, stakeholderList, stakeholderModal]);
  const listLocked = locked(deeds.find(d => d.id === stakeholderList));
  const editorLocked = locked(stakeholderModal ? deeds.find(d => d.id === stakeholderModal.deedId) : editing);
  const rowsFor = (x: any): any[] =>
    Array.isArray(x?.stakeholders) ? x.stakeholders : Array.isArray(stakeholders) ? stakeholders : [];
  const updateRows = async (deedId: string, rows: any[]) => {
    // The API gets the rows normalised for storage; the screen keeps what the user typed
    const savedRows = rows.map(stakeholderForSave);
    const hydrated = deeds.map(x => ({
      ...x,
      stakeholders: Array.isArray(x.stakeholders) ? x.stakeholders : stakeholders,
    }));
    const updated = hydrated.map(x => (x.id === deedId ? {...x, stakeholders: rows} : x));
    const nextLegal = {...value, deeds: updated, selectedDeedId: deedId};
    onStakeholdersChange(nextLegal, rows);
    if (application?.id && !application.isNew) {
      try {
        const res = await api(`/applications/${application.id}/page-legal`, 'PUT', {
          legal: {
            ...nextLegal,
            deeds: updated.map(x => (x.id === deedId ? {...x, stakeholders: savedRows} : x)),
          },
          stakeholders: savedRows,
        });
        if (res && res.legal) {
          onChange(res.legal);
          // The server may give a browser-built deed its stored id: find it by id, number or type
          const target = deeds.find(d => d.id === deedId);
          const sameNumber = (d: any) =>
            String(d.deedNumber || '')
              .trim()
              .toLowerCase() ===
            String(target?.deedNumber || '')
              .trim()
              .toLowerCase();
          const currentDeed =
            res.legal.deeds?.find((d: any) => d.id === deedId) ||
            (target?.deedNumber ? res.legal.deeds?.find(sameNumber) : null) ||
            (target?.type ? res.legal.deeds?.find((d: any) => d.type === target.type) : null) ||
            res.legal.deeds?.[0];
          if (currentDeed && Array.isArray(currentDeed.stakeholders)) {
            onStakeholdersChange(res.legal, currentDeed.stakeholders);
          }
          notify?.('Stakeholders updated and saved to database successfully');
        }
      } catch (e: any) {
        console.error('Save legal stakeholders error:', e);
        setFormError(e.message || 'Failed to save stakeholders to database.');
      }
    }
  };
  const safeUUID = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'deed-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const openAdd = () => {
    if (disabled) return;
    setEditing({
      id: safeUUID(),
      type: deeds.some(x => x.type === 'establishment') ? 'amendment' : 'establishment',
      createdAt: new Date().toISOString(),
      stakeholders: [],
    });
  };
  const saveDeed = async () => {
    if (!editing || editorLocked || disabled) return;
    const cleanEditingDeedNumber = String(editing.deedNumber || '')
      .trim()
      .toLowerCase();
    const isDuplicate = Boolean(
      cleanEditingDeedNumber &&
      deeds.some(
        (d: any) =>
          d.id !== editing.id &&
          String(d.deedNumber || '')
            .trim()
            .toLowerCase() === cleanEditingDeedNumber,
      ),
    );
    if (isDuplicate) {
      setFormError('This deed number has already been entered in this application.');
      return;
    }
    // Which deed fields are required is set in Master Data > Mandatory (section "Legal Deeds & Amendments")
    const deedRequired = (key: string) =>
      isFieldMandatory(mandatoryRules, 'Legal Deeds & Amendments', key, false, 'FAP');
    if (deedRequired('type') && !editing.type) {
      setFormError('Deed type is mandatory and must be selected.');
      return;
    }
    for (const f of legalDeedFields) {
      const v = editing[f.key];
      if (deedRequired(f.key) && (v === undefined || v === null || String(v).trim() === '')) {
        setFormError(`${f.label} is mandatory and must be filled.`);
        return;
      }
    }
    if (
      deedRequired('remarks') &&
      !String(editing.remarks || '')
        .replace(/<[^>]*>/g, '')
        .trim()
    ) {
      setFormError('Deed Notes / Remarks is mandatory and must be filled.');
      return;
    }
    setFormError('');
    const catsToSave = getDeedCategoryIds(editing);
    const cleanRemarks = (editing.remarks || '')
      .replace(/<\/ol>\s*<ol[^>]*>/gi, '')
      .replace(/<\/ul>\s*<ul[^>]*>/gi, '');
    const currentStakeholders = rowsFor(editing);
    const saved = {
      ...editing,
      remarks: cleanRemarks,
      remarkCategoryIds: catsToSave,
      remarkCategoryId: catsToSave[0] || '',
      stakeholders: currentStakeholders,
    };
    const updatedDeeds = deeds.some(x => x.id === editing.id)
      ? deeds.map(x => (x.id === editing.id ? saved : x))
      : [...deeds, saved];
    const nextLegal = {...value, deeds: updatedDeeds, selectedDeedId: editing.id};
    onChange(nextLegal);
    if (application?.id && !application.isNew) {
      try {
        const res = await api(`/applications/${application.id}/page-legal`, 'PUT', {legal: nextLegal});
        if (res && res.legal) {
          onChange(res.legal);
          const currentDeed = res.legal.deeds?.find((d: any) => d.id === editing.id) || res.legal.deeds?.[0];
          if (currentDeed && currentDeed.stakeholders) {
            onStakeholdersChange(res.legal, currentDeed.stakeholders);
          }
        }
      } catch (e: any) {
        console.error('Save legal deed error:', e);
        setFormError(e.message || 'Failed to save deed to database.');
        return;
      }
    }
    setEditing(null);
  };
  const removeDeed = () => {
    if (!deleting || locked(deleting) || deleting.approvedSnapshot) return;
    const remaining = deeds.filter(x => x.id !== deleting.id),
      nextId = remaining[0]?.id,
      legal = {
        ...value,
        deeds: remaining,
        hiddenDeedIds: [...new Set([...(value.hiddenDeedIds || []), deleting.id])],
        selectedDeedId: nextId,
      };
    const nextRows = nextId ? rowsFor(remaining[0]) : [];
    if (deleting.id === selectedId) onStakeholdersChange(legal, nextRows);
    else onChange(legal);
    if (application?.id && !application.isNew) {
      api(`/applications/${application.id}/page-legal`, 'PUT', {legal, stakeholders: nextRows}).catch(e =>
        console.warn('Auto-delete legal deed error:', e),
      );
    }
    setDeleting(null);
  };
  const {handleKtpUpload, applyOcrToForm} = useKtpOcr({stakeholderModal, setStakeholderModal, setOcrLoading});

  const saveStakeholder = () => {
    if (!stakeholderModal || editorLocked) return;
    setFormError('');
    const x = deeds.find(d => d.id === stakeholderModal.deedId);
    if (!x) return;
    const rows = rowsFor(x);
    let valToSave = {...stakeholderModal.value};
    if (valToSave.dateOfBirth) {
      const {years, months} = calculateAgeYearsMonths(valToSave.dateOfBirth);
      valToSave.ageYears = years;
      valToSave.ageMonths = months;
    }
    const fullName = [valToSave.firstName, valToSave.middleName, valToSave.lastName]
      .map((x: any) => String(x || '').trim())
      .filter(Boolean)
      .join(' ');
    valToSave.name = fullName || valToSave.name || 'New Stakeholder';
    valToSave.id = stakeholderModal.index < 0 ? safeUUID() : valToSave.id || safeUUID();

    const saveError = stakeholderSaveError({valToSave, rows, index: stakeholderModal.index, mandatoryRules});
    if (saveError) {
      setFormError(saveError);
      return;
    }
    const next =
      stakeholderModal.index < 0
        ? [...rows, valToSave]
        : rows.map((r, i) => (i === stakeholderModal.index ? valToSave : r));
    updateRows(x.id, next);
    setStakeholderModal(null);
    // Back to this deed's stakeholder list
    setStakeholderList(x.id);
  };
  const editingCategoryIds = editing ? getDeedCategoryIds(editing) : [];
  const cleanEditingDeedNumber = String(editing?.deedNumber || '')
    .trim()
    .toLowerCase();
  const isDuplicateDeedNumber = Boolean(
    cleanEditingDeedNumber &&
    deeds.some(
      (d: any) =>
        d.id !== editing?.id &&
        String(d.deedNumber || '')
          .trim()
          .toLowerCase() === cleanEditingDeedNumber,
    ),
  );
  // Required deed fields are checked on save against the mandatory rules
  const complete = Boolean(editing && !isDuplicateDeedNumber);
  const isTypeMandatory = isFieldMandatory(mandatoryRules, 'Legal Deeds & Amendments', 'type', false, 'FAP');
  const isRemarksMandatory = isFieldMandatory(
    mandatoryRules,
    'Legal Deeds & Amendments',
    'remarks',
    false,
    'FAP',
  );

  // Active deeds (top table) and historical deeds (bottom table)
  const {
    establishmentDeeds,
    amendmentDeeds,
    matchedEst,
    primaryEstablishmentDeed,
    sortedAmendments,
    latestAmendmentDeed,
    activeDeeds,
    activeIdSet,
    historicalDeeds,
  } = classifyDeeds(deeds, application);

  return {
    value,
    application,
    stakeholders,
    onChange,
    onStakeholdersChange,
    disabled,
    user,
    onReview,
    formError,
    setFormError,
    actionMenu,
    setActionMenu,
    ocrLoading,
    setOcrLoading,
    editing,
    setEditing,
    deleting,
    setDeleting,
    stakeholderModal,
    setStakeholderModal,
    stakeholderList,
    setStakeholderList,
    viewStakeholderDetail,
    setViewStakeholderDetail,
    deleteStakeholder,
    setDeleteStakeholder,
    shareholderCountDeed,
    setShareholderCountDeed,
    viewRemarkDeed,
    setViewRemarkDeed,
    legacyRemarkCategories,
    defaultRemarkCategories,
    establishmentDeedCat,
    isTypeMandatory,
    isRemarksMandatory,
    master,
    masterCats,
    remarkCategories,
    amendmentRemarkCategories,
    getDeedCategoryIds,
    deeds,
    selectedId,
    parties,
    locked,
    listLocked,
    editorLocked,
    rowsFor,
    updateRows,
    safeUUID,
    openAdd,
    saveDeed,
    removeDeed,
    handleKtpUpload,
    applyOcrToForm,
    saveStakeholder,
    editingCategoryIds,
    cleanEditingDeedNumber,
    isDuplicateDeedNumber,
    complete,
    establishmentDeeds,
    amendmentDeeds,
    matchedEst,
    primaryEstablishmentDeed,
    sortedAmendments,
    latestAmendmentDeed,
    activeDeeds,
    activeIdSet,
    historicalDeeds,
  };
}
