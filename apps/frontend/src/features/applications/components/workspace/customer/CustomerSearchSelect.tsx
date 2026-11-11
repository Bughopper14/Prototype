/** Searchable dropdown for picking an Existing Customer from Master Customer. */
import {Building2, Check, ChevronDown, Search, X} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';

type CustomerSearchSelectProps = {
  customers: any[];
  value: string;
  selectedCustomer: any;
  disabled?: boolean;
  onSelect: (customer: any | null) => void;
  onFocus?: () => void;
};

export function CustomerSearchSelect({
  customers,
  value,
  selectedCustomer,
  disabled = false,
  onSelect,
  onFocus,
}: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    if (!q) return customers;
    return customers.filter(c => {
      const name = String(c.companyName || '').toLowerCase();
      const nib = String(c.nib || '').toLowerCase();
      const npwp = String(c.npwp || '').toLowerCase();
      const city = String(c.city || '').toLowerCase();
      if (name.includes(q) || nib.includes(q) || npwp.includes(q) || city.includes(q)) return true;
      if (digits && (nib.replace(/\D/g, '').includes(digits) || npwp.replace(/\D/g, '').includes(digits))) {
        return true;
      }
      return false;
    });
  }, [customers, query]);

  return (
    <div ref={containerRef} style={{position: 'relative', width: '100%'}}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          onFocus?.();
          setOpen(o => !o);
        }}
        onKeyDown={e => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFocus?.();
            setOpen(o => !o);
          }
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 42,
          padding: '8px 12px',
          borderRadius: 8,
          border: open ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
          boxShadow: open ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
          background: disabled ? '#f8fafc' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1}}>
          <Search size={15} style={{color: selectedCustomer ? '#2563eb' : '#94a3b8', flexShrink: 0}} />
          {selectedCustomer ? (
            <div style={{minWidth: 0, flex: 1}}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedCustomer.companyName}
              </div>
              <div
                style={{
                  fontSize: '0.73rem',
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {[
                  selectedCustomer.nib ? `NIB: ${selectedCustomer.nib}` : null,
                  selectedCustomer.npwp && !/^0+$/.test(String(selectedCustomer.npwp))
                    ? `NPWP: ${selectedCustomer.npwp}`
                    : null,
                  selectedCustomer.city || null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          ) : (
            <span style={{fontSize: '0.85rem', color: '#94a3b8'}}>
              Search &amp; select customer (Company Name / NIB / NPWP)...
            </span>
          )}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0}}>
          {value && !disabled && (
            <button
              type="button"
              title="Clear selected customer"
              onClick={e => {
                e.stopPropagation();
                onSelect(null);
              }}
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#475569',
                borderRadius: 6,
                width: 22,
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: '#64748b',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms ease',
            }}
          />
        </div>
      </div>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 40,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search size={14} style={{color: '#64748b', flexShrink: 0}} />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search company name, NIB, NPWP, or city..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                padding: '2px 0',
                background: 'transparent',
                fontSize: '0.84rem',
                color: '#0f172a',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'inline-flex',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{maxHeight: 260, overflowY: 'auto'}}>
            {filtered.length === 0 ? (
              <div style={{padding: '16px 12px', textAlign: 'center', fontSize: '0.82rem', color: '#64748b'}}>
                No matching customer found.
              </div>
            ) : (
              filtered.map(c => {
                const isSelected = c.id === value;
                const meta = [
                  c.nib ? `NIB: ${c.nib}` : null,
                  c.npwp && !/^0+$/.test(String(c.npwp)) ? `NPWP: ${c.npwp}` : null,
                  c.city || null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      setOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, flex: 1}}>
                      <Building2
                        size={15}
                        style={{color: isSelected ? '#2563eb' : '#64748b', marginTop: 2, flexShrink: 0}}
                      />
                      <div style={{minWidth: 0}}>
                        <div
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            color: isSelected ? '#1d4ed8' : '#0f172a',
                          }}
                        >
                          {c.companyName || 'Unnamed Customer'}
                        </div>
                        {meta && (
                          <div style={{fontSize: '0.73rem', color: '#64748b', marginTop: 1}}>{meta}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={15} style={{color: '#2563eb', flexShrink: 0}} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
