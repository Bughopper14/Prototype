/** OCR results per field with copy / apply buttons. */
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {Check, Copy, Sparkles} from 'lucide-react';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function OcrResultsWorkspace() {
  const {
    editorLocked,
    docType,
    copiedKey,
    ocrLoading,
    currentAsset,
    ktpParsed,
    passportParsed,
    npwpParsed,
    kitasParsed,
    copyToClipboard,
    applyDocOcrToForm,
  } = useStakeholderModalContext();
  return (
    <div className="ktp-ocr-workspace-card">
      {/* OCR CARD HEADER */}
      <div className="ktp-ocr-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div className="ktp-ocr-badge-icon">
            <Sparkles size={14} />
          </div>
          <div>
            <h5 style={{margin: 0, fontSize: '13.5px', color: '#002060', fontWeight: 700}}>
              Hasil Pembacaan Dokumen ({docType} OCR)
            </h5>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px'}}>
              {ocrLoading ? (
                <span className="ktp-ocr-status loading">⏳ Scanning {docType} image...</span>
              ) : currentAsset.ocrText ? (
                <span className="ktp-ocr-status ready">✓ Data Ready to Sync</span>
              ) : (
                <span className="ktp-ocr-status empty">Awaiting file upload</span>
              )}
            </div>
          </div>
        </div>

        {currentAsset.ocrText && !editorLocked && (
          <button
            type="button"
            className="button primary small ktp-autofill-btn"
            onClick={applyDocOcrToForm}
            title={`Copy and sync ${docType} OCR data to the left form`}
          >
            <Sparkles size={13} /> Auto-fill to Left Form
          </button>
        )}
      </div>

      {/* STRUCTURED DATA TILES PER DOCUMENT TYPE */}
      {docType === 'KTP' && (
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
            <span className="ktp-field-val">
              {ktpParsed.citizenship || ktpParsed.kewarganegaraan || 'WNI'}
            </span>
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
                  onClick={() =>
                    copyToClipboard('rtrw', (ktpParsed.rtRw || `${ktpParsed.rt}/${ktpParsed.rw}`)!)
                  }
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
      )}

      {docType === 'PASSPORT' && (
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
      )}

      {docType === 'NPWP' && (
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
      )}

      {docType === 'KITAS' && (
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
      )}
    </div>
  );
}
