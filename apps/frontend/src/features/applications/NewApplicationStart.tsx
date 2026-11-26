/**
 * Centered "New application" modal dialog.
 * Covers all 6 flows:
 *  1. Create application for a new customer
 *  2. Create application for an existing customer
 *  3. Inline validation when required fields are empty
 *  4. Existing customer not found -> switch & prefill as new customer
 *  5. Change PIC Marketing (searchable user list, defaults to current user)
 *  6. Company name already registered -> inline warning to switch & select existing customer
 */
import {api} from '@/shared/lib/api';
import {useSession} from '@/shared/lib/session';
import {masterEntries, useMasterData} from '@/shared/master-data';
import {formatCompanyName, label} from '@liugong/shared';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';

type Kind = 'NEW' | 'EXISTING';

export type CreatedApplicationInfo = {
  id: string;
  applicationNumber: string;
  companyName: string;
};

type MarketingPicUser = {
  id: number;
  username: string;
  fullName?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
};

function normalizeFullName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCoreName(name: string): string {
  return normalizeFullName(name)
    .replace(/^(pt|cv|ud|pd|firma|fa|yayasan|koperasi)\s+/i, '')
    .replace(/\s+(tbk|persero)$/i, '')
    .trim();
}

function customerSubtitle(c: any): string {
  const npwp = String(c.npwp ?? '').trim();
  const nib = String(c.nib ?? '').trim();
  return [
    npwp && `NPWP ${npwp}`,
    nib && `NIB ${nib}`,
    c.companyType && label(c.companyType),
  ]
    .filter(Boolean)
    .join(' \u00B7 ');
}

