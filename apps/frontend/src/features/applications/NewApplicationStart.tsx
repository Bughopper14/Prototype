/**
 * Start of a new application. It looks like the application page, but everything below the heading is locked: the only
 * thing to fill is who the debtor is, then save. The forms open after the save.
 */
import {api} from '@/shared/lib/api';
import {formatCompanyName} from '@liugong/shared';
import {IconBox} from '@/shared/ui/IconBox';
import {masterEntries, useMasterData} from '@/shared/master-data';
import {useSession} from '@/shared/lib/session';
import {ArrowLeft, Building2, Check, Lock, Save, Search, UserCheck} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {GroupedStepper, type StageGroup} from '@/features/applications/components/GroupedStepper';
import {stageTabOrder, TABS} from '@/features/applications/lib/workspace/tabs';
import {screenOf, type WorkflowStage} from '@/features/applications/lib/workspace/stage';

type Kind = 'NEW' | 'EXISTING';

type MarketingPicUser = {
  id: number;
  username: string;
  fullName?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
};

/** Searchable Marketing PIC list: full name, username, and department. */
function MarketingPicPicker({
  users,
  value,
  onChange,
}: {
  users: MarketingPicUser[];
  value: number | '';
  onChange: (id: number | '') => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const chosen = users.find(u => u.id === value);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users.filter(
      u =>
        !t ||
        (u.fullName || '').toLowerCase().includes(t) ||
        (u.username || '').toLowerCase().includes(t) ||
        (u.departmentName || '').toLowerCase().includes(t) ||
        (u.departmentCode || '').toLowerCase().includes(t),
    );
  }, [users, q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const displayName = (u: MarketingPicUser) => u.fullName || u.username;
  const detail = (u: MarketingPicUser) => u.departmentName || '';

  return (
    <div className="cust-pick" ref={box} style={{flex: '1 1 320px'}}>
      <input
        className="new-app-input"
        aria-label="Marketing PIC"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        placeholder="Assign Marketing PIC (required)"
        value={open || !chosen ? q : displayName(chosen)}
        onFocus={() => {
          setQ('');
          setOpen(true);
        }}
        onChange={e => {
          setQ(e.target.value);
          setOpen(true);
          if (value) onChange('');
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && open && shown.length) {
            onChange(shown[0].id);
            setOpen(false);
          }
        }}
      />
      <Search size={15} className="cust-pick-icon" />
      {open && (
        <div className="cust-pick-pop">
          <ul role="listbox">
            {shown.map(u => (
              <li
                key={u.id}
                role="option"
                aria-selected={u.id === value}
                className={u.id === value ? 'on' : ''}
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(u.id);
                  setOpen(false);
                }}
              >
                <span>
                  <b>{displayName(u)}</b>
                  {detail(u) && <small>{detail(u)}</small>}
                </span>
                {u.id === value && <Check size={15} />}
              </li>
            ))}
            {!shown.length && <li className="empty">No marketing PIC found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Searchable customer list: the name, plus NPWP / NIB and business category so customers with the same name can be told apart. */
function CustomerPicker({customers, value, onChange}: {customers: any[]; value: string; onChange: (id: string) => void}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const chosen = customers.find(c => c.id === value);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers.filter(c => !t || `${c.companyName} ${c.npwp || ''} ${c.nib || ''}`.toLowerCase().includes(t));
  }, [customers, q]);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const detail = (c: any) => [c.npwp && `NPWP ${c.npwp}`, c.nib && `NIB ${c.nib}`, c.companyType].filter(Boolean).join(', ');
  return (
    <div className="cust-pick" ref={box}>
      <input
        className="new-app-input"
        aria-label="Customer"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        placeholder="Search customer by name, NPWP or NIB"
        value={open || !chosen ? q : chosen.companyName}
        onFocus={() => {
          setQ('');
          setOpen(true);
        }}
        onChange={e => {
          setQ(e.target.value);
          setOpen(true);
          if (value) onChange('');
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && open && shown.length) {
            onChange(shown[0].id);
            setOpen(false);
          }
        }}
      />
      <Search size={15} className="cust-pick-icon" />
      {open && (
        <div className="cust-pick-pop">
          <ul role="listbox">
            {shown.map(c => (
              <li
                key={c.id}
                role="option"
                aria-selected={c.id === value}
                className={c.id === value ? 'on' : ''}
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(c.id);
                  setOpen(false);
                }}
              >
                <span>
                  <b>{c.companyName}</b>
                  {detail(c) && <small>{detail(c)}</small>}
                </span>
                {c.id === value && <Check size={15} />}
              </li>
            ))}
            {!shown.length && <li className="empty">No customer found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function NewApplicationStart({
  customers,
  preselectedCustomerId,
  onBack,
  onCreated,
  notify,
}: {
  customers: any[];
  preselectedCustomerId?: string;
  onBack: () => void;
  onCreated: (applicationId: string) => void;
  notify: (message: string) => void;
}) {
  const sessionUser = useSession();
  const currentUserId = sessionUser?.portalUserId ? Number(sessionUser.portalUserId) : null;
  const master = useMasterData();
  const [kind, setKind] = useState<Kind>(preselectedCustomerId ? 'EXISTING' : 'NEW');
  const [companyName, setCompanyName] = useState('');
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [branchCode, setBranchCode] = useState('');
  const branches = useMemo(() => (masterEntries(master, 'branchCode', {}) || []).filter((b: any) => b.active), [master]);
  const [marketingPics, setMarketingPics] = useState<MarketingPicUser[]>([]);
  const [mktPicId, setMktPicId] = useState<number | ''>('');

  useEffect(() => {
    api('/marketing-pics')
      .then((data: any) => {
        if (Array.isArray(data)) {
          if (sessionUser && currentUserId && !data.some((u: any) => u.id === currentUserId)) {
            data.unshift({
              id: currentUserId,
              username: sessionUser.username,
              fullName: sessionUser.name,
              departmentName: sessionUser.role || 'Current User',
            });
          }
          setMarketingPics(data);
        }
      })
      .catch(() => undefined);
  }, [sessionUser, currentUserId]);

  // PIC Marketing defaults to the account that creates the application (it can be changed, never left empty).
  useEffect(() => {
    if (currentUserId) setMktPicId(prev => (prev === '' ? currentUserId : prev));
  }, [currentUserId]);

  const handleAssignMyself = () => {
    if (currentUserId) setMktPicId(currentUserId);
  };

  // The groups and stages of the active workflow (the same ones the saved application will show).
  const [layout, setLayout] = useState<{groups: StageGroup[]; stages: WorkflowStage[]}>({groups: [], stages: []});
  useEffect(() => {
    api('/workflows/layout').then(r => setLayout({groups: r.groups || [], stages: r.stages || []})).catch(() => undefined);
  }, []);
  const tabIds = stageTabOrder(layout.stages[0] ? screenOf(layout.stages[0]) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sorted = useMemo(() => [...customers].sort((a, b) => String(a.companyName || '').localeCompare(String(b.companyName || ''))), [customers]);
  const ready = (kind === 'NEW' ? !!companyName.trim() : !!customerId) && !!mktPicId;

  async function save() {
    setBusy(true);
    setError('');
    try {
      const name = formatCompanyName(companyName.trim());
      const extra = {
        ...(branchCode ? {branchCode} : {}),
        ...(mktPicId ? {mktPicId: Number(mktPicId)} : {}),
      };
      const body =
        kind === 'NEW'
          ? {
              companyName: name,
              customer: {companyName: name},
              customerCategory: 'NEW',
              ...extra,
            }
          : {
              customerId,
              customerCategory: 'EXISTING',
              ...extra,
            };
      const application = await api('/applications', 'POST', body);
      notify('Application saved.');
      onCreated(application.id);
    } catch (e: any) {
      const message = e.message || 'Could not save the application.';
      setError(message);
      notify(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="text-link back-link" onClick={onBack}>
        <ArrowLeft size={15} />
        Back to workspace
      </button>

      <div className="detail-heading">
        <IconBox>
          <Building2 size={25} />
        </IconBox>
        <div style={{flex: 1, minWidth: 0}}>
          <div className="eyebrow">NEW APPLICATION</div>
          <div className="new-app-bar">
            <div className="new-app-kind" role="radiogroup" aria-label="Customer">
              <button type="button" role="radio" aria-checked={kind === 'NEW'} className={kind === 'NEW' ? 'on' : ''} onClick={() => setKind('NEW')}>
                New customer
              </button>
              <button type="button" role="radio" aria-checked={kind === 'EXISTING'} className={kind === 'EXISTING' ? 'on' : ''} onClick={() => setKind('EXISTING')}>
                Existing customer
              </button>
            </div>
            {kind === 'NEW' ? (
              <input
                className="new-app-input"
                value={companyName}
                autoFocus
                placeholder="Company name (required)"
                aria-label="Company name"
                onChange={e => setCompanyName(formatCompanyName(e.target.value))}
                onBlur={() => setCompanyName(prev => formatCompanyName(prev.trim()))}
                onKeyDown={e => e.key === 'Enter' && ready && !busy && void save()}
              />
            ) : (
              <CustomerPicker customers={sorted} value={customerId} onChange={setCustomerId} />
            )}
            <select className="new-app-input new-app-branch" value={branchCode} aria-label="Branch" onChange={e => setBranchCode(e.target.value)}>
              <option value="">No branch yet</option>
              {branches.map((b: any) => (
                <option key={b.value} value={b.value}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="new-app-bar" style={{marginTop: '10px'}}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#e2e8f0',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                flex: 'none',
              }}
            >
              Marketing PIC
            </div>
            <MarketingPicPicker users={marketingPics} value={mktPicId} onChange={setMktPicId} />
            {currentUserId && (
              <button
                type="button"
                className={`button ${mktPicId === currentUserId ? 'on' : ''}`}
                onClick={handleAssignMyself}
                style={{
                  flex: '0 0 auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  background: mktPicId === currentUserId ? '#eff6ff' : '#f8fafc',
                  border: mktPicId === currentUserId ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  color: mktPicId === currentUserId ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                title="Gunakan akun saya sendiri sebagai Marketing PIC"
              >
                <UserCheck size={15} style={{color: mktPicId === currentUserId ? '#2563eb' : '#64748b'}} />
                {mktPicId === currentUserId ? 'Assigned to me' : 'Assign to me'}
              </button>
            )}
            <button className="button primary" disabled={busy || !ready} onClick={save} style={{flex: '0 0 auto'}}>
              <Save size={16} /> {busy ? 'Saving…' : 'Save application'}
            </button>
          </div>
          <p>Save the application first. The forms open once it is saved.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="new-app-locked" aria-disabled="true">
        <span className="new-app-lock-note">
          <Lock size={14} /> Locked until the application is saved
        </span>
        <GroupedStepper
          stages={layout.stages.map(s => ({value: s.code, name: s.name}))}
          groups={layout.groups}
          step={(stage, first) => (
            <div key={stage.value} className={`chevron-step ${first ? 'first' : ''} inactive`}>
              {stage.name}
            </div>
          )}
        />
        <div className="detail-summary">
          <div>
            <span>Proposed Financing</span>
            <b>Rp 0</b>
          </div>
          <div>
            <span>Financing Term</span>
            <b>0 months</b>
          </div>
          <div>
            <span>Customer Category</span>
            <b>{kind === 'EXISTING' ? 'Existing Customer' : 'New Customer'}</b>
          </div>
          <div>
            <span>Documents Verified</span>
            <b>0 / 0</b>
          </div>
        </div>
        <div className="detail-tabs">
          {tabIds.map((id, i) => (
            <button key={id} className={i === 0 ? 'active' : ''} tabIndex={-1} disabled>
              {TABS[id]}
            </button>
          ))}
        </div>
        <section className="panel form-panel">
          <div className="panel-head">
            <div>
              <h2>{TABS[tabIds[0]]}</h2>
            </div>
          </div>
          <div className="form-body" style={{minHeight: 180}} />
        </section>
      </div>
    </>
  );
}
