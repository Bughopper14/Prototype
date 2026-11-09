/** Group structure (holding, subsidiaries, shareholders) and per-entity SLIK review state for the pre-analysis. */
import {DEFAULT_GROUP_STRUCTURE} from '@/features/pre-analysis/lib/defaults';
import {formatGroupStructureAsNarrative} from '@/features/pre-analysis/lib/group-structure';
import {formatPlafonCurrency, parsePlafonNumber} from '@/features/pre-analysis/lib/text';
import type {PreAnalysisData} from '@/features/pre-analysis/lib/types';
import {
  EntitySlikReview,
  GroupEntity,
  GroupShareholder,
  GroupStructureData,
  LenderExposureItem,
} from '@/features/pre-analysis/lib/types';
import type {Dispatch, SetStateAction} from 'react';
import {useMemo} from 'react';

type ViewMode = 'digital-twin' | 'original-pdf';

export function useGroupStructure({
  data,
  setData,
  viewMode,
  setViewMode,
}: {
  data: PreAnalysisData;
  setData: Dispatch<SetStateAction<PreAnalysisData>>;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
}) {
  const currentGroupStructure = useMemo<GroupStructureData>(() => {
    const base = data.groupStructure || DEFAULT_GROUP_STRUCTURE;
    const defHolding = DEFAULT_GROUP_STRUCTURE.holding;

    // Holding shareholders: merge with default if index matches default, otherwise use user's
    const holdingSh =
      base.holding?.shareholders && base.holding.shareholders.length > 0
        ? base.holding.shareholders.map((userSh, idx) => {
            const defSh = defHolding.shareholders[idx];
            return {
              ...(defSh || {}),
              ...userSh,
              name: userSh.name !== undefined ? userSh.name : defSh?.name || '',
              position: userSh.position || userSh.role || defSh?.position || '',
              shareClass: userSh.shareClass || defSh?.shareClass || '-',
              numberOfShares: userSh.numberOfShares || defSh?.numberOfShares || '',
              total: userSh.total || defSh?.total || '',
            };
          })
        : defHolding.shareholders;

    // Subsidiaries: MUST use base.subsidiaries if present, otherwise default
    const rawSubs =
      base.subsidiaries && base.subsidiaries.length > 0
        ? base.subsidiaries
        : DEFAULT_GROUP_STRUCTURE.subsidiaries;

    const defaultColors = ['#0284c7', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48'];

    const subsidiaries = rawSubs.map((userSub, sIdx) => {
      const defSub = DEFAULT_GROUP_STRUCTURE.subsidiaries[sIdx];
      const color =
        userSub.borderColor || (defSub ? defSub.borderColor : defaultColors[sIdx % defaultColors.length]);

      const subSh =
        userSub.shareholders && userSub.shareholders.length > 0
          ? userSub.shareholders.map((userSh, idx) => {
              const defSh = defSub?.shareholders?.[idx];
              return {
                ...(defSh || {}),
                ...userSh,
                name: userSh.name !== undefined ? userSh.name : defSh?.name || '',
                position: userSh.position || userSh.role || defSh?.position || '',
                shareClass: userSh.shareClass || defSh?.shareClass || '-',
                numberOfShares: userSh.numberOfShares || defSh?.numberOfShares || '',
                total: userSh.total || defSh?.total || '',
              };
            })
          : defSub
            ? defSub.shareholders
            : [];

      return {
        ...userSub,
        name: userSub.name !== undefined ? userSub.name : defSub?.name || `PT Subsidiary #${sIdx + 1}`,
        subtitle: userSub.subtitle !== undefined ? userSub.subtitle : defSub?.subtitle || '',
        authorizedCapital:
          userSub.authorizedCapital !== undefined
            ? userSub.authorizedCapital
            : defSub?.authorizedCapital || 'Rp. 0',
        paidUpCapital:
          userSub.paidUpCapital !== undefined ? userSub.paidUpCapital : defSub?.paidUpCapital || 'Rp. 0',
        borderColor: color,
        management: userSub.management || defSub?.management || '',
        shareholders: subSh,
      };
    });

    return {
      holding: {
        ...defHolding,
        ...(base.holding || {}),
        name: base.holding?.name !== undefined ? base.holding.name : defHolding.name,
        subtitle: base.holding?.subtitle !== undefined ? base.holding.subtitle : defHolding.subtitle,
        authorizedCapital:
          base.holding?.authorizedCapital !== undefined
            ? base.holding.authorizedCapital
            : defHolding.authorizedCapital,
        paidUpCapital:
          base.holding?.paidUpCapital !== undefined ? base.holding.paidUpCapital : defHolding.paidUpCapital,
        borderColor: base.holding?.borderColor || defHolding.borderColor,
        shareholders: holdingSh,
      },
      subsidiaries,
    };
  }, [data.groupStructure]);

  const sisterCompanyName = useMemo(() => {
    const subs = currentGroupStructure.subsidiaries || [];
    if (subs.length >= 3) {
      return subs[1]?.name || subs[0]?.name || 'SISTER COMPANY';
    }
    if (subs.length === 2) {
      return subs[0]?.name || 'SISTER COMPANY';
    }
    if (subs.length === 1) {
      return currentGroupStructure.holding?.name || subs[0]?.name || 'SISTER COMPANY';
    }
    return currentGroupStructure.holding?.name || 'SISTER COMPANY';
  }, [currentGroupStructure]);

  const applicantCompanyName = useMemo(() => {
    const subs = currentGroupStructure.subsidiaries || [];
    if (subs.length >= 3) {
      return subs[2]?.name || data.customerProjectName || 'APPLICANT COMPANY';
    }
    if (subs.length >= 1) {
      return subs[subs.length - 1]?.name || data.customerProjectName || 'APPLICANT COMPANY';
    }
    return data.customerProjectName || 'APPLICANT COMPANY';
  }, [currentGroupStructure, data.customerProjectName]);

  const groupSubsidiaries = useMemo(() => {
    if (currentGroupStructure.subsidiaries && currentGroupStructure.subsidiaries.length > 0) {
      return currentGroupStructure.subsidiaries;
    }
    return [
      {name: sisterCompanyName, authorizedCapital: '', paidUpCapital: '', shareholders: []},
      {name: applicantCompanyName, authorizedCapital: '', paidUpCapital: '', shareholders: []},
    ];
  }, [currentGroupStructure.subsidiaries, sisterCompanyName, applicantCompanyName]);

  const getEntityReview = (idx: number, entityName: string): EntitySlikReview => {
    const existing = data.entitySlikReviews?.[String(idx)];
    if (existing) {
      return {
        ...existing,
        entityName: entityName || existing.entityName || `Entity #${idx + 1}`,
      };
    }
    const isSister = /sister|handalan|hps/i.test(entityName) || (groupSubsidiaries.length >= 2 && idx === 1);
    const isApplicant =
      /applicant|request|htps|harta/i.test(entityName) || idx === groupSubsidiaries.length - 1;

    if (isSister) {
      return {
        id: `sub-${idx}`,
        entityName: entityName || 'PT HPS (SISTER COMPANY)',
        hasRecord: true,
        noRecordRemarks: '',
        lenderExposures:
          data.lenderExposures && data.lenderExposures.length > 0
            ? data.lenderExposures
            : [
                {lender: 'PT Astra Sedaya Finance (ACC)', plafond: '11.737.642.751,00', rate: '6,24'},
                {lender: 'PT Bank Central Asia Tbk', plafond: '13.533.553.504,00', rate: '9,50'},
                {lender: 'PT Bank Nano Syariah', plafond: '6.163.669.402,00', rate: '-'},
                {
                  lender: 'PT Bank Saqu Indonesia (d.h PT Bank Jasa Jakarta)',
                  plafond: '2.738.552.586,00',
                  rate: '10,41',
                },
                {lender: 'PT Mandiri Tunas Finance (MTF)', plafond: '14.993.647.840,00', rate: '9,50'},
                {lender: 'PT Mitsui Leasing Capital Indonesia', plafond: '392.806.826,00', rate: '10,63'},
                {lender: 'PT Radana Bhaskara Finance', plafond: '3.273.898.464,00', rate: '7,20'},
                {lender: 'PT SMFL Leasing Indonesia', plafond: '4.301.044.800,00', rate: '12,49'},
                {
                  lender: 'PT Surya Artha Nusantara Finance (SANF)',
                  plafond: '23.538.710.000,00',
                  rate: '11,25',
                },
              ],
        pefindoNotes:
          data.pefindoNotes ||
          '<p>- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.</p><p>- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank.</p><p>- New business diversification, PT HTPS doesnt have any experience in Harvesting.</p>',
        pefindoTerms:
          data.pefindoTerms ||
          '<p>Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract</p>',
      };
    }

    if (isApplicant) {
      return {
        id: `sub-${idx}`,
        entityName: entityName || 'PT HTPS (REQUEST USING THIS COMPANY)',
        hasRecord: false,
        noRecordRemarks: data.applicantPefindoCheck || '<p>NO RECORD SINCE ITS NEWLY ESTABLISHED</p>',
        lenderExposures: [],
        pefindoNotes: '',
        pefindoTerms: '',
      };
    }

    return {
      id: `sub-${idx}`,
      entityName: entityName || `PT Entity #${idx + 1}`,
      hasRecord: false,
      noRecordRemarks: '<p>Belum ada fasilitas kredit perbankan / leasing (No Record)</p>',
      lenderExposures: [],
      pefindoNotes: '',
      pefindoTerms: '',
    };
  };

  const updateEntityReview = (idx: number, patch: Partial<EntitySlikReview>) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    const current = getEntityReview(idx, groupSubsidiaries[idx]?.name || '');
    const updated: EntitySlikReview = {...current, ...patch};
    const nextReviews = {...(data.entitySlikReviews || {}), [String(idx)]: updated};

    const updates: Partial<PreAnalysisData> = {
      entitySlikReviews: nextReviews,
    };
    if (updated.hasRecord) {
      updates.lenderExposures = updated.lenderExposures;
      updates.pefindoNotes = updated.pefindoNotes;
      updates.pefindoTerms = updated.pefindoTerms;
    } else {
      if (/applicant|request|htps|harta/i.test(updated.entityName) || idx === groupSubsidiaries.length - 1) {
        updates.applicantPefindoCheck = updated.noRecordRemarks;
      }
    }
    setData(prev => ({...prev, ...updates}));
  };

  const getGrandTotal = (exposures: LenderExposureItem[] = []): string => {
    const total = exposures.reduce((sum, item) => sum + parsePlafonNumber(item.plafond), 0);
    return formatPlafonCurrency(total);
  };

  const syncStructureIntoData = (prev: PreAnalysisData, newGs: GroupStructureData): PreAnalysisData => {
    const narrative = formatGroupStructureAsNarrative(newGs);
    const holdingShareholders = (newGs.holding?.shareholders || [])
      .filter(s => s.name)
      .map(s => `${s.name} (${s.percentage || ''})${s.role ? ` - ${s.role}` : ''}`)
      .join(', ');

    return {
      ...prev,
      groupStructure: newGs,
      uboInformation: narrative,
      uboInfo: holdingShareholders || prev.uboInfo,
      ubo: holdingShareholders || prev.ubo,
      holdingGroup: newGs.holding?.name ? newGs.holding.name : prev.holdingGroup,
    };
  };

  const updateHoldingField = (field: keyof GroupEntity, val: any) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: {...gs.holding, [field]: val},
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const updateHoldingShareholder = (idx: number, field: keyof GroupShareholder, val: string) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const sh = [...(gs.holding.shareholders || [])];
      sh[idx] = {...sh[idx], [field]: val};
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: {...gs.holding, shareholders: sh},
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const addHoldingShareholder = () => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const sh = [
        ...(gs.holding.shareholders || []),
        {name: '', position: '', role: '', shareClass: '-', numberOfShares: '', total: ''},
      ];
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: {...gs.holding, shareholders: sh},
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const removeHoldingShareholder = (idx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const sh = (gs.holding.shareholders || []).filter((_, i) => i !== idx);
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: {...gs.holding, shareholders: sh},
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const addSubsidiary = () => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    const defaultColors = ['#0284c7', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48'];
    setData(prev => {
      const baseGs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs =
        baseGs.subsidiaries && baseGs.subsidiaries.length > 0
          ? [...baseGs.subsidiaries]
          : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];

      const newIdx = currentSubs.length;
      const color = defaultColors[newIdx % defaultColors.length];
      const holdingName = baseGs.holding?.name
        ? baseGs.holding.name.split('(')[0].trim()
        : 'PT SANTOSA ABADI RAJA';

      const newSub: GroupEntity = {
        name: `PT Entity #${newIdx + 1}`,
        subtitle: `(Subsidiary #${newIdx + 1})`,
        authorizedCapital: 'Rp. 50,000,000,000',
        paidUpCapital: 'Rp. 12,500,000,000',
        borderColor: color,
        management: 'Direktur: - | Komisaris: -',
        shareholders: [
          {
            name: holdingName,
            position: 'Legal Entity',
            role: 'Legal Entity',
            shareClass: '-',
            numberOfShares: '990',
            total: 'Rp. 12,375,000,000',
          },
          {
            name: 'DIRECTOR / SHAREHOLDER',
            position: 'Director',
            role: 'Director',
            shareClass: '-',
            numberOfShares: '10',
            total: 'Rp. 125,000,000',
          },
        ],
      };

      const updatedGs: GroupStructureData = {
        holding: baseGs.holding || DEFAULT_GROUP_STRUCTURE.holding,
        subsidiaries: [...currentSubs, newSub],
      };

      // Also ensure entitySlikReviews for the new index is ready in Section 6
      const nextReviews = {...(prev.entitySlikReviews || {})};
      if (!nextReviews[String(newIdx)]) {
        nextReviews[String(newIdx)] = {
          id: `sub-${newIdx}`,
          entityName: newSub.name,
          hasRecord: true,
          lenderExposures: [
            {lender: 'Bank Mandiri', plafond: '5.000.000.000,00', rate: '8,50', notes: 'Term Loan'},
          ],
          pefindoNotes: '<p>SLIK / Bureau highlight checked - smooth facility operations.</p>',
          pefindoTerms: '<p>Commercial terms benchmarked to existing banking partners.</p>',
          noRecordRemarks: '',
        };
      }

      const res = syncStructureIntoData(prev, updatedGs);
      res.entitySlikReviews = nextReviews;
      return res;
    });
  };

  const removeSubsidiary = (idx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs =
        gs.subsidiaries && gs.subsidiaries.length > 0
          ? [...gs.subsidiaries]
          : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const subs = currentSubs.filter((_, i) => i !== idx);
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: subs,
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const updateSubsidiaryField = (idx: number, field: keyof GroupEntity, val: any) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs =
        gs.subsidiaries && gs.subsidiaries.length > 0
          ? [...gs.subsidiaries]
          : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      currentSubs[idx] = {...currentSubs[idx], [field]: val};
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs,
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const updateSubsidiaryShareholder = (
    subIdx: number,
    sIdx: number,
    field: keyof GroupShareholder,
    val: string,
  ) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs =
        gs.subsidiaries && gs.subsidiaries.length > 0
          ? [...gs.subsidiaries]
          : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const sh = [...(currentSubs[subIdx]?.shareholders || [])];
      sh[sIdx] = {...sh[sIdx], [field]: val};
      currentSubs[subIdx] = {...currentSubs[subIdx], shareholders: sh};
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs,
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const addSubsidiaryShareholder = (subIdx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs =
        gs.subsidiaries && gs.subsidiaries.length > 0
          ? [...gs.subsidiaries]
          : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const sh = [
        ...(currentSubs[subIdx]?.shareholders || []),
        {name: '', position: '', role: '', shareClass: '-', numberOfShares: '', total: ''},
      ];
      currentSubs[subIdx] = {...currentSubs[subIdx], shareholders: sh};
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs,
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const removeSubsidiaryShareholder = (subIdx: number, sIdx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs =
        gs.subsidiaries && gs.subsidiaries.length > 0
          ? [...gs.subsidiaries]
          : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const sh = (currentSubs[subIdx]?.shareholders || []).filter((_, i) => i !== sIdx);
      currentSubs[subIdx] = {...currentSubs[subIdx], shareholders: sh};
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs,
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  return {
    currentGroupStructure,
    sisterCompanyName,
    applicantCompanyName,
    groupSubsidiaries,
    getEntityReview,
    updateEntityReview,
    getGrandTotal,
    syncStructureIntoData,
    updateHoldingField,
    updateHoldingShareholder,
    addHoldingShareholder,
    removeHoldingShareholder,
    addSubsidiary,
    removeSubsidiary,
    updateSubsidiaryField,
    updateSubsidiaryShareholder,
    addSubsidiaryShareholder,
    removeSubsidiaryShareholder,
  };
}