/** Custom Branch dropdown matching the mockup popover style. */
function BranchPicker({
  branches,
  value,
  hasError,
  onChange,
}: {
  branches: {value: string; name: string}[];
  value: string;
  hasError?: boolean;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = branches.find(b => b.value === value);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const formatBranch = (b: {value: string; name: string}) =>
    b.name && b.name !== b.value ? `${b.name}` : b.value;

  return (
    <div className="na-picker" ref={boxRef}>
      <button
        type="button"
        className={`na-control na-select-btn ${open ? 'is-open' : ''} ${hasError ? 'is-invalid' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Branch"
        onClick={() => setOpen(o => !o)}
      >
        <span className={selected ? 'na-select-val' : 'na-select-ph'}>
          {selected ? formatBranch(selected) : 'Select branch'}
        </span>
        <ChevronDown size={15} className={`na-chevron ${open ? 'rot' : ''}`} />
      </button>

      {open && (
        <div className="na-popover na-branch-pop" role="listbox" aria-label="Branches">
          <ul className="na-pop-list">
            {branches.map(b => {
              const active = b.value === value;
              return (
                <li
                  key={b.value}
                  role="option"
                  aria-selected={active}
                  className={`na-pop-item ${active ? 'on' : ''}`}
                  onMouseDown={e => {
                    e.preventDefault();
                    onChange(b.value);
                    setOpen(false);
                  }}
                >
                  <span className="na-branch-item-text">
                    <b>{formatBranch(b)}</b>
                  </span>
                  {active && <Check size={14} className="na-check" />}
                </li>
              );
            })}
            {!branches.length && <li className="na-pop-empty-simple">No active branches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Searchable PIC Marketing dropdown (Flow 5), defaulting to the logged-in user. */
function MarketingPicPicker({
  users,
  value,
  currentUserId,
  hasError,
  onChange,
}: {
  users: MarketingPicUser[];
  value: number | '';
  currentUserId: number | null;
  hasError?: boolean;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const chosen = users.find(u => u.id === value);
  const displayName = (u: MarketingPicUser) => u.fullName || u.username;
  const initialOf = (u: MarketingPicUser) =>
    displayName(u)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase() || 'U';

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = users.filter(
      u =>
        !t ||
        (u.fullName || '').toLowerCase().includes(t) ||
        (u.username || '').toLowerCase().includes(t) ||
        (u.departmentName || '').toLowerCase().includes(t) ||
        (u.departmentCode || '').toLowerCase().includes(t),
    );
    // Keep current user at top when not filtering or matching
    return [...list].sort((a, b) => {
      if (a.id === currentUserId && b.id !== currentUserId) return -1;
      if (b.id === currentUserId && a.id !== currentUserId) return 1;
      return displayName(a).localeCompare(displayName(b));
    });
  }, [users, q, currentUserId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <div className="na-picker" ref={boxRef}>
      <button
        type="button"
        className={`na-control na-select-btn ${open ? 'is-open' : ''} ${hasError ? 'is-invalid' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="PIC Marketing"
        onClick={() => setOpen(o => !o)}
      >
        {chosen ? (
          <span className="na-select-val">
            {displayName(chosen)}
            {chosen.id === currentUserId ? ' (me)' : ''}
          </span>
        ) : (
          <span className="na-select-ph">Select PIC Marketing</span>
        )}
        <ChevronDown size={15} className={`na-chevron ${open ? 'rot' : ''}`} />
      </button>

      {open && (
        <div className="na-popover na-pic-pop">
          <div className="na-pop-search">
            <Search size={14} />
            <input
              ref={searchRef}
              type="text"
              value={q}
              placeholder="Search user…"
              aria-label="Search PIC Marketing"
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setOpen(false);
                }
                if (e.key === 'Enter' && shown.length) {
                  e.preventDefault();
                  onChange(shown[0].id);
                  setOpen(false);
                }
              }}
            />
          </div>
          <ul className="na-pop-list" role="listbox">
            {shown.map(u => {
              const active = u.id === value;
              const isMe = u.id === currentUserId;
              const dept = u.departmentCode || u.departmentName || '';
              return (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={active}
                  className={`na-pop-item ${active ? 'on' : ''}`}
                  onMouseDown={e => {
                    e.preventDefault();
                    onChange(u.id);
                    setOpen(false);
                  }}
                >
                  <span className="na-pic-row">
                    <span className={`na-pic-avatar ${isMe ? 'me' : ''}`}>{initialOf(u)}</span>
                    <span className="na-pic-meta">
                      <b>
                        {displayName(u)}
                        {isMe ? ' (me)' : ''}
                      </b>
                    </span>
                  </span>
                  <span className="na-pic-right">{dept && <span className="na-dept-pill">{dept}</span>}</span>
                </li>
              );
            })}
            {!shown.length && <li className="na-pop-empty-simple">No PIC found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Existing Customer field (Flows 2 & 4):
 * - Searchable dropdown by company name, NPWP, or NIB
 * - Empty state offers "+ Create '...' as new customer" (Flow 4)
 * - Selected state renders a customer summary chip with clear button (Flow 2 Screen 3 & Flow 6 Screen 2)
 */
function ExistingCustomerField({
  customers,
  value,
  hasError,
  onSelect,
  onClear,
  onCreateAsNew,
}: {
  customers: any[];
  value: string;
  hasError?: boolean;
  onSelect: (id: string) => void;
  onClear: () => void;
  onCreateAsNew: (typedName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chosen = useMemo(() => customers.find(c => c.id === value), [customers, value]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(c =>
      `${c.companyName || ''} ${c.npwp || ''} ${c.nib || ''} ${c.customerNo || ''}`.toLowerCase().includes(t),
    );
  }, [customers, q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (chosen) {
    const sub = customerSubtitle(chosen);
    return (
      <div className="na-selected-customer">
        <span className="na-selected-icon">
          <LayoutGrid size={16} />
        </span>
        <span className="na-selected-info">
          <b>{chosen.companyName}</b>
          <small>{sub || 'Registered customer'}</small>
        </span>
        <button
          type="button"
          className="na-selected-clear"
          aria-label="Change customer"
          onClick={() => {
            onClear();
            setQ('');
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="na-picker" ref={boxRef}>
      <div className={`na-search-input-wrap ${open ? 'is-open' : ''} ${hasError ? 'is-invalid' : ''}`}>
        <Search size={15} className="na-search-lead" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label="Customer"
          autoComplete="off"
          placeholder="Search company name, NPWP, or NIB"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
            if (e.key === 'Enter' && open && shown.length) {
              e.preventDefault();
              onSelect(shown[0].id);
              setOpen(false);
            }
          }}
        />
        {q && (
          <button
            type="button"
            className="na-input-clear"
            aria-label="Clear search"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="na-popover na-customer-pop">
          {shown.length > 0 ? (
            <>
              <div className="na-pop-meta-bar">
                {q.trim()
                  ? `${shown.length} matching customer${shown.length === 1 ? '' : 's'}`
                  : `${customers.length} registered customer${customers.length === 1 ? '' : 's'}`}
              </div>
              <ul className="na-pop-list" role="listbox">
                {shown.slice(0, 50).map(c => {
                  const sub = customerSubtitle(c);
                  return (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={c.id === value}
                      className="na-pop-item"
                      onMouseDown={e => {
                        e.preventDefault();
                        onSelect(c.id);
                        setOpen(false);
                      }}
                    >
                      <span className="na-cust-item">
                        <b>{c.companyName}</b>
                        {sub && <small>{sub}</small>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="na-empty-customer">
              <p>
                {q.trim() ? `No customer found for \u201C${q.trim()}\u201D` : 'No registered customers yet'}
              </p>
              {q.trim() && (
                <button
                  type="button"
                  className="na-switch-new-btn"
                  onMouseDown={e => {
                    e.preventDefault();
                    setOpen(false);
                    onCreateAsNew(q.trim());
                  }}
                >
                  <span>Create as new customer</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NewApplicationModal({
  customers,
  preselectedCustomerId,
  onClose,
  onCreated,
}: {
  customers: any[];
  preselectedCustomerId?: string;
  onClose: () => void;
  onCreated: (created: CreatedApplicationInfo) => void;
}) {
  const sessionUser = useSession();
  const currentUserId = sessionUser?.portalUserId ? Number(sessionUser.portalUserId) : null;
  const master = useMasterData();

  const [kind, setKind] = useState<Kind>(preselectedCustomerId ? 'EXISTING' : 'NEW');
  const [companyName, setCompanyName] = useState('');
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [branchCode, setBranchCode] = useState('');
  const [marketingPics, setMarketingPics] = useState<MarketingPicUser[]>([]);
  const [mktPicId, setMktPicId] = useState<number | ''>(currentUserId ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');

  const companyInputRef = useRef<HTMLInputElement>(null);

  const branches = useMemo(
    () => (masterEntries(master, 'branchCode', {}) || []).filter((b: any) => b.active),
    [master],
  );

  // Auto-select only when there is a single active branch; with 2+ branches the user picks explicitly.
  useEffect(() => {
    if (branches.length === 1) {
      if (branchCode !== branches[0].value) setBranchCode(branches[0].value);
    } else if (branchCode && !branches.some((b: any) => b.value === branchCode)) {
      setBranchCode('');
    }
  }, [branches, branchCode]);

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((a, b) => String(a.companyName || '').localeCompare(String(b.companyName || ''))),
    [customers],
  );

  useEffect(() => {
    if (preselectedCustomerId) {
      setKind('EXISTING');
      setCustomerId(preselectedCustomerId);
    }
  }, [preselectedCustomerId]);

  useEffect(() => {
    api('/marketing-pics')
      .then((data: any) => {
        if (Array.isArray(data)) {
          const list = [...data];
          if (sessionUser && currentUserId && !list.some((u: any) => u.id === currentUserId)) {
            list.unshift({
              id: currentUserId,
              username: sessionUser.username,
              fullName: sessionUser.name,
              departmentName: sessionUser.role || 'Current User',
            });
          }
          setMarketingPics(list);
        }
      })
      .catch(() => undefined);
  }, [sessionUser, currentUserId]);

  useEffect(() => {
    if (currentUserId) setMktPicId(prev => (prev === '' ? currentUserId : prev));
  }, [currentUserId]);

  // Close modal on Escape key; the page behind does not scroll while the modal is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, busy]);

  // Flow 6: Detect if typed new company name matches an already-registered customer
  const duplicateCustomer = useMemo(() => {
    if (kind !== 'NEW') return null;
    const raw = companyName.trim();
    if (!raw) return null;
    const full = normalizeFullName(raw);
    const core = normalizeCoreName(raw);
    if (core.length < 3) return null;
    return (
      sortedCustomers.find(c => {
        const cFull = normalizeFullName(c.companyName);
        const cCore = normalizeCoreName(c.companyName);
        return full === cFull || (cCore.length >= 3 && core === cCore);
      }) || null
    );
  }, [kind, companyName, sortedCustomers]);

  // Flow 3: Field-level validation
  const companyMissing = kind === 'NEW' && !companyName.trim();
  const customerMissing = kind === 'EXISTING' && !customerId;
  const branchMissing = branches.length > 0 && !branchCode;
  const picMissing = !mktPicId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError('');

    if (companyMissing || customerMissing || branchMissing || picMissing) {
      return;
    }

    setBusy(true);
    try {
      const formattedName = formatCompanyName(companyName.trim());
      const extra = {
        ...(branchCode ? {branchCode} : {}),
        ...(mktPicId ? {mktPicId: Number(mktPicId)} : {}),
      };
      const body =
        kind === 'NEW'
          ? {
              companyName: formattedName,
              customer: {companyName: formattedName},
              customerCategory: 'NEW',
              ...extra,
            }
          : {
              customerId,
              customerCategory: 'EXISTING',
              ...extra,
            };

      const application = await api('/applications', 'POST', body);
      const chosenCust = sortedCustomers.find(c => c.id === customerId);
      onCreated({
        id: application.id,
        applicationNumber: application.applicationNumber || application.id,
        companyName:
          application.companyName ||
          (kind === 'NEW' ? formattedName : chosenCust?.companyName || 'Application'),
      });
    } catch (err: any) {
      setApiError(err?.message || 'Could not create application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-scrim na-modal-scrim"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section className="na-modal" role="dialog" aria-modal="true" aria-labelledby="na-modal-title">
        <div className="na-modal-head">
          <h2 id="na-modal-title">New application</h2>
          <button type="button" className="na-close-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="na-modal-body">
            {apiError && <div className="na-api-error">{apiError}</div>}

            {/* Segmented Customer Type Toggle */}
            <div className="na-field">
              <span className="na-label">Customer</span>
              <div className="na-segmented" role="radiogroup" aria-label="Customer type">
                <button
                  type="button"
                  role="radio"
                  aria-checked={kind === 'NEW'}
                  className={kind === 'NEW' ? 'on' : ''}
                  onClick={() => {
                    setKind('NEW');
                    setSubmitted(false);
                    setApiError('');
                  }}
                >
                  New customer
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={kind === 'EXISTING'}
                  className={kind === 'EXISTING' ? 'on' : ''}
                  onClick={() => {
                    setKind('EXISTING');
                    setSubmitted(false);
                    setApiError('');
                  }}
                >
                  Existing customer
                </button>
              </div>
            </div>

            {/* Company Name (New) or Customer Search (Existing) */}
            {kind === 'NEW' ? (
              <div className="na-field">
                <label htmlFor="na-company-name" className="na-label">
                  <span>
                    Company name<i className="na-req">*</i>
                  </span>
                </label>
                <input
                  ref={companyInputRef}
                  id="na-company-name"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  className={`na-control na-text-input ${submitted && companyMissing ? 'is-invalid' : ''}`}
                  placeholder="e.g. PT Maju Bersama"
                  value={companyName}
                  onChange={e => setCompanyName(formatCompanyName(e.target.value))}
                  onBlur={() => setCompanyName(prev => formatCompanyName(prev.trim()))}
                />
                {submitted && companyMissing && (
                  <span className="na-field-error">Company name is required</span>
                )}

                {/* Flow 6: Duplicate customer name warning */}
                {duplicateCustomer && (
                  <div className="na-dup-banner" role="status">
                    <span className="na-dup-text">
                      <CircleHelp size={16} />
                      <span>
                        {[
                          'Already registered',
                          duplicateCustomer.companyType && label(duplicateCustomer.companyType),
                          duplicateCustomer.branchCode,
                        ]
                          .filter(Boolean)
                          .join(' \u00B7 ')}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="na-dup-action"
                      onClick={() => {
                        setKind('EXISTING');
                        setCustomerId(duplicateCustomer.id);
                        setSubmitted(false);
                      }}
                    >
                      <span>Use existing customer</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="na-field">
                <span className="na-label">
                  Company<i className="na-req">*</i>
                </span>
                <ExistingCustomerField
                  customers={sortedCustomers}
                  value={customerId}
                  hasError={submitted && customerMissing}
                  onSelect={id => setCustomerId(id)}
                  onClear={() => setCustomerId('')}
                  onCreateAsNew={typed => {
                    setKind('NEW');
                    setCompanyName(formatCompanyName(typed));
                    setCustomerId('');
                    setSubmitted(false);
                    requestAnimationFrame(() => companyInputRef.current?.focus());
                  }}
                />
                {submitted && customerMissing && <span className="na-field-error">Select a customer</span>}
              </div>
            )}

            {/* Two-column row: Branch + PIC Marketing */}
            <div className="na-grid-2">
              {
                <div className="na-field">
                  <span className="na-label">Branch{branches.length > 1 && <i className="na-req">*</i>}</span>
                  {branches.length > 1 ? (
                    <BranchPicker
                      branches={branches}
                      value={branchCode}
                      hasError={submitted && branchMissing}
                      onChange={code => setBranchCode(code)}
                    />
                  ) : (
                    /* A single branch is chosen automatically, so there is nothing to pick. */
                    <div className="na-control na-select-btn na-static" aria-label="Branch">
                      {branches[0] ? (
                        <span className="na-select-val">{branches[0].name || branches[0].value}</span>
                      ) : (
                        <span className="na-select-ph">No branch set up</span>
                      )}
                    </div>
                  )}
                  {submitted && branchMissing && <span className="na-field-error">Select a branch</span>}
                </div>
              }

              <div className="na-field">
                <span className="na-label">PIC marketing</span>
                <MarketingPicPicker
                  users={marketingPics}
                  value={mktPicId}
                  currentUserId={currentUserId}
                  hasError={submitted && picMissing}
                  onChange={id => setMktPicId(id)}
                />
                {submitted && picMissing && <span className="na-field-error">PIC Marketing is required</span>}
              </div>
            </div>
          </div>

          <div className="na-modal-foot">
            <button type="button" className="button na-btn-cancel" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="button primary na-btn-submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <span>Create application</span>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/** Backwards-compatible alias in case anything imports NewApplicationStart. */
export const NewApplicationStart = NewApplicationModal;
