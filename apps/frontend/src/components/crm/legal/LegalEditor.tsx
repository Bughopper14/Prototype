import {Editor} from '@tinymce/tinymce-react';
import {createPortal} from 'react-dom';
import {reviewStatus, deedPending, deedReviewLabels} from '@liugong/shared';
import {useEffect, useState} from 'react';
import {Eye, Plus, MoreHorizontal, Pencil, Clock, Save, Trash2, CheckCircle} from 'lucide-react';
import {parseKtpText, extractKtpTextFromImage} from '@/lib/ktp-ocr';
import {api} from '@/lib/api';
import {useMasterData} from '@/components/crm/master-data/MasterData';
import {stakeholderFields, legalDeedFields, blank, label} from '@liugong/shared';
import {date, calculateAgeYearsMonths, deedValidity} from '@/lib/format';
import {Fields, Modal} from '@/components/crm/common/SharedUi';
import {checkIsAdmin} from '@/lib/auth';
import {stakeholderEditorValues} from '@/components/crm/legal/stakeholder-values';
import {deedNames, legalDeedList, ShareholderCountContent} from '@/components/crm/legal/DeedViews';
import {StakeholderDetailDialog} from '@/components/crm/legal/StakeholderDetailDialog';
import {StakeholderModalDialog} from '@/components/crm/legal/StakeholderModalDialog';

export const normalizeRemarksToHtml = (remarks?: string): string => {
  if (!remarks || !remarks.trim()) return '';
  let html = remarks;
  if (/<(ol|ul)[\s>]/i.test(html)) {
    return html.replace(/<\/ol>\s*<ol[^>]*>/gi, '').replace(/<\/ul>\s*<ul[^>]*>/gi, '');
  }
  const cleaned = html
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|span)[^>]*>/gi, '')
    .trim();
  const lines = cleaned
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const isNumbered = lines.some(l => /^(\d+)[\.\)]\s+/.test(l));
  if (isNumbered) {
    const lis = lines.map(l => {
      const stripped = l.replace(/^(\d+)[\.\)]\s+/, '').trim();
      return `<li>${stripped}</li>`;
    });
    return `<ol>${lis.join('')}</ol>`;
  }
  return lines.map(l => `<p>${l}</p>`).join('');
};

