export type StreetAddressHints = {
  kelDesa?: string | null;
  village?: string | null;
  kecamatan?: string | null;
  district?: string | null;
  city?: string | null;
  cityRegency?: string | null;
  province?: string | null;
  postalCode?: string | null;
  kodePos?: string | null;
};

const HAS_STREET_NUMBER_RE =
  /\b(?:no|nomor)\.?\s*\d+[a-zA-Z0-9/-]*\b|\b(?:kav|kavling)\.?\s*[a-zA-Z0-9/-]+\b|\bblok\.?\s+[a-zA-Z0-9/-]+\b/i;

const STREET_OR_UNIT_PART_RE =
  /\b(?:jl\.?|jalan|gg\.?|gang|blok|kav\.?|kavling|lt\.?|lantai|suite|unit|tower|gedung|ruko|komp\.?|komplek|perum\.?|no\.?\s*\d|nomor\.?\s*\d)\b/i;

const EXPLICIT_ADMIN_SEGMENT_RE =
  /^\s*(?:rt\s*[/.\s]*rw\b|rt\.?\s*\d{1,3}\b|rw\.?\s*\d{1,3}\b|kel\.?\s*\/?\s*desa\b|kelurahan\b|desa\b|kel\.|kecamatan\b|kec\.|kabupaten\b|kab\.|kota\s+adm\.?\b|provinsi\b|propinsi\b|prov\.|daerah\s+khusus\b|daerah\s+istimewa\b|dki\s+jakarta\b|kode\s*pos\b|\d{5}\s*$)/i;

const CITY_OR_PROVINCE_PREFIX_RE =
  /^(?:kota\b|jkt\b|jakarta\b|dki\b|daerah\s+khusus\b|daerah\s+istimewa\b)/i;

const INLINE_ADMIN_BOUNDARY_RE =
  /,?\s*\b(?:rt\s*[/.\s]*rw\b|rt\.?\s*\d{1,3}\s*[/.\s-]*rw|rt\.?\s*\d{1,3}\b|kel\.?\s*\/?\s*desa\b|kelurahan\b|kel\.|desa\b|kecamatan\b|kec\.|kabupaten\b|kab\.|kota\s+adm\.?\b|provinsi\b|propinsi\b|daerah\s+khusus\b|daerah\s+istimewa\b|dki\s+jakarta\b|kode\s*pos\b)/i;

function normalizeHint(raw?: string | null): string {
  return String(raw || '')
    .replace(/^(?:kel\.?\s*\/?\s*desa|kelurahan|desa|kel\.|kecamatan|kec\.|kabupaten|kab\.|kota\s+adm\.?|kota|provinsi|propinsi|prov\.?)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts only the street / building portion (up to the street number, before
 * RT/RW, kelurahan, kecamatan, city, province, or postal code) from a full
 * Indonesian address string.
 */
export function extractStreetAddress(
  fullOrRawAddress?: string | null,
  hints?: StreetAddressHints,
): string {
  const raw = String(fullOrRawAddress || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';

  const adminHints = [
    hints?.kelDesa,
    hints?.village,
    hints?.kecamatan,
    hints?.district,
    hints?.city,
    hints?.cityRegency,
    hints?.province,
  ]
    .map(normalizeHint)
    .filter(h => h.length >= 4);

  const matchesAdminHint = (seg: string): boolean => {
    const cleanSeg = normalizeHint(seg).replace(/\s+\d{5}$/, '').trim();
    if (!cleanSeg) return false;
    return adminHints.some(h => cleanSeg === h || cleanSeg.startsWith(`${h} `));
  };

  const isAdminSegment = (seg: string): boolean => {
    if (EXPLICIT_ADMIN_SEGMENT_RE.test(seg)) return true;
    if (!STREET_OR_UNIT_PART_RE.test(seg) && (CITY_OR_PROVINCE_PREFIX_RE.test(seg) || matchesAdminHint(seg))) {
      return true;
    }
    return false;
  };

  const parts = raw
    .split(/\s*,\s*/)
    .map(p => p.trim())
    .filter(Boolean);

  const kept: string[] = [];
  let hasStreetWithNumber = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i > 0) {
      if (isAdminSegment(part)) break;
      // Stop right after a street+number segment when the next segment is a bare
      // sub-district/village name (e.g. "..., Jl. Boulevard Raya No.1, Klp. Gading Tim, Kec. ...").
      if (hasStreetWithNumber && !STREET_OR_UNIT_PART_RE.test(part)) break;
    }
    kept.push(part);
    if (HAS_STREET_NUMBER_RE.test(part)) {
      hasStreetWithNumber = true;
    }
  }

  let street = (kept.length ? kept : [raw]).join(', ');

  // Strip inline administrative markers if there were no commas around them.
  const inlineMatch = INLINE_ADMIN_BOUNDARY_RE.exec(street);
  if (inlineMatch && inlineMatch.index > 0) {
    street = street.slice(0, inlineMatch.index);
  }

  // Strip any matching trailing region hint when comma-less after street number.
  for (const h of adminHints) {
    const hintRe = new RegExp(`[,\\s]+${escapeRegExp(h)}(?:\\s+\\d{5})?$`, 'i');
    if (hintRe.test(street) && !STREET_OR_UNIT_PART_RE.test(street.slice(street.search(hintRe)))) {
      street = street.replace(hintRe, '');
    }
  }

  // Strip trailing standalone 5-digit postal code.
  street = street.replace(/[,\s]+\d{5}$/, '');
  return street.replace(/[,;\s\-–—]+$/, '').trim();
}

export type FullAddressParts = StreetAddressHints & {
  alamat?: string | null;
  rtRw?: string | null;
  rt?: string | null;
  rw?: string | null;
};

/** Combines street/raw address with RT/RW and administrative regions into a single display string. */
export function formatKtpFullAddress(parts: FullAddressParts): string {
  const kel = parts.kelDesa || parts.village;
  const kec = parts.kecamatan || parts.district;
  const rtRw =
    parts.rtRw || (parts.rt && parts.rw ? `${parts.rt}/${parts.rw}` : '');
  return [
    parts.alamat,
    rtRw ? `RT/RW ${rtRw}` : '',
    kel ? `Kel. ${kel}` : '',
    kec ? `Kec. ${kec}` : '',
    parts.cityRegency || parts.city,
    parts.province,
    parts.kodePos || parts.postalCode,
  ]
    .filter(Boolean)
    .join(', ');
}
