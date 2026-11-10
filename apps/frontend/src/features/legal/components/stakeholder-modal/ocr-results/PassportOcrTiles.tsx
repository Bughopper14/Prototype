/** Fields read from a passport. */
import {Check, Copy} from 'lucide-react';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function PassportOcrTiles() {
  const {copiedKey, passportParsed, copyToClipboard} = useStakeholderModalContext();
  return (
    <div className="ktp-structured-grid">
      <div className="ktp-field-tile highlight">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NOMOR PASPOR (PASSPORT NO.)</span>
          {passportParsed.passportNumber && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('passNo', passportParsed.passportNumber!)}
            >
              {copiedKey === 'passNo' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'passNo' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <b className="ktp-field-val nik-val">{passportParsed.passportNumber || '—'}</b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KODE NEGARA / NATIONALITY</span>
        </div>
        <b className="ktp-field-val">
          {passportParsed.countryCode
            ? `${passportParsed.countryCode} · ${passportParsed.countryName || passportParsed.nationality || ''}`
            : passportParsed.nationality || '—'}
        </b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NAMA LENGKAP</span>
        </div>
        <b className="ktp-field-val">
          {passportParsed.fullName ||
            [passportParsed.givenNames, passportParsed.surname].filter(Boolean).join(' ') ||
            '—'}
        </b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NAMA DEPAN / SURNAME</span>
        </div>
        <span className="ktp-field-val">
          {passportParsed.givenNames ? `Given: ${passportParsed.givenNames}` : ''}{' '}
          {passportParsed.surname ? `· Surname: ${passportParsed.surname}` : ''}
        </span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">TANGGAL LAHIR & USIA</span>
        </div>
        <span className="ktp-field-val">{passportParsed.dateOfBirth || '—'}</span>
        {passportParsed.dateOfBirth && (
          <small className="ktp-field-sub">
            Age: {calculateAgeYearsMonths(passportParsed.dateOfBirth).years} yr{' '}
            {calculateAgeYearsMonths(passportParsed.dateOfBirth).months} mo
          </small>
        )}
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">JENIS KELAMIN (SEX)</span>
        </div>
        <span className="ktp-field-val">
          {passportParsed.gender === 'MALE'
            ? 'M / LAKI-LAKI'
            : passportParsed.gender === 'FEMALE'
              ? 'F / PEREMPUAN'
              : '—'}
        </span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">TANGGAL BERLAKU / EXPIRY</span>
        </div>
        <span className="ktp-field-val">{passportParsed.expiryDate || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KANTOR PENERBIT (AUTHORITY)</span>
        </div>
        <span className="ktp-field-val">{passportParsed.issuingAuthority || '—'}</span>
      </div>
    </div>
  );
}
