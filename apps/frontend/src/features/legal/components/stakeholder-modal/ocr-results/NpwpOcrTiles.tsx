/** Fields read from an NPWP card. */
import {Check, Copy} from 'lucide-react';
import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function NpwpOcrTiles() {
  const {copiedKey, npwpParsed, copyToClipboard} = useStakeholderModalContext();
  return (
    <div className="ktp-structured-grid">
      <div className="ktp-field-tile highlight">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NOMOR NPWP (15-16 DIGIT)</span>
          {npwpParsed.npwpNumber && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('npwp', npwpParsed.npwpNumber!)}
            >
              {copiedKey === 'npwp' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'npwp' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <b className="ktp-field-val nik-val">{npwpParsed.npwpNumber || npwpParsed.rawNpwp || '—'}</b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NAMA WAJIB PAJAK</span>
        </div>
        <b className="ktp-field-val">{npwpParsed.nama || '—'}</b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NIK TERDAFTAR</span>
        </div>
        <span className="ktp-field-val">{npwpParsed.nik || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KANTOR PELAYANAN PAJAK (KPP)</span>
        </div>
        <span className="ktp-field-val">{npwpParsed.kpp || '—'}</span>
      </div>

      <div className="ktp-field-tile full-width">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">ALAMAT TERDAFTAR NPWP</span>
        </div>
        <span className="ktp-field-val address-val">
          {[npwpParsed.alamat, npwpParsed.kelurahanKecamatan, npwpParsed.kotaProvinsi]
            .filter(Boolean)
            .join(', ') || '—'}
        </span>
      </div>
    </div>
  );
}
