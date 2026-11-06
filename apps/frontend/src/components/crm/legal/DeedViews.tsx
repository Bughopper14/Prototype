import {publishedDeeds} from '@liugong/shared';
import {Users} from 'lucide-react';
import {legalDeedFields, label} from '@liugong/shared';
import {date, deedValidity} from '@/lib/format';

export const deedNames: Record<string, string> = {
  establishment: 'Establishment Deed',
  amendment: 'Amendment Deed',
};

export function legalDeedList(legal: any, application: any) {
  const appId = application?.id || 'app';
  const saved: any[] = Array.isArray(legal.deeds) ? legal.deeds : [];
  const legacy = ['establishment', 'amendment']
    .filter(type => legal[type] && Object.values(legal[type]).some(Boolean))
    .map(type => ({id: `legacy-${type}-${appId}`, type, ...legal[type]}));
  const entered = Array.isArray(legal.deeds) ? saved : legacy;
  const system: any[] = [];
  const estNo = String(application?.customer?.establishmentActNo || '')
    .trim()
    .toLowerCase();
  const latestNo = String(application?.latestDeedNo || '')
    .trim()
    .toLowerCase();
  const appStakeholders = Array.isArray(application?.stakeholders) ? application.stakeholders : [];

  if (application?.customer?.establishmentActNo) {
    system.push({
      id: `system-establishment-${appId}`,
      type: 'establishment',
      deedNumber: application.customer.establishmentActNo,
      deedDate: String(application.customer.establishmentDate || '').slice(0, 10),
      source: 'Sistem',
      stakeholders: appStakeholders,
    });
  }

  // Only generate system-amendment if latestDeedNo exists and is distinct from establishmentActNo
  if (application?.latestDeedNo && latestNo && latestNo !== estNo) {
    system.push({
      id: `system-amendment-${appId}`,
      type: 'amendment',
      deedNumber: application.latestDeedNo,
      deedDate: String(application.latestDeedDate || '').slice(0, 10),
      source: 'Sistem',
      stakeholders: appStakeholders,
    });
  }

  // Filter out any system deed that already exists in entered (by ID or same deedNumber)
  const filteredSystem = system.filter(x => {
    const xNo = String(x.deedNumber || '')
      .trim()
      .toLowerCase();
    return !entered.some(
      y =>
        y.id === x.id ||
        (xNo &&
          String(y.deedNumber || '')
            .trim()
            .toLowerCase() === xNo),
    );
  });

  return [...filteredSystem, ...entered].filter(x => !legal.hiddenDeedIds?.includes(x.id));
}

export function selectedLegalStakeholders(legal: any, application: any, fallback: any[]) {
  const deeds = legalDeedList(legal, application),
    selected = deeds.find(x => x.id === legal.selectedDeedId) || deeds[0];
  return selected && Array.isArray(selected.stakeholders) ? selected.stakeholders : fallback;
}

export function shareholderNames(parties: any): string[] {
  return Array.isArray(parties?.shareholders)
    ? parties.shareholders
    : parties?.shareholder
      ? [parties.shareholder]
      : [];
}

