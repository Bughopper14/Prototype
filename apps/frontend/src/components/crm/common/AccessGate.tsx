import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {ShieldAlert} from 'lucide-react';
import {hasAuthority} from '@/lib/auth';
import {CRM_BASE, CRM_PAGES} from '@/lib/routes';
import {useCrm} from '@/components/crm/CrmProvider';

/** Renders its children only when the signed-in user holds `authority`; otherwise explains why not. */
export function AccessGate({
  authority,
  page,
  children,
}: {
  authority: string;
  page: string;
  children: ReactNode;
}) {
  const {user} = useCrm();
  if (hasAuthority(user, authority)) return <>{children}</>;

  const firstAllowed = CRM_PAGES.find(item => hasAuthority(user, item.authority));
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        margin: '20px 0',
      }}
    >
      <ShieldAlert size={48} color="#ef4444" style={{marginBottom: 16}} />
      <h2 style={{fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8}}>Akses Dibatasi</h2>
      <p style={{color: '#64748b', fontSize: 14, maxWidth: 480, margin: '0 auto 20px'}}>
        Akun Anda tidak memiliki izin ({authority}) untuk melihat halaman {page}.
      </p>
      <Link className="button primary" to={firstAllowed?.href ?? CRM_BASE}>
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
