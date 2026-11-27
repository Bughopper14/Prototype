import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {date} from '@/shared/lib/format';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import './CustomerDetailView.css';

function formatCompactRp(amount: number): string {
  if (!amount || amount <= 0) return 'Rp 0';
  if (amount >= 1_000_000_000) {
    const m = amount / 1_000_000_000;
    return `Rp ${m.toLocaleString('id-ID', {maximumFractionDigits: 1})} M`;
  }
  if (amount >= 1_000_000) {
    const jt = amount / 1_000_000;
    return `Rp ${jt.toLocaleString('id-ID', {maximumFractionDigits: 1})} Jt`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatFullRp(amount: number): string {
  if (!amount || amount <= 0) return 'Rp 0';
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function getAppAmount(app: any): number {
  const raw =
    app.financingAmount ??
    app.financing_amount ??
    app.proposedFinancing ??
    app.totalFinancing ??
    app.amount ??
    0;
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}

function statusMeta(app: any): {label: string; tone: string; isApproved: boolean; isInProgress: boolean} {
  const raw = String(app?.status || app?.approvalStatus || '').toUpperCase();
  if (raw === 'APPROVED') return {label: 'Approved', tone: 'approved', isApproved: true, isInProgress: false};
  if (raw === 'REJECTED') return {label: 'Rejected', tone: 'rejected', isApproved: false, isInProgress: false};
  if (raw === 'SUBMITTED' || raw === 'IN_APPROVAL' || raw === 'WAITING_APPROVAL' || raw === 'IN_REVIEW') {
    return {label: 'Waiting for approval', tone: 'waiting', isApproved: false, isInProgress: true};
  }
  if (raw === 'NOT_STARTED' || raw === 'NEW') {
    return {label: 'Not started', tone: 'muted', isApproved: false, isInProgress: true};
  }
  return {label: 'In progress', tone: 'progress', isApproved: false, isInProgress: true};
}

export interface CustomerDetailViewProps {
  customer: any;
  user: any;
  onBack: () => void;
  onOpenApplication: (id: string) => void;
  onStartNewApplication?: (customerId?: string) => void;
}

export function CustomerDetailView({
  customer,
  user,
  onBack,
  onOpenApplication,
  onStartNewApplication,
}: CustomerDetailViewProps) {
  const [subTab, setSubTab] = useState<'overview' | 'applications' | 'documents' | 'contacts' | 'activity'>('overview');
  const [popover, setPopover] = useState<'approved' | 'progress' | 'pic' | null>(null);
  const [detailsByAppId, setDetailsByAppId] = useState<Record<string, any>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const kpiRef = useRef<HTMLDivElement>(null);

  const apps: any[] = customer.custApps || [];
  const latestApp = apps[0] || null;
  const detailApp = latestApp ? detailsByAppId[latestApp.id] || null : null;

  useEffect(() => {
    setSubTab('overview');
    setPopover(null);
    setDetailsByAppId({});
    if (!apps.length) return;
    let alive = true;
    setLoadingDocs(true);
    Promise.all(
      apps.map(a =>
        api(`/applications/${encodeURIComponent(a.id)}`)
          .then((res: any) => [a.id, res] as const)
          .catch(() => [a.id, null] as const),
      ),
    )
      .then(entries => {
        if (!alive) return;
        const map: Record<string, any> = {};
        for (const [id, res] of entries) {
          if (res) map[id] = res;
        }
        setDetailsByAppId(map);
      })
      .finally(() => {
        if (alive) setLoadingDocs(false);
      });
    return () => {
      alive = false;
    };
  }, [customer.groupKey]);

  useEffect(() => {
    if (!popover) return;
    const onDocClick = (e: MouseEvent) => {
      if (kpiRef.current && !kpiRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [popover]);

  const {approvedApps, inProgressApps, totalApprovedAmt, totalInProgressAmt} = useMemo(() => {
    const approved: any[] = [];
    const progress: any[] = [];
    let appAmt = 0;
    let progAmt = 0;
    for (const a of apps) {
      const m = statusMeta(a);
      const amt = getAppAmount(a);
      if (m.isApproved) {
        approved.push(a);
        appAmt += amt;
      } else if (m.isInProgress) {
        progress.push(a);
        progAmt += amt;
      }
    }
    return {
      approvedApps: approved,
      inProgressApps: progress,
      totalApprovedAmt: appAmt,
      totalInProgressAmt: progAmt,
    };
  }, [apps]);

  const custProfile = detailApp?.customer || customer;
  const picEntries = useMemo(() => {
    const map = new Map<string, {name: string; branch: string; apps: any[]}>();
    for (const a of apps) {
      const name =
        a.mktPicName ||
        a.mkt_pic_name ||
        (latestApp && a.id === latestApp.id ? detailApp?.mktPicName || detailApp?.mktPic?.name : '') ||
        '';
      if (!name) continue;
      const branch = a.branchCode || a.branch_code || customer.branch || '—';
      const existing = map.get(name);
      if (existing) {
        existing.apps.push(a);
      } else {
        map.set(name, {name, branch, apps: [a]});
      }
    }
    return [...map.values()];
  }, [apps, latestApp, detailApp, customer.branch]);

  const totalDocsCount = useMemo(
    () => apps.reduce((sum, a) => sum + ((detailsByAppId[a.id]?.documentChecks || []).length), 0),
    [apps, detailsByAppId],
  );
  const address = custProfile.companyAddress || custProfile.address || '—';
  const phone = custProfile.companyPhone || custProfile.phone || '—';
  const website = custProfile.website || '—';
  const mainBusiness = custProfile.mainBusiness || custProfile.industrySegment || '—';
  const docChecks: any[] = detailApp?.documentChecks || [];
  const stakeholders: any[] = detailApp?.stakeholders || [];
  const approvalLogs: any[] = detailApp?.approvalLogs || [];

  const segLower = (customer.typeLabel || '').toLowerCase();
  const segClass = segLower.includes('commercial')
    ? 'commercial'
    : segLower.includes('micro')
      ? 'micro'
      : '';

  const latestAppNo = latestApp ? latestApp.fapNumber || latestApp.application_number || latestApp.applicationNumber || latestApp.id : '';

  return (
    <div className="cdv-wrap">
      {/* Breadcrumb */}
      <div className="cdv-breadcrumb">
        <button type="button" className="cdv-crumb-link" onClick={onBack}>
          Customers
        </button>
        <ChevronRight size={13} />
        <span>{customer.companyName}</span>
      </div>

      {/* Header */}
      <div className="cdv-header">
        <div className="cdv-header-left">
          <span className="cdv-logo-box">
            <Building2 size={20} />
          </span>
          <div>
            <div className="cdv-title-row">
              <h2 className="cdv-title">{customer.companyName}</h2>
              {customer.typeLabel && (
                <span className={`cust-seg-badge ${segClass}`} style={{marginTop: 0}}>
                  {customer.typeLabel}
                </span>
              )}
            </div>
            <p className="cdv-subtitle">
              {customer.nib ? `NIB ${customer.nib}` : 'NIB —'}
              {customer.npwp ? ` · NPWP ${customer.npwp}` : ''}
              {address !== '—' ? ` · ${address}` : ''}
              {customer.createdTs > 0 ? ` · Customer since ${date(customer.createdTs)}` : ''}
            </p>
          </div>
        </div>

        {hasAuthority(user, 'CRM_APPLICATION_CREATE') && onStartNewApplication && (
          <button type="button" className="cdv-new-btn" onClick={() => onStartNewApplication(customer.primaryId)}>
            <Plus size={15} />
            <span>New application</span>
          </button>
        )}
      </div>

      {/* 4 KPI Cards */}
      <div className="cdv-kpi-grid" ref={kpiRef}>
        <div className="cdv-kpi-card">
          <div className="cdv-kpi-label">Applications</div>
          <div className="cdv-kpi-value-row">
            <span className="cdv-kpi-value">{apps.length}</span>
            <span className="cdv-kpi-sub">
              {approvedApps.length} approved · {inProgressApps.length} in progress
            </span>
          </div>
        </div>

        <div
          className={`cdv-kpi-card is-clickable ${popover === 'approved' ? 'is-open' : ''}`}
          onClick={() => setPopover(p => (p === 'approved' ? null : 'approved'))}
        >
          <div className="cdv-kpi-label">Total approved</div>
          <div className="cdv-kpi-value-row">
            <span className="cdv-kpi-value">{formatCompactRp(totalApprovedAmt)}</span>
            <span className="cdv-kpi-sub">
              from {approvedApps.length} application{approvedApps.length !== 1 ? 's' : ''} <ChevronDown size={12} />
            </span>
          </div>

          {popover === 'approved' && (
            <div className="cdv-popover" onClick={e => e.stopPropagation()}>
              <div className="cdv-popover-title">Approved applications</div>
              {approvedApps.length > 0 ? (
                <>
                  <div className="cdv-popover-list">
                    {approvedApps.map(a => {
                      const appNo = a.fapNumber || a.application_number || a.applicationNumber || a.id;
                      const dt = a.updated_at || a.updatedAt || a.created_at || a.createdAt;
                      return (
                        <div key={a.id} className="cdv-popover-row" onClick={() => onOpenApplication(a.application_number || a.id)}>
                          <div className="cdv-popover-left">
                            <CheckCircle2 size={15} color="#16a34a" style={{marginTop: 2, flexShrink: 0}} />
                            <div>
                              <div className="cdv-popover-app">{appNo}</div>
                              <div className="cdv-popover-sub">{dt ? `Approved ${date(dt)}` : 'Approved'}</div>
                            </div>
                          </div>
                          <span className="cdv-popover-amt">{formatFullRp(getAppAmount(a))}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cdv-popover-total">
                    <span>Total</span>
                    <span>{formatFullRp(totalApprovedAmt)}</span>
                  </div>
                </>
              ) : (
                <div className="cdv-popover-sub">No approved applications yet.</div>
              )}
            </div>
          )}
        </div>

        <div
          className={`cdv-kpi-card is-clickable ${popover === 'progress' ? 'is-open' : ''}`}
          onClick={() => setPopover(p => (p === 'progress' ? null : 'progress'))}
        >
          <div className="cdv-kpi-label">In progress</div>
          <div className="cdv-kpi-value-row">
            <span className="cdv-kpi-value">{formatCompactRp(totalInProgressAmt)}</span>
            <span className="cdv-kpi-sub">
              from {inProgressApps.length} application{inProgressApps.length !== 1 ? 's' : ''} <ChevronDown size={12} />
            </span>
          </div>

          {popover === 'progress' && (
            <div className="cdv-popover" onClick={e => e.stopPropagation()}>
              <div className="cdv-popover-title">Applications in progress</div>
              {inProgressApps.length > 0 ? (
                <>
                  <div className="cdv-popover-list">
                    {inProgressApps.map(a => {
                      const appNo = a.fapNumber || a.application_number || a.applicationNumber || a.id;
                      const stageLabel = a.stageName || a.stage || 'In progress';
                      return (
                        <div key={a.id} className="cdv-popover-row" onClick={() => onOpenApplication(a.application_number || a.id)}>
                          <div className="cdv-popover-left">
                            <Clock size={15} color="#2563eb" style={{marginTop: 2, flexShrink: 0}} />
                            <div>
                              <div className="cdv-popover-app">{appNo}</div>
                              <div className="cdv-popover-sub">{stageLabel}</div>
                            </div>
                          </div>
                          <span className="cdv-popover-amt">{formatFullRp(getAppAmount(a))}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cdv-popover-total">
                    <span>Total</span>
                    <span>{formatFullRp(totalInProgressAmt)}</span>
                  </div>
                </>
              ) : (
                <div className="cdv-popover-sub">No applications in progress.</div>
              )}
            </div>
          )}
        </div>

        <div
          className={`cdv-kpi-card is-clickable ${popover === 'pic' ? 'is-open' : ''}`}
          onClick={() => setPopover(p => (p === 'pic' ? null : 'pic'))}
        >
          <div className="cdv-kpi-label">PIC Marketing</div>
          <div className="cdv-kpi-value-row">
            <span className="cdv-kpi-value">{picEntries.length}</span>
            <span className="cdv-kpi-sub">
              PIC{picEntries.length !== 1 ? 's' : ''} · Branch {customer.branch} <ChevronDown size={12} />
            </span>
          </div>

          {popover === 'pic' && (
            <div className="cdv-popover" style={{right: 0, left: 'auto'}} onClick={e => e.stopPropagation()}>
              <div className="cdv-popover-title">PIC Marketing ({picEntries.length})</div>
              {picEntries.length > 0 ? (
                <div className="cdv-popover-list">
                  {picEntries.map(pic => (
                    <div
                      key={pic.name}
                      className="cdv-popover-row"
                      onClick={() => {
                        const target = pic.apps[0];
                        if (target) onOpenApplication(target.application_number || target.id);
                      }}
                    >
                      <div className="cdv-popover-left">
                        <span className="cdv-avatar" style={{width: 24, height: 24, fontSize: 10.5}}>
                          {pic.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="cdv-popover-app">{pic.name}</div>
                          <div className="cdv-popover-sub">
                            Branch {pic.branch} · {pic.apps.length} application{pic.apps.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} color="#94a3b8" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cdv-popover-sub">No PIC Marketing assigned yet.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="cdv-tabs" role="tablist">
        {(
          [
            ['overview', 'Overview'],
            ['applications', `Applications (${apps.length})`],
            ['documents', `Documents (${totalDocsCount || docChecks.length})`],
            ['contacts', `Contacts (${stakeholders.length})`],
            ['activity', 'Activity'],
          ] as const
        ).map(([key, lbl]) => (
          <button
            key={key}
            type="button"
            className={`cdv-tab-btn ${subTab === key ? 'is-active' : ''}`}
            onClick={() => setSubTab(key)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {subTab === 'overview' && (
        <div className="cdv-overview-grid">
          <div className="cdv-col">
            <div className="cdv-card">
              <div className="cdv-card-head">
                <h3 className="cdv-card-title">Applications</h3>
                <button type="button" className="cdv-link-btn" onClick={() => setSubTab('applications')}>
                  See all {apps.length} <ChevronRight size={13} />
                </button>
              </div>
              <div className="cdv-app-list">
                {apps.slice(0, 3).map(a => {
                  const st = statusMeta(a);
                  const appNo = a.fapNumber || a.application_number || a.applicationNumber || a.id;
                  const amt = getAppAmount(a);
                  const created = a.application_date || a.created_at || a.createdAt;
                  const stageLabel = a.stageName || a.stage || 'FAP';
                  return (
                    <div key={a.id} className="cdv-app-item">
                      <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                          <strong style={{fontSize: 13.5, color: '#0f172a'}}>{appNo}</strong>
                          <span className={`cust-status-pill ${st.tone}`}>
                            <span className="cust-status-dot" />
                            {st.label}
                          </span>
                        </div>
                        <div className="cdv-popover-sub" style={{marginTop: 4}}>
                          {amt > 0 ? formatFullRp(amt) : 'Financing application'}
                          {created ? ` · Created ${date(created)}` : ''}
                        </div>
                      </div>
                      <div className="cdv-app-right">
                        <span className="cdv-stage-dots">{stageLabel}</span>
                        <button
                          type="button"
                          className="cdv-link-btn"
                          onClick={() => onOpenApplication(a.application_number || a.id)}
                        >
                          Open application <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {apps.length === 0 && <div className="cdv-popover-sub">No applications yet.</div>}
              </div>
            </div>

            <div className="cdv-card">
              <div className="cdv-card-head">
                <div>
                  <h3 className="cdv-card-title">Documents on file</h3>
                  {latestAppNo && (
                    <div style={{fontSize: 11.5, color: '#64748b', marginTop: 2}}>
                      From latest application: {latestAppNo}
                    </div>
                  )}
                </div>
                <button type="button" className="cdv-link-btn" onClick={() => setSubTab('documents')}>
                  Open Documents <ChevronRight size={13} />
                </button>
              </div>
              <div className="cdv-doc-list">
                {docChecks.slice(0, 5).map((d: any) => {
                  const hasFile = (d.files || []).length > 0;
                  return (
                    <div key={d.id} className="cdv-doc-row">
                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        {hasFile ? (
                          <CheckCircle2 size={15} color="#16a34a" />
                        ) : (
                          <AlertCircle size={15} color="#d97706" />
                        )}
                        <span style={{fontWeight: 500, color: '#0f172a'}}>{d.documentName || d.documentCode}</span>
                      </div>
                      <span style={{color: hasFile ? '#64748b' : '#b45309', fontSize: 12}}>
                        {hasFile ? `${d.files.length} file(s)` : 'Missing file'}
                      </span>
                    </div>
                  );
                })}
                {docChecks.length === 0 && <div className="cdv-popover-sub">No documents loaded yet.</div>}
              </div>
            </div>
          </div>

          <div className="cdv-col">
            <div className="cdv-card">
              <div className="cdv-card-head">
                <h3 className="cdv-card-title">Company details</h3>
              </div>
              <dl className="cdv-dl">
                <dt>Legal name</dt>
                <dd>{customer.companyName}</dd>
                <dt>Business</dt>
                <dd>{mainBusiness}</dd>
                <dt>Customer type</dt>
                <dd>{customer.typeLabel || '—'}</dd>
                <dt>Address</dt>
                <dd>{address}</dd>
                <dt>Phone</dt>
                <dd>{phone}</dd>
                <dt>Website</dt>
                <dd>{website}</dd>
              </dl>
            </div>

            <div className="cdv-card">
              <div className="cdv-card-head">
                <h3 className="cdv-card-title">Key contacts</h3>
                <button type="button" className="cdv-link-btn" onClick={() => setSubTab('contacts')}>
                  All {stakeholders.length} <ChevronRight size={13} />
                </button>
              </div>
              <div className="cdv-contact-list">
                {stakeholders.slice(0, 4).map((s: any, i: number) => {
                  const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') || s.name || 'Contact';
                  const initial = fullName.charAt(0).toUpperCase();
                  return (
                    <div key={s.id || i} className="cdv-contact-row">
                      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <span className="cdv-avatar">{initial}</span>
                        <div>
                          <div style={{fontWeight: 600, color: '#0f172a'}}>{fullName}</div>
                          <div style={{fontSize: 11.5, color: '#64748b'}}>{s.position || s.role || 'Stakeholder'}</div>
                        </div>
                      </div>
                      <span className="cust-mono" style={{fontSize: 12, color: '#64748b'}}>
                        {s.phone || s.email || '—'}
                      </span>
                    </div>
                  );
                })}
                {stakeholders.length === 0 && <div className="cdv-popover-sub">No contacts recorded yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'applications' && (
        <div className="cdv-card">
          <div className="cdv-card-head">
            <h3 className="cdv-card-title">All Applications ({apps.length})</h3>
          </div>
          <div className="cdv-app-list">
            {apps.map(a => {
              const st = statusMeta(a);
              const appNo = a.fapNumber || a.application_number || a.applicationNumber || a.id;
              const amt = getAppAmount(a);
              const created = a.application_date || a.created_at || a.createdAt;
              return (
                <div key={a.id} className="cdv-app-item">
                  <div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <strong style={{fontSize: 13.5, color: '#0f172a'}}>{appNo}</strong>
                      <span className={`cust-status-pill ${st.tone}`}>
                        <span className="cust-status-dot" />
                        {st.label}
                      </span>
                    </div>
                    <div className="cdv-popover-sub" style={{marginTop: 4}}>
                      Stage: {a.stageName || a.stage || '—'} · {amt > 0 ? formatFullRp(amt) : 'Rp 0'}
                      {created ? ` · Created ${date(created)}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cust-detail-open-btn"
                    onClick={() => onOpenApplication(a.application_number || a.id)}
                  >
                    Open application <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'documents' && (
        <div className="cdv-col">
          {loadingDocs && Object.keys(detailsByAppId).length === 0 ? (
            <div className="cdv-card">
              <div className="cdv-popover-sub">Loading documents across applications...</div>
            </div>
          ) : apps.length === 0 ? (
            <div className="cdv-card">
              <div className="cdv-popover-sub">No applications found for this customer.</div>
            </div>
          ) : (
            apps.map(a => {
              const appDetail = detailsByAppId[a.id];
              const appNo = a.fapNumber || a.application_number || a.applicationNumber || a.id;
              const st = statusMeta(a);
              const checks: any[] = appDetail?.documentChecks || [];
              const wfStages: any[] = appDetail?.workflow?.stages || [];

              const stageMap = new Map<string, {code: string; name: string; docs: any[]}>();
              for (const ws of wfStages) {
                stageMap.set(ws.code, {code: ws.code, name: ws.name || ws.code, docs: []});
              }
              for (const chk of checks) {
                const sc = chk.stageCode || 'OTHER';
                if (!stageMap.has(sc)) {
                  stageMap.set(sc, {code: sc, name: chk.stageName || sc, docs: []});
                }
                stageMap.get(sc)!.docs.push(chk);
              }
              const stageGroups = [...stageMap.values()].filter(g => g.docs.length > 0);

              return (
                <div key={a.id} className="cdv-card">
                  <div className="cdv-card-head" style={{marginBottom: 12}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
                      <h3 className="cdv-card-title">{appNo}</h3>
                      <span className={`cust-status-pill ${st.tone}`}>
                        <span className="cust-status-dot" />
                        {st.label}
                      </span>
                      <span style={{fontSize: 12, color: '#64748b'}}>
                        {checks.length} document{checks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="cdv-link-btn"
                      onClick={() => onOpenApplication(a.application_number || a.id)}
                    >
                      Open application <ChevronRight size={13} />
                    </button>
                  </div>

                  {stageGroups.length > 0 ? (
                    <div className="cdv-doc-stages">
                      {stageGroups.map(sg => {
                        const uploadedCount = sg.docs.filter((d: any) => (d.files || []).length > 0).length;
                        return (
                          <div key={sg.code} className="cdv-doc-stage-box">
                            <div className="cdv-doc-stage-head">
                              <span className="cdv-doc-stage-name">{sg.name}</span>
                              <span className="cdv-doc-stage-count">
                                {uploadedCount}/{sg.docs.length} uploaded
                              </span>
                            </div>
                            <div className="cdv-doc-list" style={{gap: 0}}>
                              {sg.docs.map((d: any) => {
                                const hasFile = (d.files || []).length > 0;
                                return (
                                  <div key={d.id} className="cdv-doc-row cdv-doc-stage-row">
                                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                      {hasFile ? (
                                        <CheckCircle2 size={15} color="#16a34a" />
                                      ) : (
                                        <AlertCircle size={15} color="#d97706" />
                                      )}
                                      <span style={{fontWeight: 500, color: '#0f172a'}}>
                                        {d.documentName || d.documentCode}
                                      </span>
                                    </div>
                                    <span style={{color: hasFile ? '#15803d' : '#b45309', fontSize: 12, fontWeight: 600}}>
                                      {hasFile ? `${d.files.length} file(s) uploaded` : 'Missing file'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="cdv-popover-sub">
                      {appDetail ? 'No documents in this application.' : 'Loading documents...'}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {subTab === 'contacts' && (
        <div className="cdv-card">
          <div className="cdv-card-head">
            <h3 className="cdv-card-title">Contacts & Stakeholders ({stakeholders.length})</h3>
          </div>
          <div className="cdv-contact-list">
            {stakeholders.map((s: any, i: number) => {
              const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') || s.name || 'Contact';
              return (
                <div key={s.id || i} className="cdv-contact-row" style={{padding: '8px 0', borderBottom: '1px solid #f1f5f9'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <span className="cdv-avatar">{fullName.charAt(0).toUpperCase()}</span>
                    <div>
                      <div style={{fontWeight: 600, color: '#0f172a'}}>{fullName}</div>
                      <div style={{fontSize: 11.5, color: '#64748b'}}>{s.position || s.role || 'Stakeholder'}</div>
                    </div>
                  </div>
                  <span className="cust-mono" style={{fontSize: 12.5, color: '#475569'}}>
                    {s.phone || s.email || '—'}
                  </span>
                </div>
              );
            })}
            {stakeholders.length === 0 && <div className="cdv-popover-sub">No contacts recorded yet.</div>}
          </div>
        </div>
      )}

      {subTab === 'activity' && (
        <div className="cdv-card">
          <div className="cdv-card-head">
            <h3 className="cdv-card-title">Recent Activity</h3>
          </div>
          <div className="cdv-doc-list">
            {approvalLogs.map((log: any) => (
              <div key={log.id} className="cdv-doc-row" style={{padding: '8px 0', borderBottom: '1px solid #f1f5f9'}}>
                <div>
                  <div style={{fontWeight: 600, color: '#0f172a'}}>
                    {log.step} · {log.action}
                  </div>
                  <div style={{fontSize: 11.5, color: '#64748b'}}>
                    by {log.actionBy}
                    {log.comments ? ` — "${log.comments}"` : ''}
                  </div>
                </div>
                <span style={{fontSize: 11.5, color: '#64748b'}}>{log.actionTimestamp ? date(log.actionTimestamp) : ''}</span>
              </div>
            ))}
            {approvalLogs.length === 0 && <div className="cdv-popover-sub">No approval activity recorded yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
