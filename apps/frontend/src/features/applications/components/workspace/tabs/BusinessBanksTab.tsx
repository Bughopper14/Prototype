/** Tab: Business & banks (bank facilities, projects…). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {money} from '@/shared/lib/format';
import {Fields} from '@/shared/ui/Fields';
import {Repeater} from '@/shared/ui/Repeater';
import {bankFields, proposalFields, unitFields} from '@liugong/shared';
import {Wallet} from 'lucide-react';

export function BusinessBanksTab() {
  const {tab, draft, setDraft, canEdit, canFinance, p, principal, monthly} = useWorkspace();
  return (
    <>
      {tab === 2 && (
        <div className="business-sections">
          <section className="business-section">
            <Repeater
              title="Bank Facilities"
              description="Existing company credit facilities and loans."
              fields={bankFields.filter(f => f.key !== 'comments')}
              rows={draft.bankReferences}
              disabled={!canEdit}
              carousel
              onChange={bankReferences => setDraft({...draft, bankReferences})}
            />
          </section>
          <section className="business-section">
            <div className="business-section-heading">
              <div>
                <h3>Financing Details</h3>
                <p className="muted">Set the financing value, tenor, and terms.</p>
              </div>
            </div>
            <Fields
              fields={proposalFields}
              value={p}
              disabled={!canFinance}
              onChange={proposal => setDraft({...draft, proposal})}
            />
            <div className="simulation">
              <div>
                <Wallet size={22} />
                <span>
                  Estimated monthly installment<strong>{money(monthly)}</strong>
                </span>
              </div>
              <p>
                Reducing balance estimate. Excludes fees, insurance, and taxes.
                <br />
                Net principal: {money(principal)} · {p.paymentMethod || 'In Arrear'}
              </p>
            </div>
          </section>
          <section className="business-section">
            <Repeater
              title="Equipment Units"
              description="Register details for each financed equipment unit."
              fields={unitFields}
              rows={p.units || []}
              disabled={!canFinance}
              onChange={units => setDraft({...draft, proposal: {...p, units}})}
            />
          </section>
        </div>
      )}
    </>
  );
}
