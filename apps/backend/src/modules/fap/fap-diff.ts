import {experienceFromEstablishmentDate} from '@liugong/shared';

export function computeFapDiffs(
  currentApp: any,
  extracted: any,
): Array<{field: string; label: string; oldValue: string; newValue: string}> {
  const toIsoDate = (val: string) => {
    if (!val) return null;
    const s = String(val).trim();
    const mIso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (mIso) return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
    const mDmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (mDmy) return `${mDmy[3]}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
    return null;
  };

  const diffs: Array<{field: string; label: string; oldValue: string; newValue: string}> = [];
  const compareField = (key: string, label: string, oldVal: any, newVal: any, isNumber = false) => {
    const sNew = newVal !== undefined && newVal !== null ? String(newVal).trim() : '';
    const sOld = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : '';

    // If both are empty / blank, no difference
    if (!sNew && !sOld) return;

    if (isNumber) {
      if (key === 'experienceMonths' && ((sOld === '0' && !sNew) || (sNew === '0' && !sOld))) {
        return;
      }
      if (!sNew && sOld) {
        diffs.push({field: key, label, oldValue: sOld, newValue: '— (Kosong di dokumen)'});
        return;
      }
      if (sNew && !sOld) {
        diffs.push({field: key, label, oldValue: '—', newValue: sNew});
        return;
      }
      const nNew = Number(sNew.replace(/[^\d.-]/g, ''));
      const nOld = Number(sOld.replace(/[^\d.-]/g, ''));
      if (!isNaN(nNew) && !isNaN(nOld) && nNew === nOld) return;
    } else {
      const cleanNew = sNew.replace(/\s+/g, ' ').toUpperCase();
      const cleanOld = sOld.replace(/\s+/g, ' ').toUpperCase();
      if (cleanNew === cleanOld) return;

      // If one is empty and the other is not, it is a difference!
      if (!cleanNew && cleanOld) {
        diffs.push({field: key, label, oldValue: sOld, newValue: '— (Kosong di dokumen)'});
        return;
      }
      if (cleanNew && !cleanOld) {
        diffs.push({field: key, label, oldValue: '—', newValue: sNew});
        return;
      }

      // Date normalization (DD/MM/YYYY vs YYYY-MM-DD)
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('tanggal')) {
        const dNew = toIsoDate(sNew);
        const dOld = toIsoDate(sOld);
        if (dNew && dOld && dNew === dOld) return;
      }

      // NIB / NPWP digit comparison
      if (key === 'nib' || key === 'npwp') {
        const dNew = sNew.replace(/\D/g, '');
        const dOld = sOld.replace(/\D/g, '');
        if (dNew && dOld && dNew === dOld) return;
      }

      // Phone numbers digit comparison (e.g. 021-52998877 vs 02152998877)
      if (key === 'phoneFax' || key === 'picPhone' || key.toLowerCase().includes('phone')) {
        const dNew = sNew.replace(/\D/g, '');
        const dOld = sOld.replace(/\D/g, '');
        if (dNew && dOld && (dNew === dOld || dNew.endsWith(dOld) || dOld.endsWith(dNew))) return;
      }

      // Province normalization (e.g. Jawa Timu vs Jawa Timur)
      if (key.toLowerCase().includes('province') || key.toLowerCase().includes('provinsi')) {
        const normProv = (s: string) =>
          s
            .replace(/\s+/g, ' ')
            .replace(/TIMU\b/gi, 'TIMUR')
            .trim()
            .toUpperCase();
        if (normProv(sNew) === normProv(sOld)) return;
      }

      // Address normalization (Jl. vs JI. vs J1., whitespace, punctuation, Timu -> Timur)
      if (key.toLowerCase().includes('address') || key.toLowerCase().includes('alamat')) {
        const normAddr = (s: string) =>
          s
            .replace(/\bJ[I1L]\.?\s*/gi, 'JL. ')
            .replace(/TIMU\b/gi, 'TIMUR')
            .replace(/[\s,.-]+/g, ' ')
            .trim()
            .toUpperCase();
        if (normAddr(sNew) === normAddr(sOld)) return;
      }

      // Deed numbers (ignore spaces & hyphens differences)
      if (key.toLowerCase().includes('deed') || key.toLowerCase().includes('act')) {
        const normDeed = (s: string) => s.replace(/[\s\-_/.]/g, '').toUpperCase();
        if (normDeed(sNew) === normDeed(sOld)) return;
      }

      // Facility Purpose normalization (Investasi vs Investment vs WORKING_CAPITAL)
      if (key.toLowerCase().includes('purpose') || key.toLowerCase().includes('tujuan')) {
        const normPurpose = (s: string) => {
          const u = s.toUpperCase();
          if (u.includes('INVEST')) return 'INVESTMENT';
          if (u.includes('MODAL') || u.includes('WORKING')) return 'WORKING_CAPITAL';
          return u;
        };
        if (normPurpose(sNew) === normPurpose(sOld)) return;
      }
    }

    diffs.push({
      field: key,
      label,
      oldValue: sOld || '—',
      newValue: sNew || '— (Kosong di dokumen)',
    });
  };

  compareField(
    'applicationDate',
    'Tanggal / Application Date',
    currentApp.applicationDate,
    extracted.applicationDate,
  );
  compareField('branchCode', 'Cabang / Branch Code', currentApp.branchCode, extracted.branchCode);
  compareField(
    'customerStatus',
    'Status Debitur (New / Existing)',
    currentApp.customerStatus || currentApp.customerCategory,
    extracted.customerStatus,
  );
  compareField(
    'companyType',
    'Tipe Perusahaan / Segmen',
    currentApp.customer?.companyType || currentApp.companyType,
    extracted.companyType,
  );
  compareField(
    'companyName',
    'Nama Perusahaan',
    currentApp.customer?.companyName || currentApp.companyName,
    extracted.companyName,
  );
  compareField(
    'nib',
    'Nomor Induk Berusaha (NIB)',
    currentApp.customer?.nib || currentApp.nib,
    extracted.nib,
  );
  compareField('npwp', 'NPWP Perusahaan', currentApp.customer?.npwp || currentApp.npwp, extracted.npwp);
  compareField(
    'companyAddress',
    'Alamat Perusahaan',
    currentApp.companyAddress || currentApp.customer?.companyAddress,
    extracted.companyAddress,
  );
  compareField('rt', 'RT', currentApp.rt || currentApp.customer?.rt, extracted.rt);
  compareField('rw', 'RW', currentApp.rw || currentApp.customer?.rw, extracted.rw);
  compareField('city', 'Kota / Kabupaten', currentApp.city || currentApp.customer?.city, extracted.city);
  compareField(
    'province',
    'Provinsi',
    currentApp.province || currentApp.customer?.province,
    extracted.province,
  );
  compareField(
    'postalCode',
    'Kode Pos',
    currentApp.postalCode || currentApp.customer?.postalCode,
    extracted.postalCode,
  );
  compareField('phoneFax', 'Telepon / Fax', currentApp.phoneFax, extracted.phoneFax);
  compareField('email', 'Email Perusahaan', currentApp.email, extracted.email);
  compareField('website', 'Website Perusahaan', currentApp.website, extracted.website);
  compareField('mainBusiness', 'Bidang Usaha Utama', currentApp.mainBusiness, extracted.mainBusiness);
  compareField(
    'establishmentActNo',
    'Nomor Akta Pendirian',
    currentApp.establishmentActNo || currentApp.legal?.establishmentActNo,
    extracted.establishmentActNo,
  );
  compareField(
    'establishmentDate',
    'Tanggal Akta Pendirian',
    currentApp.establishmentDate || currentApp.legal?.establishmentDate,
    extracted.establishmentDate,
  );

  // Calculate system experience (fallback to establishmentDate)
  const estDateForExp =
    currentApp.establishmentDate ||
    currentApp.customer?.establishmentDate ||
    currentApp.legal?.establishmentDate;
  let sysExpYears: any =
    currentApp.experienceYears !== undefined &&
    currentApp.experienceYears !== null &&
    currentApp.experienceYears !== ''
      ? currentApp.experienceYears
      : currentApp.customer?.experienceYears !== undefined &&
          currentApp.customer?.experienceYears !== null &&
          currentApp.customer?.experienceYears !== ''
        ? currentApp.customer.experienceYears
        : '';
  let sysExpMonths: any =
    currentApp.experienceMonths !== undefined &&
    currentApp.experienceMonths !== null &&
    currentApp.experienceMonths !== ''
      ? currentApp.experienceMonths
      : currentApp.customer?.experienceMonths !== undefined &&
          currentApp.customer?.experienceMonths !== null &&
          currentApp.customer?.experienceMonths !== ''
        ? currentApp.customer.experienceMonths
        : '';
  if (sysExpYears === '' && estDateForExp) {
    const expCalc = experienceFromEstablishmentDate(estDateForExp);
    sysExpYears = expCalc.experienceYears;
    sysExpMonths = expCalc.experienceMonths;
  }

  // Document experience: strictly reflect the physical document boxes (empty if unfilled in document)
  let docExpYears: any =
    extracted.experienceYears !== undefined &&
    extracted.experienceYears !== null &&
    extracted.experienceYears !== ''
      ? String(extracted.experienceYears)
      : '';
  let docExpMonths: any =
    extracted.experienceMonths !== undefined &&
    extracted.experienceMonths !== null &&
    extracted.experienceMonths !== ''
      ? String(extracted.experienceMonths)
      : '';

  compareField('experienceYears', 'Pengalaman Usaha (Tahun)', sysExpYears, docExpYears, true);
  compareField('experienceMonths', 'Pengalaman Usaha (Bulan)', sysExpMonths, docExpMonths, true);

  compareField(
    'latestDeedNo',
    'Nomor Akta Perubahan Terakhir',
    currentApp.latestDeedNo || currentApp.legal?.latestDeedNo,
    extracted.latestDeedNo,
  );
  compareField(
    'latestDeedDate',
    'Tanggal Akta Perubahan Terakhir',
    currentApp.latestDeedDate || currentApp.legal?.latestDeedDate,
    extracted.latestDeedDate,
  );
  compareField(
    'repaymentSource',
    'Sumber Pengembalian',
    currentApp.repaymentSource,
    extracted.repaymentSource,
  );
  compareField('locationStatus', 'Status Lokasi Usaha', currentApp.locationStatus, extracted.locationStatus);
  compareField('picName', 'Nama PIC', currentApp.pic?.picName || currentApp.pic?.name, extracted.picName);
  compareField('picPosition', 'Jabatan PIC', currentApp.pic?.position, extracted.picPosition);
  compareField(
    'picPhone',
    'No. HP / Telepon PIC',
    currentApp.pic?.phone || currentApp.pic?.mobilePhone,
    extracted.picPhone,
  );
  compareField('picEmail', 'Email PIC', currentApp.pic?.email, extracted.picEmail);
  compareField(
    'picAddress',
    'Alamat Domisili PIC',
    currentApp.pic?.currentAddress || currentApp.pic?.address,
    extracted.picAddress,
  );
  compareField('picCity', 'Kota PIC', currentApp.pic?.city, extracted.picCity);
  compareField('picProvince', 'Provinsi PIC', currentApp.pic?.province, extracted.picProvince);
  compareField('picPostalCode', 'Kode Pos PIC', currentApp.pic?.postalCode, extracted.picPostalCode);
  compareField(
    'financingValue',
    'Nilai Pembiayaan',
    currentApp.proposal?.financingValue,
    extracted.financingValue,
    true,
  );
  compareField(
    'downPaymentValue',
    'Uang Muka (DP)',
    currentApp.proposal?.downPaymentValue,
    extracted.downPaymentValue,
    true,
  );
  compareField('tenorMonths', 'Tenor (Bulan)', currentApp.proposal?.tenorMonths, extracted.tenorMonths, true);
  compareField(
    'facilityPurpose',
    'Tujuan Pembiayaan',
    currentApp.proposal?.facilityPurpose || currentApp.facilityPurpose || 'INVESTMENT',
    extracted.facilityPurpose,
  );
  compareField(
    'financingMethod',
    'Metode Pembayaran',
    currentApp.proposal?.financingMethod,
    extracted.financingMethod,
  );

  return diffs;
}
