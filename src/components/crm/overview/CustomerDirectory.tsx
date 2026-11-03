import {useState, useMemo} from 'react';
import {ArrowUpRight, Search, Users, Building2} from 'lucide-react';
import {label} from '@/lib/shared/fields';
import {date} from '@/lib/crm/format';
import {IconBox} from '@/components/crm/common/ui';
import {checkIsAdmin} from '@/lib/crm/auth';
import {Detail} from '@/components/crm/application/Detail';

export function CustomerDirectory({
  customers,
  rows,
  user,
  open,
  startNewApplication,
  notify,
}: {
  customers: any[];
  rows: any[];
  user: any;
  open: (id: string) => void;
  startNewApplication?: (customerId?: string) => void;
  notify: (msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    'created_desc' | 'created_asc' | 'first_app_desc' | 'first_app_asc' | 'name_asc' | 'name_desc' | 'apps_desc'
  >('created_desc');

  const enriched = useMemo(() => {
    return customers.map(c => {
      const custApps = rows.filter(r => r.customer_id === c.id);
      const appDates = custApps
        .map(a => new Date(a.application_date || a.created_at || a.createdAt).getTime())
        .filter(t => !isNaN(t) && t > 0);
      const firstAppTs = appDates.length > 0
        ? Math.min(...appDates)
        : (c.firstApplicationDate ? new Date(c.firstApplicationDate).getTime() : null);

      const rawCreated = c.createdAt || c.created_at;
      const createdTs = rawCreated
        ? new Date(rawCreated).getTime()
        : (firstAppTs ?? 0);

      return {
        ...c,
        appCount: custApps.length,
        createdTs: isNaN(createdTs) ? 0 : createdTs,
        firstAppTs: (firstAppTs && !isNaN(firstAppTs)) ? firstAppTs : null,
      };
    });
  }, [customers, rows]);

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = enriched.filter(c => {
      if (!term) return true;
      return (
        (c.companyName || '').toLowerCase().includes(term) ||
        (c.nib || '').includes(term) ||
        (c.npwp || '').includes(term)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'created_desc') {
        return (b.createdTs || 0) - (a.createdTs || 0);
      }
      if (sortBy === 'created_asc') {
        return (a.createdTs || 0) - (b.createdTs || 0);
      }
      if (sortBy === 'first_app_desc') {
        const bTs = b.firstAppTs ?? -1;
        const aTs = a.firstAppTs ?? -1;
        return bTs - aTs;
      }
      if (sortBy === 'first_app_asc') {
        const aTs = a.firstAppTs ?? Infinity;
        const bTs = b.firstAppTs ?? Infinity;
        return aTs - bTs;
      }
      if (sortBy === 'name_asc') {
        return (a.companyName || '').localeCompare(b.companyName || '');
      }
      if (sortBy === 'name_desc') {
        return (b.companyName || '').localeCompare(a.companyName || '');
      }
      if (sortBy === 'apps_desc') {
        return b.appCount - a.appCount;
      }
      return 0;
    });

    return list;
  }, [enriched, search, sortBy]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>
          Customer directory <span>{filteredAndSorted.length}{filteredAndSorted.length !== customers.length ? ` / ${customers.length}` : ''}</span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Users size={19} />
        </div>
      </div>
      <div className="table-toolbar" style={{ padding: '0 22px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Cari customer"
            placeholder="Cari perusahaan, NIB, atau NPWP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filters" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', fontWeight: 600, margin: 0 }}>
            <span>Urutkan:</span>
            <select
              aria-label="Urutkan customer"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{ minWidth: '240px', padding: '8px 12px', fontSize: '11px', fontWeight: 500, borderColor: '#cbd5e1', borderRadius: '6px' }}
            >
              <option value="created_desc">🕒 Tanggal Dibuat (Terbaru)</option>
              <option value="created_asc">🕒 Tanggal Dibuat (Terlama)</option>
              <option value="first_app_desc">📄 Aplikasi Pertama (Terbaru)</option>
              <option value="first_app_asc">📄 Aplikasi Pertama (Paling Awal)</option>
              <option value="name_asc">🔤 Nama Perusahaan (A - Z)</option>
              <option value="name_desc">🔤 Nama Perusahaan (Z - A)</option>
              <option value="apps_desc">📊 Jumlah Aplikasi Terbanyak</option>
            </select>
          </label>
          {search && (
            <button className="button small" onClick={() => setSearch('')}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="customer-grid">
        {filteredAndSorted.map(c => (
          <button
            className="customer-card"
            key={c.id}
            onClick={() => {
              const a = rows.find(r => r.customer_id === c.id);
              if (a) open(a.id);
              else if (user.role === 'MKT' || checkIsAdmin(user)) startNewApplication?.(c.id);
              else notify('This customer has no applications yet. Use New application to create one.');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <IconBox><Building2 size={21} /></IconBox>
              {c.createdTs > 0 && (
                <span
                  style={{
                    fontSize: '9.5px',
                    color: '#64748b',
                    background: '#f1f5f9',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}
                  title="Customer registration date"
                >
                  Dibuat: {date(c.createdTs)}
                </span>
              )}
            </div>
            <h3>{c.companyName}</h3>
            <span className="muted">{label(c.companyType)}</span>
            <dl>
              <dt>NIB</dt><dd>{c.nib || '—'}</dd>
              <dt>NPWP</dt><dd>{c.npwp || '—'}</dd>
              <dt title="Waktu aplikasi pertama kali dibuat">App 1st</dt>
              <dd style={{ color: c.firstAppTs ? '#1e40af' : '#94a3b8', fontWeight: c.firstAppTs ? 600 : 400 }}>
                {c.firstAppTs ? date(c.firstAppTs) : 'None'}
              </dd>
            </dl>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <span className="text-link">
                {c.appCount} applications <ArrowUpRight size={15} />
              </span>
              {c.firstAppTs && (
                <span style={{ fontSize: '9px', color: '#64748b' }} title="Tanggal aplikasi pertama dibuat">
                  Aplikasi 1: {date(c.firstAppTs)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      {!filteredAndSorted.length && (
        <div className="empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Search size={28} style={{ color: '#94a3b8', marginBottom: '8px' }} />
          <h3>Tidak ada customer ditemukan</h3>
          <p>Try using different search keywords.</p>
        </div>
      )}
    </section>
  );
}

// Note: New application process has been merged directly into Detail view (Tab 0 FAP Intake).
