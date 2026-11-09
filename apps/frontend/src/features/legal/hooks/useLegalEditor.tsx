/** All state, derived values and handlers of LegalEditor; shared with its sections through LegalEditorContext. */
import {deedNames, legalDeedList} from '@/features/legal/components/DeedViews';
import {extractKtpTextFromImage} from '@/features/ocr/lib/id-documents/extract';
import {parseKtpText} from '@/features/ocr/lib/id-documents/parse-ktp';
import {api} from '@/shared/lib/api';
import {checkIsAdmin} from '@/shared/lib/auth';
import {calculateAgeYearsMonths, date, deedValidity} from '@/shared/lib/format';
import {useMasterData} from '@/shared/master-data';
import {deedPending, deedReviewLabels, reviewStatus} from '@liugong/shared';
import {MoreHorizontal} from 'lucide-react';
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
  const defaultRemarkCategories = [
    {id: 'establishment-deed', name: 'Establishment Deed', remarks: ''},
    {id: 'amendment-share-change', name: 'Shares', remarks: ''},
    {id: 'amendment-management-change', name: 'Management', remarks: ''},
    {id: 'amendment-business-activity-change', name: 'Business Activities', remarks: ''},
    {id: 'amendment-articles-change', name: 'Articles Of Association', remarks: ''},
    {id: 'amendment-other', name: 'Other', remarks: ''},
  ];
  const master = useMasterData(),
    masterCats = master.remarkCategoryId.map(x => ({id: x.value, name: x.name, remarks: ''}));
  const remarkCategories = [
    ...defaultRemarkCategories,
    ...masterCats.filter(x => !defaultRemarkCategories.some(d => d.id === x.id)),
    ...legacyRemarkCategories,
  ];
  const amendmentRemarkCategories = [
    {id: 'amendment-share-change', name: 'Shares', remarks: ''},
    {id: 'amendment-management-change', name: 'Management', remarks: ''},
    {id: 'amendment-business-activity-change', name: 'Business Activities', remarks: ''},
    {id: 'amendment-articles-change', name: 'Articles Of Association', remarks: ''},
    {id: 'amendment-other', name: 'Other', remarks: ''},
    ...masterCats.filter(
      x =>
        ![
          'establishment-deed',
          'amendment-share-change',
          'amendment-management-change',
          'amendment-business-activity-change',
          'amendment-articles-change',
          'amendment-other',
        ].includes(x.id),
    ),
  ];
  const getDeedCategoryIds = (d: any): string[] => {
    if (Array.isArray(d?.remarkCategoryIds) && d.remarkCategoryIds.length > 0) return d.remarkCategoryIds;
    if (d?.remarkCategoryId) return [d.remarkCategoryId];
    return d?.type === 'establishment' ? ['establishment-deed'] : [];
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
      (deedPending(d) ||
        (!['DRAFT', 'RETURNED'].includes(application.status) && reviewStatus(d) !== 'REJECTED')));
  const listLocked = locked(deeds.find(d => d.id === stakeholderList));
  const editorLocked = locked(stakeholderModal ? deeds.find(d => d.id === stakeholderModal.deedId) : editing);
  const rowsFor = (x: any): any[] =>
    Array.isArray(x?.stakeholders) ? x.stakeholders : Array.isArray(stakeholders) ? stakeholders : [];
  const updateRows = async (deedId: string, rows: any[]) => {
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
          legal: nextLegal,
          stakeholders: rows,
        });
        if (res && res.legal) {
          onChange(res.legal);
          const currentDeed = res.legal.deeds?.find((d: any) => d.id === deedId) || res.legal.deeds?.[0];
          if (currentDeed && currentDeed.stakeholders) {
            onStakeholdersChange(res.legal, currentDeed.stakeholders);
          }
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
  const handleKtpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setOcrLoading(true);
      setStakeholderModal((prev: any) => ({
        ...prev,
        value: {
          ...prev.value,
          ktpUrl: dataUrl,
          ktpFileName: f.name,
          ktpMime: f.type,
          ktpOcrText: '',
        },
      }));
      try {
        const parsed = await extractKtpTextFromImage(f, f.name);
        setStakeholderModal((prev: any) => {
          if (!prev) return prev;
          const currentVal = prev.value || {};
          const nextVal: any = {
            ...currentVal,
            ktpUrl: dataUrl,
            ktpFileName: f.name,
            ktpMime: f.type,
            ktpOcrText: parsed.rawText || '',
          };
          if (parsed.nik && (!currentVal.idNumber || currentVal.idNumber === '')) {
            nextVal.idNumber = parsed.nik;
            nextVal.idType = 'KTP_NPWP';
          }
          if (parsed.nama && (!currentVal.firstName || currentVal.firstName === '')) {
            nextVal.name = parsed.nama;
            nextVal.firstName = parsed.firstName || '';
            nextVal.middleName = parsed.middleName || '';
            nextVal.lastName = parsed.lastName || '';
          }
          if (parsed.dateOfBirth && !currentVal.dateOfBirth) {
            nextVal.dateOfBirth = parsed.dateOfBirth;
          }
          if (parsed.gender && (!currentVal.gender || currentVal.gender === 'NONE')) {
            nextVal.gender = parsed.gender;
          }
          if (parsed.maritalStatus) {
            nextVal.maritalStatus = parsed.maritalStatus;
          }
          if (parsed.citizenship) {
            nextVal.citizenship = parsed.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN';
            nextVal.nationalityType = parsed.citizenship;
          }
          if (parsed.kewarganegaraan && parsed.kewarganegaraan.includes('CHINA')) {
            nextVal.nationalityType = 'WNA';
            nextVal.citizenship = 'FOREIGN';
            nextVal.country = 'CHINA';
          }
          if (parsed.alamat && !currentVal.address) {
            nextVal.address = parsed.alamat;
          }
          if (parsed.province && !currentVal.province) nextVal.province = parsed.province;
          if ((parsed.cityRegency || parsed.city) && !currentVal.cityRegency)
            nextVal.cityRegency = parsed.cityRegency || parsed.city;
          if ((parsed.kecamatan || parsed.district) && !currentVal.district)
            nextVal.district = parsed.kecamatan || parsed.district;
          if ((parsed.kelDesa || parsed.village) && !currentVal.village)
            nextVal.village = parsed.kelDesa || parsed.village;
          if (parsed.rt && !currentVal.rt) nextVal.rt = parsed.rt;
          if (parsed.rw && !currentVal.rw) nextVal.rw = parsed.rw;
          if ((parsed.kodePos || parsed.postalCode) && !currentVal.postalCode)
            nextVal.postalCode = parsed.kodePos || parsed.postalCode;
          if (parsed.pekerjaan && !currentVal.occupation) nextVal.occupation = parsed.pekerjaan;
          return {...prev, value: nextVal};
        });
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const applyOcrToForm = () => {
    if (!stakeholderModal?.value?.ktpOcrText) return;
    const parsed = parseKtpText(stakeholderModal.value.ktpOcrText);
    setStakeholderModal((prev: any) => {
      if (!prev) return prev;
      const v = prev.value || {};
      return {
        ...prev,
        value: {
          ...v,
          idNumber: parsed.nik || v.idNumber,
          idType: parsed.nik ? 'KTP' : v.idType,
          firstName: parsed.firstName || v.firstName,
          middleName: parsed.middleName || v.middleName,
          lastName: parsed.lastName || v.lastName,
          name: parsed.nama || v.name,
          dateOfBirth: parsed.dateOfBirth || v.dateOfBirth,
          gender: parsed.gender || v.gender,
          maritalStatus: parsed.maritalStatus || v.maritalStatus,
          citizenship: parsed.citizenship
            ? parsed.citizenship === 'WNI'
              ? 'INDONESIAN'
              : 'FOREIGN'
            : v.citizenship,
          nationalityType: parsed.citizenship || v.nationalityType,
          country: parsed.kewarganegaraan?.includes('CHINA') ? 'CHINA' : v.country,
          address: parsed.alamat || v.address,
          province: parsed.province || v.province,
          cityRegency: parsed.cityRegency || parsed.city || v.cityRegency,
          district: parsed.kecamatan || parsed.district || v.district,
          village: parsed.kelDesa || parsed.village || v.village,
          rt: parsed.rt || v.rt,
          rw: parsed.rw || v.rw,
          postalCode: parsed.postalCode || parsed.kodePos || v.postalCode,
          occupation: parsed.pekerjaan || v.occupation,
        },
      };
    });
  };

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
    const next =
      stakeholderModal.index < 0
        ? [...rows, valToSave]
        : rows.map((r, i) => (i === stakeholderModal.index ? valToSave : r));
    updateRows(x.id, next);
    setStakeholderModal(null);
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
  const complete = Boolean(
    editing &&
    !isDuplicateDeedNumber &&
    String(editing.deedNumber || '').trim() &&
    String(editing.deedDate || '').trim() &&
    (editing.type !== 'amendment' || editingCategoryIds.length > 0),
  );

  // Active Deed Classification (Strict Legal) vs Historical Deed (History)
  const establishmentDeeds = deeds.filter((d: any) => d.type === 'establishment');
  const amendmentDeeds = deeds.filter((d: any) => d.type === 'amendment');

  // 1. Primary establishment deed: matches number in customer profile, or the oldest
  const matchedEst = establishmentDeeds.find(
    (d: any) =>
      (application.customer?.establishmentActNo &&
        d.deedNumber === application.customer.establishmentActNo) ||
      (application.establishmentActNo && d.deedNumber === application.establishmentActNo),
  );
  const primaryEstablishmentDeed =
    matchedEst ||
    establishmentDeeds.slice().sort((a: any, b: any) => {
      const ad = Date.parse(String(a.deedDate || '')) || 0;
      const bd = Date.parse(String(b.deedDate || '')) || 0;
      return ad - bd;
    })[0] ||
    null;

  // 2. Latest amendment deed: sorted by most recent date
  const sortedAmendments = amendmentDeeds.slice().sort((a: any, b: any) => {
    const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0;
    const bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
    return bd - ad;
  });
  const latestAmendmentDeed = sortedAmendments[0] || null;

  // 3. Active Deeds (Top Table): 1 Primary Establishment Deed + 1 Latest Amendment Deed (active)
  const activeDeeds: any[] = [];
  if (primaryEstablishmentDeed) {
    activeDeeds.push(primaryEstablishmentDeed);
  }
  if (latestAmendmentDeed && latestAmendmentDeed.id !== primaryEstablishmentDeed?.id) {
    const validity = deedValidity(latestAmendmentDeed.deedDate);
    if (validity.active !== false) {
      activeDeeds.push(latestAmendmentDeed);
    }
  }

  // 4. Historical Deeds (Bottom Table): All deeds other than active ones
  const activeIdSet = new Set(activeDeeds.map((d: any) => d.id));
  const historicalDeeds = deeds
    .filter((d: any) => !activeIdSet.has(d.id))
    .sort((a: any, b: any) => {
      const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0;
      const bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
      return bd - ad;
    });

  const renderDeedTable = (targetList: any[], isHistory: boolean, emptyMsg: string) => {
    if (!targetList.length) {
      return (
        <div className={`table-scroll legal-table-wrap ${isHistory ? 'legal-table-history' : ''}`}>
          <div className="empty-small" style={{padding: '24px 20px', color: '#64748b', textAlign: 'center'}}>
            {emptyMsg}
          </div>
        </div>
      );
    }
    return (
      <div className={`table-scroll legal-table-wrap ${isHistory ? 'legal-table-history' : ''}`}>
        <table className="data-table legal-deed-table">
          <thead>
            <tr>
              <th>DEED</th>
              <th>DATE</th>
              <th>STATUS</th>
              <th>VALID UNTIL</th>
              <th>MINISTERIAL DECREE</th>
              <th>REMARKS CATEGORIES</th>
              <th>STAKEHOLDERS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {targetList.map((x: any) => {
              const rowLocked = locked(x);
              const total = rowsFor(x).reduce((sum, r) => sum + Number(r.sharePercentage || 0), 0);
              const isExceeded = total > 100.01;
              const isComplete = Math.abs(total - 100) < 0.01;
              const ownershipClass = isExceeded
                ? 'exceeded'
                : isComplete
                  ? 'complete'
                  : total > 0
                    ? 'partial'
                    : 'incomplete';
              const ownershipLabel = isExceeded
                ? `⚠ ${total.toFixed(2)}% · Exceeds 100%`
                : isComplete
                  ? '✓ 100%'
                  : total > 0
                    ? `✓ ${total.toFixed(2)}%`
                    : '0.00% · No data yet';
              const val = deedValidity(x.deedDate);
              const isPrimaryEst = primaryEstablishmentDeed?.id === x.id;
              const isLatestAmend = latestAmendmentDeed?.id === x.id;
              const typeLabel =
                x.type === 'amendment' && isLatestAmend ? 'Latest Amendment Deed' : deedNames[x.type];
              return (
                <tr
                  key={x.id}
                  className={selectedId === x.id ? 'selected' : ''}
                  aria-selected={selectedId === x.id}
                >
                  <td data-label="Deed">
                    <div className="legal-deed-primary">
                      <span className="legal-type-badge">{typeLabel}</span>
                      {isHistory ? (
                        <span className="legal-history-badge">Historical</span>
                      ) : isPrimaryEst ? (
                        <span
                          className="legal-role-badge"
                          style={{background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe'}}
                        >
                          Primary
                        </span>
                      ) : null}
                    </div>
                    <b className="legal-deed-number">{x.deedNumber || 'Number not filled'}</b>
                    <span className={'deed-review-status compact ' + reviewStatus(x).toLowerCase()}>
                      {deedReviewLabels[reviewStatus(x)]}
                    </span>
                    {x.review?.rejectionReason && (
                      <small className="text-red">{x.review.rejectionReason}</small>
                    )}
                    <small>{x.source === 'Sistem' ? 'Initial system data' : 'Legal Input'}</small>
                  </td>
                  <td data-label="Date">
                    <span className="legal-cell-main">{date(x.deedDate)}</span>
                  </td>
                  <td data-label="Status">
                    <span
                      className={
                        'deed-validity ' +
                        (val.active === null ? 'unknown' : val.active ? 'active' : 'inactive')
                      }
                    >
                      {val.status}
                    </span>
                  </td>
                  <td data-label="Valid Until">
                    <span className="legal-cell-main">{date(val.expiry)}</span>
                  </td>
                  <td data-label="Ministerial Decree">
                    <span className="legal-cell-main">{x.ministerialDecreeNumber || '—'}</span>
                    <small>{date(x.ministerialDecreeDate)}</small>
                  </td>
                  <td data-label="Remarks Categories">
                    {(() => {
                      const rawIds = getDeedCategoryIds(x);
                      if (!rawIds.length) return <span className="legal-category-label">—</span>;
                      return (
                        <div className="legal-categories-wrap">
                          {rawIds.map((id: string) => {
                            const cat = remarkCategories.find(c => c.id === id || c.name === id);
                            const name = cat?.name || id;
                            return (
                              <button
                                key={id}
                                type="button"
                                className="legal-category-badge clickable"
                                onClick={e => {
                                  e.stopPropagation();
                                  setViewRemarkDeed({deed: x, activeCatId: id});
                                }}
                                title={`Click to view ${name} remarks details`}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </td>
                  <td data-label="Stakeholders">
                    <button
                      className="legal-count-link"
                      onClick={e => {
                        e.stopPropagation();
                        onChange({...value, selectedDeedId: x.id});
                        setStakeholderList(x.id);
                      }}
                    >
                      {rowsFor(x).length} stakeholder(s) · Manage
                    </button>
                    <button
                      className={'legal-ownership-summary ' + ownershipClass}
                      onClick={e => {
                        e.stopPropagation();
                        setShareholderCountDeed(x.id);
                      }}
                      title="View share ownership details"
                    >
                      {ownershipLabel}
                    </button>
                  </td>
                  <td className="legal-row-action">
                    <div className="legal-row-buttons">
                      <button
                        className="button primary small deed-review-action"
                        onClick={e => {
                          e.stopPropagation();
                          onReview(x.id);
                        }}
                      >
                        {(user.isAdmin || user.role === 'ADMIN' || user.role === 'MKT') &&
                        ['DRAFT', 'REJECTED'].includes(reviewStatus(x))
                          ? 'Submit Deed'
                          : (user.isAdmin || user.role === 'ADMIN' || user.role === 'BS') &&
                              reviewStatus(x) === 'PENDING_CHECK'
                            ? 'Review Deed'
                            : (user.isAdmin || user.role === 'ADMIN' || user.role === 'HEAD_BS') &&
                                reviewStatus(x) === 'PENDING_APPROVAL'
                              ? 'Approve Deed'
                              : 'View Approval'}
                      </button>
                      <button
                        className="button small legal-kebab"
                        aria-label={`Deed action ${x.deedNumber || 'no number'}`}
                        aria-haspopup="menu"
                        aria-expanded={actionMenu?.id === x.id}
                        onClick={e => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActionMenu({
                            id: x.id,
                            left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)),
                            top: Math.min(rect.bottom + 5, window.innerHeight - 110),
                          });
                        }}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

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
    renderDeedTable,
  };
}
