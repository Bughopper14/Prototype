/** Company email check for the NIB form: a message for the user, or '' when the email is fine or empty. */
export function validateCompanyEmail(email?: string): string {
  if (!email || !email.trim()) return '';
  const val = email.trim();
  if (!val.includes('@'))
    return 'Format email tidak valid (harus mengandung @ dan domain perusahaan, misal: nama@perusahaan.com)';
  const parts = val.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1])
    return 'Format email tidak lengkap (harus ada nama pengguna sebelum @ dan nama domain setelah @)';
  const domainParts = parts[1].split('.');
  if (domainParts.length < 2 || domainParts.some(p => !p) || domainParts[domainParts.length - 1].length < 2)
    return 'Domain email tidak valid (harus memiliki domain lengkap, misal: @perusahaan.com / @perusahaan.co.id)';
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/.test(val))
    return 'Format email tidak valid (karakter tidak sesuai standar email perusahaan)';
  return '';
}