export function DeedRemarksTinyMCE({
  initialContent,
  disabled,
  onChange,
}: {
  initialContent: string;
  disabled: boolean;
  onChange: (html: string) => void;
}) {
  const [initialValue] = useState(() => initialContent);

  return (
    <div className="legal-tinymce-wrapper">
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        initialValue={initialValue}
        disabled={disabled}
        onEditorChange={onChange}
        init={{
          height: 260,
          menubar: false,
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'charmap',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'insertdatetime',
            'table',
            'help',
            'wordcount',
          ],
          toolbar:
            'undo redo | blocks | bold italic underline forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          content_style: `
            body { 
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13.5px; 
              line-height: 1.6; 
              color: #0f172a; 
              padding: 10px 14px; 
            }
            ol {
              margin: 0 0 10px 0;
              padding-left: 26px;
              list-style-type: decimal !important;
            }
            ol li {
              margin-bottom: 5px;
              line-height: 1.6;
            }
            ul {
              margin: 0 0 10px 0;
              padding-left: 26px;
              list-style-type: disc !important;
            }
            ul li {
              margin-bottom: 5px;
              line-height: 1.6;
            }
            p {
              margin: 0 0 8px 0;
              line-height: 1.6;
            }
          `,
          branding: false,
          promotion: false,
          statusbar: true,
          setup: (ed: any) => {
            ed.on('init', () => {
              if (!disabled) {
                ed.mode.set('design');
              }
            });
          },
        }}
      />
    </div>
  );
}

export function LegalEditor({
  value,
  application,
  stakeholders,
  onChange,
  onStakeholdersChange,
  disabled,
  user,
  onReview,
}: {
  value: any;
  application: any;
  stakeholders: any[];
  onChange: (v: any) => void;
  onStakeholdersChange: (legal: any, rows: any[]) => void;
  disabled: boolean;
  user: any;
  onReview: (id: string) => void;
}) {
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

  return (
    <>
      {/* 1. TOP TABLE: ACTIVE DEEDS & CURRENT REFERENCE */}
      <div className="section-title legal-table-title">
        <div>
          <div className="legal-list-heading">
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <CheckCircle size={17} style={{color: '#2563eb'}} /> Active Deeds &amp; Current Reference
            </h3>
            <span className="legal-count active-count">{activeDeeds.length}</span>
          </div>
          <p className="muted">
            Showing 1 primary establishment deed and 1 latest effective amendment deed as the current legal
            reference.
          </p>
        </div>
        {!disabled && ['DRAFT', 'RETURNED'].includes(application.status) && (
          <div className="legal-table-actions">
            <button className="button small" onClick={openAdd}>
              <Plus size={15} />
              Add Deed
            </button>
          </div>
        )}
      </div>

      {renderDeedTable(activeDeeds, false, 'No active deeds recorded.')}

      {/* 2. BOTTOM TABLE: PREVIOUS DEED HISTORY (HISTORICAL DATA) */}
      <div className="section-title legal-table-title" style={{marginTop: '34px'}}>
        <div>
          <div className="legal-list-heading">
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Clock size={17} style={{color: '#64748b'}} /> Previous Deed History (Historical Data)
            </h3>
            <span className="legal-count history-count">{historicalDeeds.length}</span>
          </div>
          <p className="muted">
            Chronological archive of previous amendment deeds and deeds that are no longer active / expired.
          </p>
        </div>
      </div>

      {renderDeedTable(
        historicalDeeds,
        true,
        'No previous deed history. All deeds are recorded in the active reference table.',
      )}

      {actionMenu &&
        createPortal(
          <div
            className="legal-menu-layer"
            onClick={() => setActionMenu(null)}
            onKeyDown={e => {
              if (e.key === 'Escape') setActionMenu(null);
            }}
          >
            <div
              className="legal-action-menu"
              role="menu"
              aria-label="Deed action"
              style={{left: actionMenu.left, top: actionMenu.top}}
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const target = deeds.find(x => x.id === actionMenu.id);
                if (!target) return null;
                return (
                  <>
                    <button
                      role="menuitem"
                      autoFocus
                      onClick={() => {
                        setEditing({...structuredClone(target), stakeholders: rowsFor(target)});
                        setActionMenu(null);
                      }}
                    >
                      <Pencil size={15} />
                      {locked(target) ? 'View details' : 'Edit'}
                    </button>
                    <button
                      role="menuitem"
                      className="legal-delete-button"
                      disabled={locked(target) || !!target.approvedSnapshot}
                      title={target.approvedSnapshot ? 'Approved deeds cannot be deleted' : undefined}
                      onClick={() => {
                        setDeleting(target);
                        setActionMenu(null);
                      }}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body,
        )}
      {editing &&
        (() => {
          const availableChips =
            editing.type === 'amendment'
              ? amendmentRemarkCategories
              : [
                  {id: 'establishment-deed', name: 'Establishment deed', remarks: ''},
                  ...amendmentRemarkCategories,
                ];
          const currentSelectedCategoryIds = getDeedCategoryIds(editing);
          const toggleCategory = (catId: string) => {
            if (editorLocked) return;
            setEditing((prev: any) => {
              if (!prev) return prev;
              const currentCats = getDeedCategoryIds(prev);
              const isSelected = currentCats.includes(catId);
              const next = isSelected ? currentCats.filter(id => id !== catId) : [...currentCats, catId];
              return {...prev, remarkCategoryIds: next, remarkCategoryId: next[0] || ''};
            });
          };
          return (
            <Modal
              title={
                deeds.some(x => x.id === editing.id)
                  ? editorLocked
                    ? 'Deed Details'
                    : 'Edit Deed'
                  : 'Add Deed'
              }
              onClose={() => setEditing(null)}
              className="modal-legal-deed-wide"
            >
              <div className="modal-body legal-deed-modal">
                {formError && (
                  <div className="error" role="alert">
                    {formError}
                  </div>
                )}
                {(() => {
                  const hasExistingEstablishment = deeds.some(
                    (x: any) => x.type === 'establishment' && x.id !== editing.id,
                  );
                  return (
                    <label className="legal-deed-select">
                      Deed type
                      <select
                        aria-label="Deed type"
                        disabled={editorLocked}
                        value={editing.type}
                        onChange={e => {
                          const newType = e.target.value;
                          const nextCats =
                            newType === 'establishment'
                              ? ['establishment-deed']
                              : editing.remarkCategoryIds?.filter(
                                  (x: string) => x !== 'establishment-deed',
                                ) || [];
                          setEditing({
                            ...editing,
                            type: newType,
                            remarkCategoryIds: nextCats,
                            remarkCategoryId: nextCats[0] || '',
                          });
                        }}
                      >
                        <option
                          value="establishment"
                          disabled={hasExistingEstablishment}
                          style={
                            hasExistingEstablishment
                              ? {color: '#94a3b8', backgroundColor: '#f1f5f9', cursor: 'not-allowed'}
                              : undefined
                          }
                        >
                          Establishment Deed{hasExistingEstablishment ? ' (Already exists)' : ''}
                        </option>
                        <option value="amendment">Amendment Deed</option>
                      </select>
                    </label>
                  );
                })()}
                <Fields
                  fields={legalDeedFields}
                  value={editing}
                  disabled={editorLocked}
                  customErrors={
                    isDuplicateDeedNumber
                      ? {deedNumber: 'This deed number has already been entered in this application.'}
                      : undefined
                  }
                  onChange={next => {
                    setEditing({...editing, ...next});
                    const estDeed = deeds.find((x: any) => x.type === 'establishment' && x.id !== editing.id);
                    const estDate =
                      estDeed?.deedDate || value.establishmentDate || application.customer?.establishmentDate;
                    const dDate = next.deedDate || editing.deedDate;
                    if (
                      editing.type === 'amendment' &&
                      dDate &&
                      estDate &&
                      String(dDate).slice(0, 10) < String(estDate).slice(0, 10)
                    ) {
                      setFormError(
                        `Amendment deed date (${date(dDate)}) cannot be before the establishment deed date (${date(estDate)}).`,
                      );
                    } else if (
                      formError &&
                      formError.includes('cannot be before the establishment deed date')
                    ) {
                      setFormError('');
                    }
                  }}
                />
                <>
                  <div className="legal-remarks-category-group">
                    <span className="field-label">
                      Remarks Categories{' '}
                      {editing.type === 'amendment' && (
                        <span className="field-required" aria-label="Required">
                          *
                        </span>
                      )}
                    </span>
                    <div className="legal-remarks-chips" role="group" aria-label="Remarks Categories">
                      {availableChips.map(cat => {
                        const isSelected = currentSelectedCategoryIds.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            disabled={editorLocked}
                            className={`legal-remark-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleCategory(cat.id)}
                          >
                            <span className="legal-chip-check">{isSelected ? '✓' : '+'}</span>
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {editing.type === 'amendment' && currentSelectedCategoryIds.length === 0 && (
                      <small className="input-validation-error" role="alert">
                        Please select at least one remarks category.
                      </small>
                    )}
                  </div>
                  <div className="legal-unified-remarks-box">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <div>
                        <span
                          className="field-label"
                          style={{fontSize: '13px', fontWeight: 700, color: '#002060'}}
                        >
                          Notes / Deed Remarks{' '}
                          {editing.type === 'amendment' && (
                            <span className="field-required" aria-label="Required">
                              *
                            </span>
                          )}
                        </span>
                        <p
                          className="legal-remarks-hint"
                          style={{fontSize: '11px', color: '#64748b', margin: '2px 0 0 0'}}
                        >
                          Write notes and details of deed changes below (rich text TinyMCE format supported):
                        </p>
                      </div>
                      <span
                        className="subtle-chip"
                        style={{background: '#eff6ff', color: '#1d4ed8', fontSize: '10.5px', fontWeight: 600}}
                      >
                        TinyMCE Editor
                      </span>
                    </div>
                    <DeedRemarksTinyMCE
                      key={editing.id}
                      initialContent={normalizeRemarksToHtml(editing.remarks)}
                      disabled={editorLocked}
                      onChange={newContent => {
                        setEditing((prev: any) => (prev ? {...prev, remarks: newContent} : prev));
                      }}
                    />
                  </div>
                </>
              </div>
              <div className="modal-actions">
                <button className="button" onClick={() => setEditing(null)}>
                  {editorLocked ? 'Close' : 'Cancel'}
                </button>
                {!editorLocked && (
                  <button
                    className="button primary"
                    onClick={saveDeed}
                    disabled={!complete || isDuplicateDeedNumber}
                  >
                    <Save size={15} />
                    Save Deed
                  </button>
                )}
              </div>
            </Modal>
          );
        })()}
      {shareholderCountDeed && (
        <Modal title="Shareholder Count" onClose={() => setShareholderCountDeed(null)}>
          <ShareholderCountContent rows={rowsFor(deeds.find(x => x.id === shareholderCountDeed))} />
          <div className="modal-actions">
            <button className="button primary" onClick={() => setShareholderCountDeed(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}
      {stakeholderList && (
        <Modal title="Stakeholders on this deed" onClose={() => setStakeholderList(null)}>
          <div className="modal-body">
            <div className="legal-stakeholder-list">
              {rowsFor(deeds.find(x => x.id === stakeholderList)).map((r, i) => (
                <div
                  className="legal-stakeholder-item interactive-stakeholder-card"
                  key={r.id || i}
                  onClick={() =>
                    setViewStakeholderDetail({deedId: stakeholderList, index: i, stakeholder: r})
                  }
                  title="Click to view full stakeholder details"
                >
                  <div className="legal-stakeholder-item-info">
                    <div className="legal-stakeholder-avatar">
                      {(r.name || r.firstName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <b>
                        {r.name ||
                          [r.firstName, r.lastName].filter(Boolean).join(' ') ||
                          `Stakeholder ${i + 1}`}
                      </b>
                      <small>
                        {label(r.stakeholderType)} · {Number(r.sharePercentage || 0).toFixed(2)}% shares ·{' '}
                        {label(r.representativeType || 'SHAREHOLDER')}
                      </small>
                    </div>
                  </div>
                  <div className="legal-row-buttons" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="button small"
                      style={{background: '#f8fafc', color: '#002060', borderColor: '#cbd5e1'}}
                      onClick={() =>
                        setViewStakeholderDetail({deedId: stakeholderList, index: i, stakeholder: r})
                      }
                      title="View full stakeholder details"
                    >
                      <Eye size={13} style={{marginRight: '4px'}} />
                      Detail
                    </button>
                    <button
                      type="button"
                      className="button small"
                      onClick={() => {
                        setStakeholderModal({
                          deedId: stakeholderList,
                          index: i,
                          value: stakeholderEditorValues(r),
                        });
                        setStakeholderList(null);
                      }}
                    >
                      <Pencil size={13} style={{marginRight: '4px'}} />
                      {listLocked ? 'View' : 'Edit'}
                    </button>
                    {!listLocked && (
                      <button
                        type="button"
                        className="button small legal-delete-button"
                        onClick={() => {
                          setDeleteStakeholder({deedId: stakeholderList, index: i});
                          setStakeholderList(null);
                        }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!rowsFor(deeds.find(x => x.id === stakeholderList)).length && (
                <div className="empty-small">No stakeholders on this deed yet.</div>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setStakeholderList(null)}>
              Close
            </button>
            <button
              className="button primary"
              disabled={listLocked}
              onClick={() => {
                setStakeholderModal({
                  deedId: stakeholderList,
                  index: -1,
                  value: {...blank(stakeholderFields), representativeType: 'SHAREHOLDER', idType: 'NONE'},
                });
                setStakeholderList(null);
              }}
            >
              <Plus size={15} />
              Add shareholder
            </button>
          </div>
        </Modal>
      )}
      {stakeholderModal && (
        <StakeholderModalDialog
          modal={stakeholderModal}
          editorLocked={editorLocked}
          formError={formError}
          onClose={() => setStakeholderModal(null)}
          onSave={saveStakeholder}
          onChangeValue={val => {
            const fullName = [val.firstName, val.middleName, val.lastName]
              .map((x: any) => String(x || '').trim())
              .filter(Boolean)
              .join(' ');
            setStakeholderModal({...stakeholderModal, value: {...val, name: fullName || val.name}});
          }}
          fields={stakeholderFields}
        />
      )}
      {viewStakeholderDetail && (
        <StakeholderDetailDialog
          item={viewStakeholderDetail.stakeholder}
          deed={deeds.find((x: any) => x.id === viewStakeholderDetail.deedId)}
          onClose={() => setViewStakeholderDetail(null)}
          onEdit={() => {
            const item = viewStakeholderDetail.stakeholder;
            const deedId = viewStakeholderDetail.deedId;
            const idx = viewStakeholderDetail.index;
            setViewStakeholderDetail(null);
            setStakeholderList(null);
            setStakeholderModal({
              deedId: deedId,
              index: idx,
              value: stakeholderEditorValues(item),
            });
          }}
          locked={listLocked}
        />
      )}
      {deleteStakeholder && (
        <Modal title="Delete Stakeholder" onClose={() => setDeleteStakeholder(null)}>
          <div className="modal-body">
            <p>Delete this stakeholder from the deed?</p>
            <p className="muted legal-delete-note">Click Save changes in Legal to keep changes saved.</p>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleteStakeholder(null)}>
              Cancel
            </button>
            <button
              className="button legal-confirm-delete"
              onClick={() => {
                const x = deeds.find(d => d.id === deleteStakeholder.deedId);
                if (x)
                  updateRows(
                    x.id,
                    rowsFor(x).filter((_, i) => i !== deleteStakeholder.index),
                  );
                setDeleteStakeholder(null);
              }}
            >
              <Trash2 size={15} />
              Delete stakeholder
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete Deed" onClose={() => setDeleting(null)}>
          <div className="modal-body">
            <p>
              Delete {deedNames[deleting.type]} <strong>{deleting.deedNumber || 'no number'}</strong> from the
              Legal list?
            </p>
            {deleting.source === 'Sistem' && (
              <p className="muted legal-delete-note">
                Original data in Customer or profile remains; this deed will be hidden from the Legal list.
              </p>
            )}
            <p className="muted legal-delete-note">
              Click Save changes after deleting to keep changes saved.
            </p>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button className="button legal-confirm-delete" onClick={removeDeed}>
              <Trash2 size={15} />
              Delete deed
            </button>
          </div>
        </Modal>
      )}
      {viewRemarkDeed &&
        (() => {
          const deed = viewRemarkDeed.deed,
            rawIds = getDeedCategoryIds(deed);
          const isLatest = deed.id === latestAmendmentDeed?.id && deed.type === 'amendment';
          const deedTitle = isLatest ? 'Latest Amendment Deed' : deedNames[deed.type];
          return (
            <Modal title={`Remarks Details · ${deedTitle}`} onClose={() => setViewRemarkDeed(null)}>
              <div className="modal-body legal-category-popup">
                <div className="legal-popup-meta">
                  <span className="legal-type-badge">{deedTitle}</span>
                  <span className="legal-popup-deed-no">{deed.deedNumber}</span>
                  <span className="legal-popup-date">{date(deed.deedDate)}</span>
                </div>
                <div style={{marginBottom: '14px'}}>
                  <span
                    className="field-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Change Categories ({rawIds.length} Selected):
                  </span>
                  <div
                    className="legal-categories-wrap"
                    style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}
                  >
                    {rawIds.map((id: string) => {
                      const cat = remarkCategories.find(c => c.id === id || c.name === id),
                        name = cat?.name || id;
                      return (
                        <span
                          key={id}
                          className="legal-category-badge"
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          ✓ {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="legal-single-remark-view">
                  <span
                    className="field-label"
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#002060',
                      display: 'block',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Deed Notes / Remarks:
                  </span>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      color: '#0f172a',
                      minHeight: '80px',
                    }}
                    dangerouslySetInnerHTML={{__html: deed.remarks || 'No remarks notes for this deed yet.'}}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button className="button primary" onClick={() => setViewRemarkDeed(null)}>
                  Close
                </button>
              </div>
            </Modal>
          );
        })()}
    </>
  );
}
