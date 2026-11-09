/** Customer section 03: Business Profile & Deed Legality. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {Fields} from '@/shared/ui/Fields';
import {type Field, profileFields} from '@liugong/shared';
import {ChevronDown, Eye} from 'lucide-react';

export function BusinessProfileSection() {
  const {
    draft,
    setDraft,
    openSections,
    setOpenSections,
    activeFieldKey,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    liveEstablishmentDate,
    canEditCustomerPic,
  } = useWorkspace();
  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-business'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-business"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-business')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">03</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Business Profile & Deed Legality</h4>
              <span className={`fap-acc-badge ${draft.mainBusiness ? 'success' : ''}`}>
                {draft.mainBusiness || 'Not filled'}
              </span>
            </div>
            <p className="fap-acc-subtitle">
              Main business sector, operational experience, source of funds, and latest deed number
            </p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-business');
              setOpenSections(s => ({...s, ['fap-preview-sec-business']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-business'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-business'] && (
        <div className="fap-accordion-content">
          <div style={{marginBottom: 14}}>
            <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
              Business Experience & Operations
            </h5>
            {(() => {
              const calculatedExp = liveEstablishmentDate
                ? calculateAgeYearsMonths(liveEstablishmentDate)
                : null;
              const operationalValues = {
                ...draft,
                experienceYears: calculatedExp ? String(calculatedExp.years) : (draft.experienceYears ?? ''),
                experienceMonths: calculatedExp
                  ? String(calculatedExp.months)
                  : (draft.experienceMonths ?? ''),
              };
              const opFields: Field[] = [
                profileFields.find(f => f.key === 'mainBusiness')!,
                profileFields.find(f => f.key === 'repaymentSource')!,
                profileFields.find(f => f.key === 'industrySegment')!,
                profileFields.find(f => f.key === 'businessRole')!,
                {...profileFields.find(f => f.key === 'experienceYears')!, type: 'text'},
                {...profileFields.find(f => f.key === 'experienceMonths')!, type: 'text'},
              ].filter(Boolean);
              return (
                <>
                  <Fields
                    fields={opFields}
                    value={operationalValues}
                    disabled={!canEditCustomerPic}
                    section="business"
                    onFieldFocus={k => handleTriggerFieldSync(k, 'business')}
                    onFieldSync={k => handleTriggerFieldSync(k, 'business')}
                    activeFieldKey={activeFieldKey}
                    onChange={v => {
                      const exp = liveEstablishmentDate
                        ? calculateAgeYearsMonths(liveEstablishmentDate)
                        : null;
                      setDraft({
                        ...v,
                        experienceYears: exp ? exp.years : (v.experienceYears ?? draft.experienceYears ?? 0),
                        experienceMonths: exp
                          ? exp.months
                          : (v.experienceMonths ?? draft.experienceMonths ?? 0),
                      });
                    }}
                  />
                  <small style={{color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: 6}}>
                    * Experience years & months are calculated automatically from the Establishment Deed Date
                  </small>
                </>
              );
            })()}
          </div>
          <div style={{borderTop: '1px dashed #e2e8f0', paddingTop: 14}}>
            <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
              Amendment Deed Legal Summary
            </h5>
            <Fields
              fields={profileFields.filter(f => ['latestDeedNo', 'latestDeedDate'].includes(f.key))}
              value={draft}
              disabled={!canEditCustomerPic}
              section="business"
              onFieldFocus={k => handleTriggerFieldSync(k, 'business')}
              onFieldSync={k => handleTriggerFieldSync(k, 'business')}
              activeFieldKey={activeFieldKey}
              onChange={v => {
                const exp = calculateAgeYearsMonths(liveEstablishmentDate);
                setDraft({...v, experienceYears: exp.years, experienceMonths: exp.months});
              }}
            />
            {liveEstablishmentDate && (
              <small style={{color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginTop: 4}}>
                Latest deed synced automatically from the Legal tab.
              </small>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
