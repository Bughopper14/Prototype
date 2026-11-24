import {ApplicationTable} from '@/features/applications/components/ApplicationTable';
import {isTerminalStatus, useMasterData, workflowStages, workflowStatuses} from '@/shared/master-data';
import {money} from '@/shared/lib/format';
import {checkIsAdmin} from '@/shared/lib/auth';
import {DEED_EDIT_AUTHORITY} from '@liugong/shared';
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

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
  // Which applications need this user: derived from the authorities of the user's DB role (administrators have none)
  const has = (authority: string) => !checkIsAdmin(user) && (user.authorities || []).includes(authority);
  const hasRejectedDeed = (r: any) => Number(r.deeds_sent_back) > 0;
  const master = useMasterData();
  // Rejected: a step was rejected and the application waits for the fix and a new submit.
  const isReturned = (r: any) => r.status === 'REJECTED';
  const needs = rows.filter(
    r =>
      (has(DEED_EDIT_AUTHORITY) && hasRejectedDeed(r)) ||
      // An approval step that waits for an authority this user holds
      (!checkIsAdmin(user) && r.pending_for_me),
  );
  const total = rows.reduce((s, r) => s + Number(r.financing_value || 0), 0),
    // Workflow stages and statuses come from Master Data; the first final status is the approval.
    finalStatus = workflowStatuses(master).find(s => s.terminal),
    approved = rows.filter(r => finalStatus && r.status === finalStatus.value),
    review = rows.filter(r => r.status === 'IN_APPROVAL');
  const stages: [string, string, (r: any) => boolean][] = [
    ...workflowStages(master).map(
      st => [st.value, st.name, (r: any) => r.workflow_stage === st.value && !isTerminalStatus(r.status, master)] as [string, string, (r: any) => boolean],
    ),
    // every final status (Approved, Rejected) has its own card
    ...workflowStatuses(master)
      .filter(st => st.terminal)
      .map(st => [st.value, st.name, (r: any) => r.status === st.value] as [string, string, (r: any) => boolean]),
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
            {stages.map(([s, l, match], i) => {
              const count = rows.filter(match).length;
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
                              Math.max(1, ...stages.map(([, , m]) => rows.filter(m).length))) *
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
                  r.application_number || r.id,
                  hasRejectedDeed(r)
                    ? 5
                    : 0,
                )
              }
            >
              <span className={'attention-icon ' + (isReturned(r) ? 'orange' : '')}>
                <AlertCircle size={18} />
              </span>
              <div>
                <b>
                  {has(DEED_EDIT_AUTHORITY) && hasRejectedDeed(r)
                      ? 'Revise the returned deed'
                      : isReturned(r)
                        ? 'Fix what was rejected'
                        : r.pending_for_me
                          ? 'Approval waits for you'
                          : r.status === 'IN_PROGRESS'
                            ? 'Complete your draft'
                            : 'Review application'}
                </b>
                <span>{r.company_name}</span>
                <small>{r.application_number || r.id}</small>
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
