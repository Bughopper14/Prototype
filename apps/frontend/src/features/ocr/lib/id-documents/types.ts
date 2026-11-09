/** Fields read from KTP, passport, NPWP and KITAS scans. */

export interface ParsedKtpData {
  nik?: string;
  nama?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tempatTglLahir?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  golonganDarah?: string;
  status?: string;
  maritalStatus?: string;
  kewarganegaraan?: string;
  citizenship?: 'WNI' | 'WNA';
  alamat?: string;
  rtRw?: string;
  rt?: string;
  rw?: string;
  kelDesa?: string;
  village?: string;
  kecamatan?: string;
  district?: string;
  province?: string;
  cityRegency?: string;
  city?: string;
  kodePos?: string;
  postalCode?: string;
  agama?: string;
  pekerjaan?: string;
  berlaku_hingga?: string;
  rawText: string;
}

export interface ParsedPassportData {
  passportNumber?: string;
  countryCode?: string;
  countryName?: string;
  fullName?: string;
  surname?: string;
  givenNames?: string;
  nationality?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  personalId?: string;
  mrzLine1?: string;
  mrzLine2?: string;
  rawText: string;
}

export interface ParsedNpwpData {
  npwpNumber?: string;
  rawNpwp?: string;
  nama?: string;
  nik?: string;
  alamat?: string;
  kelurahanKecamatan?: string;
  kotaProvinsi?: string;
  kpp?: string;
  tanggalTerdaftar?: string;
  rawText: string;
}

export interface ParsedKitasData {
  permitNumber?: string;
  niora?: string;
  nama?: string;
  kewarganegaraan?: string;
  tanggalLahir?: string;
  gender?: 'MALE' | 'FEMALE';
  berlakuHingga?: string;
  instansiPenerbit?: string;
  rawText: string;
}
