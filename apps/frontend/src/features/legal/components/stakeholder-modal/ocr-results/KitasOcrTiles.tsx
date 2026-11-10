/** Fields read from a KITAS. */
import {Check, Copy} from 'lucide-react';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function KitasOcrTiles() {
  const {copiedKey, kitasParsed, copyToClipboard} = useStakeholderModalContext();
  return (
    <div className="ktp-structured-grid">
      <div className="ktp-field-tile highlight">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NOMOR IZIN TINGGAL / NIORA</span>
          {kitasParsed.permitNumber && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('kitasNo', kitasParsed.permitNumber!)}
            >
              {copiedKey === 'kitasNo' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'kitasNo' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <b className="ktp-field-val nik-val">{kitasParsed.permitNumber || kitasParsed.niora || '—'}</b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NAMA LENGKAP</span>
        </div>
        <b className="ktp-field-val">{kitasParsed.nama || '—'}</b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KEWARGANEGARAAN</span>
        </div>
        <span className="ktp-field-val">{kitasParsed.kewarganegaraan || 'WNA'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">TANGGAL LAHIR & USIA</span>
        </div>
        <span className="ktp-field-val">{kitasParsed.tanggalLahir || '—'}</span>
        {kitasParsed.tanggalLahir && (
          <small className="ktp-field-sub">
            Age: {calculateAgeYearsMonths(kitasParsed.tanggalLahir).years} yr{' '}
            {calculateAgeYearsMonths(kitasParsed.tanggalLahir).months} mo
          </small>
        )}
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">BERLAKU HINGGA</span>
        </div>
        <span className="ktp-field-val">{kitasParsed.berlakuHingga || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">INSTANSI PENERBIT</span>
        </div>
        <span className="ktp-field-val">
          {kitasParsed.instansiPenerbit || 'Direktorat Jenderal Imigrasi'}
        </span>
      </div>
    </div>
  );
}
