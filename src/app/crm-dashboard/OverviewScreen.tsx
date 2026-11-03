import {ApplicationTable} from '@/components/crm/application/ApplicationTable';
import {reviewStatus} from '@/lib/shared/deed-workflow';
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Check,
  Clock,
  ShieldCheck,
  BriefcaseBusiness,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import {money} from '@/lib/client/format';

export function OverviewScreen({
  rows,
  user,
  open,
  navigate,
}: {
  rows: any[];
  user: any;
  open: (id: string, tab?: number) => void;
  navigate: (p: string) => void;
}) {
  const needs = rows.filter(r =>
    user.role === 'MKT'
      ? ['DRAFT', 'RETURNED'].includes(r.status) ||
        (r.legal?.deeds || []).some((d: any) => reviewStatus(d) === 'REJECTED')
      : user.role === 'BS'
        ? (r.legal?.deeds || []).some((d: any) => reviewStatus(d) === 'PENDING_CHECK')
        : user.role === 'HEAD_BS'
          ? (r.legal?.deeds || []).some((d: any) => reviewStatus(d) === 'PENDING_APPROVAL')
          : user.role === 'CA' || user.role === 'LEGAL'
            ? r.status === 'IN_CA_LEGAL_REVIEW'
            : user.role === 'COMMITTEE'
              ? r.status === 'CREDIT_COMMITTEE_REVIEW'
              : false,
  );
  const total = rows.reduce((s, r) => s + Number(r.financing_value || 0), 0),
    approved = rows.filter(r => r.status === 'APPROVED'),
    review = rows.filter(r =>
      ['SUBMITTED_TO_BS', 'BS_VERIFIED', 'IN_CA_LEGAL_REVIEW', 'CREDIT_COMMITTEE_REVIEW'].includes(r.status),
    );
  const stages = [
    ['DRAFT', 'Draft'],
    ['SUBMITTED_TO_BS', 'BS verification'],
    ['IN_CA_LEGAL_REVIEW', 'CA & Legal'],
    ['CREDIT_COMMITTEE_REVIEW', 'Committee'],
    ['APPROVED', 'Approved'],
  ];
  return (
    <>
      <div className="stats-grid">
        {[
          [BriefcaseBusiness, 'Total applications', String(rows.length), 'Across all branches'],
          [Wallet, 'Financing portfolio', money(total, true), 'Total requested financing'],
          [Clock, 'In review', String(review.length), 'Moving through the workflow'],
          [
            ShieldCheck,
            'Approved financing',
            money(
              approved.reduce((s, r) => s + Number(r.financing_value), 0),
              true,
            ),
            approved.length + ' approved applications',
          ],
        ].map(([Icon, title, value, sub]: any, i) => (
          <div className={'stat-card stat-' + i} key={title}>
            <div className="stat-top">
              <span>{title}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>
              {i === 3 ? (
                <span className="tiny-brand">
                  <Check size={13} />
                </span>
              ) : (
                <span className="stat-dot" />
              )}
              {sub}
            </small>
          </div>
        ))}
      </div>
      <div className="overview-mid">
        <section className="panel pipeline">
          <div className="panel-head">
            <div>
              <h2>Application pipeline</h2>
              <p>From opportunity to approval</p>
            </div>
            <span className="subtle-chip">
              All applications <ChevronDown size={13} />
            </span>
          </div>
          <div className="pipeline-chart">
            {stages.map(([s, l], i) => {
              const count = rows.filter(
                r => r.status === s || (s === 'SUBMITTED_TO_BS' && r.status === 'BS_VERIFIED'),
              ).length;
              return (
                <button className="pipeline-stage" key={s} onClick={() => navigate('Applications')}>
                  <div className="bar-top">
                    <strong>{String(count).padStart(2, '0')}</strong>
                    <span>{rows.length ? Math.round((count / rows.length) * 100) : 0}%</span>
                  </div>
                  <div className="bar-track">
                    <div
                      style={{
                        height:
                          Math.max(
                            8,
                            (count /
                              Math.max(1, ...stages.map(([s]) => rows.filter(r => r.status === s).length))) *
                              100,
                          ) + '%',
                      }}
                      className={'bar bar-' + i}
                    />
                  </div>
                  <span>{l}</span>
                </button>
              );
            })}
          </div>
          <div className="pipeline-foot">
            <span>
              <i /> {review.length} applications are currently under review
            </span>
            <button className="text-link" onClick={() => navigate('Applications')}>
              View pipeline <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <section className="attention panel">
          <div className="panel-head">
            <h2>Needs attention</h2>
            <span className="count-pill">{needs.length}</span>
          </div>
          {needs.slice(0, 3).map(r => (
            <button
              className="attention-item"
              key={r.id}
              onClick={() =>
                open(
                  r.id,
                  ['BS', 'HEAD_BS'].includes(user.role) ||
                    r.legal?.deeds?.some((d: any) => reviewStatus(d) === 'REJECTED')
                    ? 5
                    : 0,
                )
              }
            >
              <span className={'attention-icon ' + (r.status === 'RETURNED' ? 'orange' : '')}>
                <AlertCircle size={18} />
              </span>
              <div>
                <b>
                  {user.role === 'BS'
                    ? 'Review deed document'
                    : user.role === 'HEAD_BS'
                      ? 'Approve deed document'
                      : user.role === 'MKT'
                        ? r.legal?.deeds?.some((d: any) => reviewStatus(d) === 'REJECTED')
                          ? 'Fix the rejected deed'
                          : r.status === 'RETURNED'
                            ? 'Application returned'
                            : 'Complete your draft'
                        : 'Review application'}
                </b>
                <span>{r.company_name}</span>
                <small>{r.fap_number}</small>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
          {!needs.length && <div className="empty-small">You’re all caught up.</div>}
          <div className="attention-bottom">
            <ShieldCheck size={17} />
            <span>Complete documents keep financing moving.</span>
          </div>
        </section>
      </div>
      <ApplicationTable rows={rows} open={open} compact onViewAll={() => navigate('Applications')} />
    </>
  );
}
