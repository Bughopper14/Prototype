/** Fields read from an e-KTP. */
import {Check, Copy} from 'lucide-react';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function KtpOcrTiles() {
  const {copiedKey, ktpParsed, copyToClipboard} = useStakeholderModalContext();
  return (
    <div className="ktp-structured-grid">
      <div className="ktp-field-tile highlight">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NOMOR INDUK KEPENDUDUKAN (NIK)</span>
          {ktpParsed.nik && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('nik', ktpParsed.nik!)}
            >
              {copiedKey === 'nik' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'nik' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <b className="ktp-field-val nik-val">{ktpParsed.nik || '—'}</b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">NAMA LENGKAP</span>
          {ktpParsed.nama && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('nama', ktpParsed.nama!)}
            >
              {copiedKey === 'nama' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'nama' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <b className="ktp-field-val">{ktpParsed.nama || '—'}</b>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">TEMPAT / TGL LAHIR & USIA</span>
        </div>
        <span className="ktp-field-val">
          {ktpParsed.tempatTglLahir ||
            (ktpParsed.tempatLahir ? `${ktpParsed.tempatLahir}, ${ktpParsed.dateOfBirth || ''}` : '—')}
        </span>
        {ktpParsed.dateOfBirth && (
          <small className="ktp-field-sub">
            ISO: {ktpParsed.dateOfBirth} · Age: {calculateAgeYearsMonths(ktpParsed.dateOfBirth).years} yr{' '}
            {calculateAgeYearsMonths(ktpParsed.dateOfBirth).months} mo
          </small>
        )}
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">JENIS KELAMIN</span>
        </div>
        <span className="ktp-field-val">
          {ktpParsed.gender === 'MALE'
            ? 'LAKI-LAKI (MALE)'
            : ktpParsed.gender === 'FEMALE'
              ? 'PEREMPUAN (FEMALE)'
              : '—'}
        </span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">STATUS PERKAWINAN</span>
        </div>
        <span className="ktp-field-val">{ktpParsed.maritalStatus || ktpParsed.status || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KEWARGANEGARAAN</span>
        </div>
        <span className="ktp-field-val">{ktpParsed.citizenship || ktpParsed.kewarganegaraan || 'WNI'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">PEKERJAAN</span>
        </div>
        <span className="ktp-field-val">{ktpParsed.pekerjaan || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">AGAMA</span>
        </div>
        <span className="ktp-field-val">{ktpParsed.agama || '—'}</span>
      </div>

      <div className="ktp-field-tile full-width">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">ALAMAT DOMISILI LENGKAP</span>
          {(ktpParsed.alamat || ktpParsed.province) && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => {
                const full = [
                  ktpParsed.alamat,
                  ktpParsed.rtRw
                    ? `RT/RW ${ktpParsed.rtRw}`
                    : ktpParsed.rt && ktpParsed.rw
                      ? `RT ${ktpParsed.rt}/RW ${ktpParsed.rw}`
                      : '',
                  ktpParsed.kelDesa || ktpParsed.village
                    ? `Kel. ${ktpParsed.kelDesa || ktpParsed.village}`
                    : '',
                  ktpParsed.kecamatan || ktpParsed.district
                    ? `Kec. ${ktpParsed.kecamatan || ktpParsed.district}`
                    : '',
                  ktpParsed.cityRegency || ktpParsed.city,
                  ktpParsed.province,
                  ktpParsed.kodePos || ktpParsed.postalCode,
                ]
                  .filter(Boolean)
                  .join(', ');
                copyToClipboard('alamat', full || ktpParsed.alamat || '');
              }}
            >
              {copiedKey === 'alamat' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'alamat' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <span className="ktp-field-val address-val">
          {[
            ktpParsed.alamat,
            ktpParsed.rtRw
              ? `RT/RW ${ktpParsed.rtRw}`
              : ktpParsed.rt && ktpParsed.rw
                ? `RT ${ktpParsed.rt}/RW ${ktpParsed.rw}`
                : '',
            ktpParsed.kelDesa || ktpParsed.village ? `Kel. ${ktpParsed.kelDesa || ktpParsed.village}` : '',
            ktpParsed.kecamatan || ktpParsed.district
              ? `Kec. ${ktpParsed.kecamatan || ktpParsed.district}`
              : '',
            ktpParsed.cityRegency || ktpParsed.city,
            ktpParsed.province,
            ktpParsed.kodePos || ktpParsed.postalCode,
          ]
            .filter(Boolean)
            .join(', ') || '—'}
        </span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">PROVINSI</span>
          {ktpParsed.province && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('prov', ktpParsed.province!)}
            >
              {copiedKey === 'prov' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'prov' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <span className="ktp-field-val">{ktpParsed.province || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KABUPATEN / KOTA</span>
          {(ktpParsed.cityRegency || ktpParsed.city) && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('city', (ktpParsed.cityRegency || ktpParsed.city)!)}
            >
              {copiedKey === 'city' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'city' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <span className="ktp-field-val">{ktpParsed.cityRegency || ktpParsed.city || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KECAMATAN</span>
          {(ktpParsed.kecamatan || ktpParsed.district) && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('kec', (ktpParsed.kecamatan || ktpParsed.district)!)}
            >
              {copiedKey === 'kec' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'kec' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <span className="ktp-field-val">{ktpParsed.kecamatan || ktpParsed.district || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KELURAHAN / DESA</span>
          {(ktpParsed.kelDesa || ktpParsed.village) && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('kel', (ktpParsed.kelDesa || ktpParsed.village)!)}
            >
              {copiedKey === 'kel' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'kel' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <span className="ktp-field-val">{ktpParsed.kelDesa || ktpParsed.village || '—'}</span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">RT / RW</span>
          {(ktpParsed.rtRw || (ktpParsed.rt && ktpParsed.rw)) && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('rtrw', (ktpParsed.rtRw || `${ktpParsed.rt}/${ktpParsed.rw}`)!)}
            >
              {copiedKey === 'rtrw' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'rtrw' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <span className="ktp-field-val">
          {ktpParsed.rtRw ||
            (ktpParsed.rt && ktpParsed.rw
              ? `${ktpParsed.rt}/${ktpParsed.rw}`
              : ktpParsed.rt
                ? `RT ${ktpParsed.rt}`
                : ktpParsed.rw
                  ? `RW ${ktpParsed.rw}`
                  : '—')}
        </span>
      </div>

      <div className="ktp-field-tile">
        <div className="ktp-field-meta">
          <span className="ktp-field-key">KODE POS</span>
          {(ktpParsed.kodePos || ktpParsed.postalCode) && (
            <button
              type="button"
              className="ktp-tile-copy"
              onClick={() => copyToClipboard('kodepos', (ktpParsed.kodePos || ktpParsed.postalCode)!)}
            >
              {copiedKey === 'kodepos' ? <Check size={11} /> : <Copy size={11} />}
              {copiedKey === 'kodepos' ? 'Tersalin' : 'Salin'}
            </button>
          )}
        </div>
        <span className="ktp-field-val">{ktpParsed.kodePos || ktpParsed.postalCode || '—'}</span>
      </div>
    </div>
  );
}