export function StakeholderDeedView({
  legal,
  application,
  fallbackRows,
}: {
  legal: any;
  application: any;
  fallbackRows: any[];
}) {
  const published = publishedDeeds(legal);
  const allDeeds = legalDeedList(legal, application);
  const deedSource = published && published.length > 0 ? published : allDeeds;
  const deeds = [...deedSource].sort((a, b) => {
    const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0,
      bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
    return bd - ad || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  return (
    <div className="stakeholder-card-view">
      <div className="section-title">
        <div>
          <h3>Deeds & Share Ownership</h3>
          <p className="muted">Most recent deed shown first. Data is managed through the Legal tab.</p>
        </div>
        <span className="subtle-chip">{deeds.length} deed(s)</span>
      </div>
      <div className="stakeholder-deed-cards">
        {deeds.map((d, index) => {
          const rawRows =
            Array.isArray(d.stakeholders) && d.stakeholders.length > 0
              ? d.stakeholders
              : d.id === legal.selectedDeedId || (!legal.selectedDeedId && d.id === deeds[0]?.id)
                ? fallbackRows || []
                : [];
          const displayRows =
            rawRows.length > 0
              ? rawRows
              : Array.isArray(fallbackRows) && fallbackRows.length > 0
                ? fallbackRows
                : [];
          const total = displayRows.reduce((sum: number, r: any) => sum + Number(r.sharePercentage || 0), 0),
            validity = deedValidity(d.deedDate);
          return (
            <div
              className={index === 0 ? 'stakeholder-latest-section' : 'stakeholder-history-item'}
              key={d.id}
            >
              {index === 0 ? (
                <div className="stakeholder-group-heading">
                  <h3>Latest Deed</h3>
                  <p>Most recent deed by date.</p>
                </div>
              ) : index === 1 ? (
                <div className="stakeholder-group-heading history">
                  <h3>Previous Deed History</h3>
                  <p>Previous deeds, sorted from most recent.</p>
                </div>
              ) : null}
              <article className="stakeholder-deed-card">
                <header>
                  <div>
                    <div className="stakeholder-card-badges">
                      <span className="legal-type-badge">{deedNames[d.type] || 'Notarial Deed'}</span>
                      {index === 0 && <span className="stakeholder-latest">Latest</span>}
                    </div>
                    <h3>Deed {d.deedNumber || 'Not filled'}</h3>
                  </div>
                  <span
                    className={
                      'deed-validity ' +
                      (validity.active === null ? 'unknown' : validity.active ? 'active' : 'inactive')
                    }
                  >
                    {validity.status}
                  </span>
                </header>
                <dl className="stakeholder-deed-meta">
                  <div>
                    <dt>Deed date</dt>
                    <dd>{date(d.deedDate)}</dd>
                  </div>
                  <div>
                    <dt>Ministerial Decree Number</dt>
                    <dd>{d.ministerialDecreeNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>Valid until</dt>
                    <dd>{date(validity.expiry)}</dd>
                  </div>
                </dl>
                <div className="stakeholder-share-heading">
                  <h4>
                    Stakeholders & Shareholders <span>{displayRows.length}</span>
                  </h4>
                  <span>
                    Total ownership <b>{total.toFixed(2)}%</b>
                  </span>
                </div>
                <div className="shareholder-cards">
                  {displayRows.map((r: any, i: number) => {
                    const name =
                        [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') ||
                        r.name ||
                        `Stakeholder ${i + 1}`,
                      percentage = Number(r.sharePercentage || 0),
                      roleLabel =
                        r.position || (r.stakeholderType === 'CORPORATE' ? 'Company' : 'Perorangan');
                    return (
                      <div className="shareholder-card" key={r.id || i}>
                        <div className="shareholder-card-person">
                          <span className="shareholder-avatar">
                            {name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part: string) => part[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                          <div>
                            <b>{name}</b>
                            <small>{roleLabel}</small>
                          </div>
                        </div>
                        <div className="shareholder-card-value">
                          <strong>{percentage > 0 ? `${percentage.toFixed(2)}%` : r.position || '—'}</strong>
                          <span>{percentage > 0 ? 'Share ownership' : 'Position'}</span>
                        </div>
                        {percentage > 0 && (
                          <div className="shareholder-card-track">
                            <i style={{width: `${Math.max(0, Math.min(100, percentage))}%`}} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!displayRows.length && (
                  <div className="stakeholder-card-empty">
                    <Users size={23} />
                    <b>No stakeholders / shareholders yet</b>
                    <span>Add data stakeholder pada akta ini melalui tab Legal.</span>
                  </div>
                )}
              </article>
            </div>
          );
        })}
      </div>
      {!deeds.length && (
        <div className="empty-small">
          No deeds registered yet. Please add deeds and stakeholders through the Legal tab.
        </div>
      )}
    </div>
  );
}

export function LegalStakeholderSummary({legal, application}: {legal: any; application: any}) {
  const deeds = legalDeedList(legal, application),
    deed =
      deeds.find(x => x.id === legal.selectedDeedId) ||
      deeds.find(x => x.type === (legal.selectedDeed || 'establishment')) ||
      deeds[0],
    parties = deed?.parties || {};
  if (!deed?.deedNumber) return null;
  return (
    <div className="legal-stakeholder-summary">
      <div className="section-title">
        <h3>Selected deed data</h3>
        <span className="subtle-chip">{deedNames[deed.type]}</span>
      </div>
      <div className="legal-summary-grid">
        {legalDeedFields.map(f => (
          <div key={f.key}>
            <small>{f.label}</small>
            <strong>{f.type === 'date' ? date(deed[f.key]) : deed[f.key] || 'â€”'}</strong>
          </div>
        ))}
        {deed.infoAdded && (
          <>
            <div>
              <small>Shareholders</small>
              <strong>{shareholderNames(parties).filter(Boolean).join(', ') || 'â€”'}</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ShareholderCountContent({rows}: {rows: any[]}) {
  const owners = rows.filter(r => Number(r.sharePercentage) > 0),
    total = owners.reduce((sum, r) => sum + Number(r.sharePercentage || 0), 0),
    name = (r: any, i: number) =>
      [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || r.name || `Shareholder ${i + 1}`;
  return (
    <div className="modal-body shareholder-count-modal">
      <div className="shareholder-count-top">
        <div>
          <small>SHAREHOLDER COUNT</small>
          <strong>{owners.length}</strong>
          <span>Dihitung dari Percentage share &gt; 0</span>
        </div>
        <div>
          <small>TOTAL OWNERSHIP</small>
          <strong className={total > 100.01 ? 'text-red' : 'text-brand'}>{total.toFixed(2)}%</strong>
          <span>
            {total > 100.01 ? 'Exceeds maximum limit of 100%' : 'Maximum 100% (not required to be 100%)'}
          </span>
        </div>
      </div>
      {owners.length ? (
        <div className="shareholder-count-list">
          {owners.map((r, i) => (
            <div key={r.id || i}>
              <span>
                <b>{String(i + 1).padStart(2, '0')}</b>
                {name(r, i)}
              </span>
              <strong>{Number(r.sharePercentage).toFixed(2)}%</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-small">No stakeholders with share percentage greater than 0 on this deed.</div>
      )}
      <p className="legal-ownership-rule">
        Total share percentage on the deed must not exceed 100%. Stakeholder data does not need to reach 100%
        (partial ownership portions may be recorded).
      </p>
      <p className="field-note">
        Count and percentage follow Stakeholder data on this deed. Change share percentage via the
        Stakeholders button on the deed row.
      </p>
    </div>
  );
}
