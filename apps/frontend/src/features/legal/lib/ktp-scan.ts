/** How the text read from a KTP photo is merged into the stakeholder form. */

/** After a scan: keep what the user already typed, fill the empty fields from the KTP. */
export function mergeKtpScan(
  currentVal: any,
  parsed: any,
  file: {name: string; type: string},
  dataUrl: string,
) {
  const f = file;
  const nextVal: any = {
    ...currentVal,
    ktpUrl: dataUrl,
    ktpFileName: f.name,
    ktpMime: f.type,
    ktpOcrText: parsed.rawText || '',
  };
  if (parsed.nik && (!currentVal.idNumber || currentVal.idNumber === '')) {
    nextVal.idNumber = parsed.nik;
    nextVal.idType = 'KTP_NPWP';
  }
  if (parsed.nama && (!currentVal.firstName || currentVal.firstName === '')) {
    nextVal.name = parsed.nama;
    nextVal.firstName = parsed.firstName || '';
    nextVal.middleName = parsed.middleName || '';
    nextVal.lastName = parsed.lastName || '';
  }
  if (parsed.dateOfBirth && !currentVal.dateOfBirth) {
    nextVal.dateOfBirth = parsed.dateOfBirth;
  }
  if (parsed.gender && (!currentVal.gender || currentVal.gender === 'NONE')) {
    nextVal.gender = parsed.gender;
  }
  if (parsed.maritalStatus) {
    nextVal.maritalStatus = parsed.maritalStatus;
  }
  if (parsed.citizenship) {
    nextVal.citizenship = parsed.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN';
    nextVal.nationalityType = parsed.citizenship;
  }
  if (parsed.kewarganegaraan && parsed.kewarganegaraan.includes('CHINA')) {
    nextVal.nationalityType = 'WNA';
    nextVal.citizenship = 'FOREIGN';
    nextVal.country = 'CHINA';
  }
  if (parsed.alamat && !currentVal.address) {
    nextVal.address = parsed.alamat;
  }
  if (parsed.province && !currentVal.province) nextVal.province = parsed.province;
  if ((parsed.cityRegency || parsed.city) && !currentVal.cityRegency)
    nextVal.cityRegency = parsed.cityRegency || parsed.city;
  if ((parsed.kecamatan || parsed.district) && !currentVal.district)
    nextVal.district = parsed.kecamatan || parsed.district;
  if ((parsed.kelDesa || parsed.village) && !currentVal.village)
    nextVal.village = parsed.kelDesa || parsed.village;
  if (parsed.rt && !currentVal.rt) nextVal.rt = parsed.rt;
  if (parsed.rw && !currentVal.rw) nextVal.rw = parsed.rw;
  if ((parsed.kodePos || parsed.postalCode) && !currentVal.postalCode)
    nextVal.postalCode = parsed.kodePos || parsed.postalCode;
  if (parsed.pekerjaan && !currentVal.occupation) nextVal.occupation = parsed.pekerjaan;
  return nextVal;
}

/** "Apply OCR" button: the KTP text wins over what is in the form. */
export function ktpTextToStakeholder(v: any, parsed: any) {
  return {
    ...v,
    ...v,
    idNumber: parsed.nik || v.idNumber,
    idType: parsed.nik ? 'KTP' : v.idType,
    firstName: parsed.firstName || v.firstName,
    middleName: parsed.middleName || v.middleName,
    lastName: parsed.lastName || v.lastName,
    name: parsed.nama || v.name,
    dateOfBirth: parsed.dateOfBirth || v.dateOfBirth,
    gender: parsed.gender || v.gender,
    maritalStatus: parsed.maritalStatus || v.maritalStatus,
    citizenship: parsed.citizenship
      ? parsed.citizenship === 'WNI'
        ? 'INDONESIAN'
        : 'FOREIGN'
      : v.citizenship,
    nationalityType: parsed.citizenship || v.nationalityType,
    country: parsed.kewarganegaraan?.includes('CHINA') ? 'CHINA' : v.country,
    address: parsed.alamat || v.address,
    province: parsed.province || v.province,
    cityRegency: parsed.cityRegency || parsed.city || v.cityRegency,
    district: parsed.kecamatan || parsed.district || v.district,
    village: parsed.kelDesa || parsed.village || v.village,
    rt: parsed.rt || v.rt,
    rw: parsed.rw || v.rw,
    postalCode: parsed.postalCode || parsed.kodePos || v.postalCode,
    occupation: parsed.pekerjaan || v.occupation,
  };
}
