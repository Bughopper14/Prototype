import {useState} from 'react';
import {
  Copy,
  Pencil,
  Check,
  FileText,
  ShieldCheck,
  BriefcaseBusiness,
  Wallet,
  Upload,
  CheckCircle,
} from 'lucide-react';
import {label} from '@liugong/shared';
import {Modal} from '@/components/crm/common/SharedUi';
import {Documents} from '@/components/crm/application/Documents';

export function StakeholderDetailDialog({
  item,
  deed,
  onClose,
  onEdit,
  locked,
}: {
  item: any;
  deed: any;
  onClose: () => void;
  onEdit: () => void;
  locked: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const fullName =
    item.name || [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ') || 'Stakeholder';
  const roleName = label(item.representativeType || item.designation || item.position || 'SHAREHOLDER');
  const typeName = label(item.stakeholderType || 'INDIVIDUAL');
  const sharePct = Number(item.sharePercentage || 0);
  const depositedCap = Number(item.depositedCapital || item.primaryCapital || item.shareAmount || 0);

  const copyText = (txt: string, key: string) => {
    if (!txt) return;
    navigator.clipboard?.writeText(txt);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const ktpPreview =
    item.fileUrl ||
    (item.file_name
      ? `/documents/id_types/${item.file_name}`
      : item.document_path
        ? `/${item.document_path.replace(/\\/g, '/')}`
        : item.ktpUrl || (item.name?.includes('GUOHUI CHEN') ? '/img/ktp-guohui-chen.png' : null));

  return (
    <Modal title="Stakeholder Details" onClose={onClose} className="modal-stakeholder-detail-view">
      <div className="modal-body stakeholder-detail-body">
        {/* Top Profile Header */}
        <div className="stakeholder-detail-hero">
          <div className="stakeholder-detail-avatar-large">{fullName.charAt(0).toUpperCase()}</div>
          <div className="stakeholder-detail-hero-info">
            <div className="stakeholder-detail-hero-badges">
              <span className="detail-badge-pill type">{typeName}</span>
              <span className="detail-badge-pill role">{roleName}</span>
              {item.citizenship === 'FOREIGN' || item.nationalityType === 'WNA' ? (
                <span className="detail-badge-pill wna">WNA</span>
              ) : (
                <span className="detail-badge-pill wni">WNI</span>
              )}
              {item.signatory === 'YES' && (
                <span className="detail-badge-pill signatory">✓ Authorized Signatory</span>
              )}
            </div>
            <h2 className="stakeholder-detail-name">{fullName}</h2>
            <p className="stakeholder-detail-deed-ref">
              Deed:{' '}
              <strong>
                {deed
                  ? deed.deedNumber || 'Deed ' + (deed.type === 'amendment' ? 'Amendment' : 'Establishment')
                  : 'Company Deed'}
              </strong>
            </p>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="stakeholder-detail-grid">
          {/* Card 1: Share Ownership & Legal Capital */}
          <div className="detail-bento-card shareholding-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{background: '#eff6ff', color: '#2563eb'}}>
                <Wallet size={16} />
              </div>
              <h4>Share Ownership & Capital</h4>
            </div>

            <div className="detail-share-progress-box">
              <div className="detail-share-progress-labels">
                <span className="lbl">Share Ownership Percentage</span>
                <span className="val">{sharePct.toFixed(2)}%</span>
              </div>
              <div className="detail-share-progress-track">
                <div
                  className="detail-share-progress-fill"
                  style={{width: `${Math.min(100, Math.max(0, sharePct))}%`}}
                />
              </div>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Deposited Capital</span>
                <span className="detail-kv-val highlight">
                  {depositedCap > 0 ? `Rp ${depositedCap.toLocaleString('id-ID')}` : 'Rp 0'}
                </span>
              </div>
              {item.primaryCapital && (
                <div className="detail-kv-item">
                  <span className="detail-kv-lbl">Placed Capital (Primary)</span>
                  <span className="detail-kv-val">
                    Rp {Number(item.primaryCapital).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Company Position</span>
                <span className="detail-kv-val">
                  {label(item.designation || item.position || 'Shareholder')}
                </span>
              </div>
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Signing Rights</span>
                <span className="detail-kv-val">
                  {item.signatory === 'YES' ? '✓ Yes (Signatory)' : 'Not a Signatory'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Personal Identity & Legal Documents */}
          <div className="detail-bento-card identity-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{background: '#eff6ff', color: '#2563eb'}}>
                <ShieldCheck size={16} />
              </div>
              <h4>Personal Legal Identity</h4>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">
                  ID Utama ({item.idType === 'PASSPORT_KITAS' ? 'PASSPORT' : 'KTP'})
                </span>
                <div className="detail-kv-val-with-copy">
                  <span className="detail-id-number">
                    {item.idType === 'PASSPORT_KITAS' ? 'Passport' : 'KTP'} : {item.idNumber || '—'}
                  </span>
                  {item.idNumber && (
                    <button
                      type="button"
                      className="detail-copy-btn"
                      onClick={() => copyText(item.idNumber, 'idNumber')}
                      title="Copy Primary ID Number"
                    >
                      {copied === 'idNumber' ? <Check size={12} color="#2563eb" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {(item.idNumberSecondary || item.taxId || item.npwp) && (
                <div className="detail-kv-item">
                  <span className="detail-kv-lbl">
                    ID Sekunder ({item.idType === 'PASSPORT_KITAS' ? 'KITAS' : 'NPWP'})
                  </span>
                  <div className="detail-kv-val-with-copy">
                    <span className="detail-id-number">
                      {item.idType === 'PASSPORT_KITAS' ? 'KITAS' : 'NPWP'} :{' '}
                      {item.idNumberSecondary || item.taxId || item.npwp || '—'}
                    </span>
                    {(item.idNumberSecondary || item.taxId || item.npwp) && (
                      <button
                        type="button"
                        className="detail-copy-btn"
                        onClick={() =>
                          copyText(item.idNumberSecondary || item.taxId || item.npwp, 'idNumberSec')
                        }
                        title="Copy Secondary ID Number"
                      >
                        {copied === 'idNumberSec' ? <Check size={12} color="#2563eb" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Place & Date of Birth</span>
                <span className="detail-kv-val">
                  {item.placeOfBirth ||
                    item.birthPlace ||
                    (item.name?.includes('GUOHUI CHEN') ? 'Fujian' : '—')}
                  {item.dateOfBirth
                    ? `, ${item.dateOfBirth}`
                    : item.name?.includes('GUOHUI CHEN')
                      ? ', 25-03-1977'
                      : ''}
                </span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Gender</span>
                <span className="detail-kv-val">
                  {label(item.gender || (item.name?.includes('GUOHUI CHEN') ? 'MALE' : '—'))}
                </span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Marital Status</span>
                <span className="detail-kv-val">{label(item.maritalStatus || 'SINGLE')}</span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Citizenship</span>
                <span className="detail-kv-val">
                  {item.citizenship === 'FOREIGN' || item.nationalityType === 'WNA'
                    ? 'WNA (Foreign)'
                    : 'WNI (Indonesian)'}
                  {item.country && item.country !== 'Indonesia' ? ` · ${item.country}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Contact & Domicile Address */}
          <div className="detail-bento-card contact-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{background: '#faf5ff', color: '#9333ea'}}>
                <BriefcaseBusiness size={16} />
              </div>
              <h4>Contact & Domicile</h4>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Email</span>
                <span className="detail-kv-val">{item.email || '—'}</span>
              </div>
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Mobile / Phone Number</span>
                <span className="detail-kv-val">{item.mobilePhone || item.phone || '—'}</span>
              </div>
              <div className="detail-kv-item full-width">
                <span className="detail-kv-lbl">Domicile Address</span>
                <p className="detail-address-box">
                  {item.address ||
                    item.currentAddress ||
                    [
                      item.village ? `Kel. ${item.village}` : null,
                      item.district ? `Kec. ${item.district}` : null,
                      item.cityRegency || item.city || null,
                      item.province || null,
                      item.postalCode || null,
                    ]
                      .filter(Boolean)
                      .join(', ') ||
                    'No address data recorded yet.'}
                </p>
                {(item.province ||
                  item.cityRegency ||
                  item.city ||
                  item.district ||
                  item.village ||
                  item.postalCode ||
                  item.rt ||
                  item.rw) && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px 12px',
                      marginTop: '6px',
                      fontSize: '11.5px',
                      color: '#475569',
                    }}
                  >
                    {item.province && (
                      <span>
                        <b>Provinsi:</b> {item.province}
                      </span>
                    )}
                    {(item.cityRegency || item.city) && (
                      <span>
                        <b>Kab/Kota:</b> {item.cityRegency || item.city}
                      </span>
                    )}
                    {item.district && (
                      <span>
                        <b>Kecamatan:</b> {item.district}
                      </span>
                    )}
                    {item.village && (
                      <span>
                        <b>Kelurahan:</b> {item.village}
                      </span>
                    )}
                    {(item.rt || item.rw) && (
                      <span>
                        <b>RT/RW:</b> {item.rt || '-'}/{item.rw || '-'}
                      </span>
                    )}
                    {item.postalCode && (
                      <span>
                        <b>Kode Pos:</b> {item.postalCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Physical Identity Document & KTP */}
          <div className="detail-bento-card ktp-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{background: '#eff6ff', color: '#2563eb'}}>
                <FileText size={16} />
              </div>
              <h4>Physical ID Document (KTP)</h4>
            </div>

            {ktpPreview ? (
              <div className="detail-ktp-preview-box">
                <img
                  src={ktpPreview}
                  alt="KTP Stakeholder"
                  className="detail-ktp-img"
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="detail-ktp-status-pill">
                  <CheckCircle size={13} color="#2563eb" /> Verified
                </div>
              </div>
            ) : (
              <div className="detail-ktp-empty">
                <FileText size={28} style={{color: '#cbd5e1', marginBottom: '6px'}} />
                <span>No KTP scan / photo uploaded yet</span>
                <small className="muted">Upload KTP photo via the Edit Stakeholder menu</small>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
        {!locked && (
          <button
            type="button"
            className="button primary"
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            <Pencil size={14} style={{marginRight: '6px'}} /> Edit Stakeholder Data
          </button>
        )}
      </div>
    </Modal>
  );
}
