/** Sub-section 5 of the financing proposal: the documents required for this proposal. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {FolderCheck} from 'lucide-react';

export function DocumentRequirementsCard() {
  const {draft, setDraft, handleTriggerFieldSync, canFinance} = useWorkspace();
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h5
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#0f172a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <FolderCheck size={15} style={{color: '#0284c7'}} />
        Persyaratan Dokumen / Document Requirement
      </h5>
      <p style={{fontSize: '12px', color: '#64748b', marginBottom: '14px'}}>
        Checklist required submission documents. Checking an item synchronizes checkmark (✓) to the physical
        FAP sheet.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '10px',
        }}
      >
        {[
          {key: 'companyProfile', label: 'Company Profile', field: 'docReqCompanyProfile'},
          {key: 'legality', label: 'Legality (e.g. NIB, SIUJK, SIUP, etc)', field: 'docReqLegality'},
          {
            key: 'deedEstablishment',
            label: 'Deed establishment & Deed Amendments',
            field: 'docReqDeed',
          },
          {key: 'decreeMinistryOfLaw', label: 'Decree of the ministry of law', field: 'docReqDecree'},
          {
            key: 'copyIdBodShareholder',
            label: 'Copy of ID, BOD, and Shareholder',
            field: 'docReqCopyId',
          },
          {
            key: 'auditedFinancialStatements',
            label: 'Audited Financial Statements',
            field: 'docReqAuditedFin',
          },
          {key: 'bankStatements', label: 'Bank Statements', field: 'docReqBankStatements'},
          {
            key: 'bankFinancingFacility',
            label: 'Bank or Financing Facility',
            field: 'docReqBankFacility',
          },
          {key: 'productionReport', label: 'Production report', field: 'docReqProductionReport'},
          {key: 'listOfFixedAssets', label: 'List of fixed assets', field: 'docReqFixedAssets'},
          {key: 'projectContracts', label: 'Project Contracts', field: 'docReqProjectContracts'},
        ].map(docItem => {
          const docReq = draft.financingProposal?.documentRequirements || {};
          const isChecked = !!docReq[docItem.key];
          return (
            <label
              key={docItem.key}
              id={`fap-form-${docItem.field}`}
              data-field={docItem.field}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                border: isChecked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                background: isChecked ? '#eff6ff' : '#f8fafc',
                cursor: canFinance ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              onFocus={() => handleTriggerFieldSync(docItem.field, 'proposal')}
              onClick={() => handleTriggerFieldSync(docItem.field, 'proposal')}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!canFinance}
                style={{marginTop: '2px', cursor: canFinance ? 'pointer' : 'default'}}
                onChange={e => {
                  const checked = e.target.checked;
                  setDraft((prev: any) => ({
                    ...prev,
                    financingProposal: {
                      ...(prev.financingProposal || {}),
                      documentRequirements: {
                        ...(prev.financingProposal?.documentRequirements || {}),
                        [docItem.key]: checked,
                      },
                    },
                  }));
                  handleTriggerFieldSync(docItem.field, 'proposal');
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isChecked ? 600 : 500,
                  color: isChecked ? '#1e40af' : '#334155',
                  lineHeight: 1.4,
                }}
              >
                {docItem.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
