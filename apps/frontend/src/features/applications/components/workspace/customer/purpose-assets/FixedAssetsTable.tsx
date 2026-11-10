/** List of fixed assets: LiuGong vs non-LiuGong heavy equipment and trucks. */
import {AssetsTotalRow} from '@/features/applications/components/workspace/customer/purpose-assets/AssetsTotalRow';
import {LiuGongAssetsRow} from '@/features/applications/components/workspace/customer/purpose-assets/LiuGongAssetsRow';
import {NonLiuGongAssetsRow} from '@/features/applications/components/workspace/customer/purpose-assets/NonLiuGongAssetsRow';

export function FixedAssetsTable() {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{color: '#0284c7'}}>●</span> List Fixed Assets
      </div>
      <div style={{fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', marginBottom: 12}}>
        *daftar unit terlampir / list equipment attached
      </div>

      <div style={{overflowX: 'auto'}}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'center',
            fontSize: '0.8rem',
          }}
        >
          <thead>
            <tr style={{background: '#f1f5f9', borderBottom: '1.5pt solid #cbd5e1'}}>
              <th
                style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                Brand
              </th>
              <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 75}}>HE</th>
              <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 75}}>Truck</th>
              <th
                style={{
                  padding: '8px 10px',
                  fontWeight: 700,
                  color: '#334155',
                  width: 75,
                  background: '#e2e8f0',
                }}
              >
                Unit
              </th>
              <th
                style={{
                  padding: '8px 10px',
                  fontWeight: 700,
                  color: '#334155',
                  width: 95,
                  background: '#e2e8f0',
                }}
              >
                Percentage
              </th>
            </tr>
          </thead>
          <tbody>
            {/* LiuGong */}
            <LiuGongAssetsRow />

            {/* Non LiuGong */}
            <NonLiuGongAssetsRow />

            {/* Total Row */}
            <AssetsTotalRow />
          </tbody>
        </table>
      </div>
    </div>
  );
}
