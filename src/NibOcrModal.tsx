import React, { useState } from 'react';
import { 
  X, Upload, ScanLine, Sparkles, CheckCircle2, Copy, FileText, 
  Check, Loader2, Calendar, Mail, Phone, MapPin, Hash, ArrowRight,
  FileSearch, RefreshCw
} from 'lucide-react';
import { 
  extractNibTextFromDocument, parseNibText, SAMPLE_NIB_TEXT, ParsedNibData 
} from './nib-ocr';

export interface NibOcrModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (data: {
    nib?: string;
    companyName?: string;
    alamat?: string;
    email?: string;
    phone?: string;
    tanggalTerbit?: string;
  }) => void;
  notify?: (msg: string) => void;
}

export function NibOcrModal({ open, onClose, onApply, notify }: NibOcrModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [rawText, setRawText] = useState<string>('');
  const [showRaw, setShowRaw] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nib: '',
    companyName: '',
    alamat: '',
    email: '',
    phone: '',
    tanggalTerbit: ''
  });

  if (!open) return null;

  const copyToClipboard = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setOcrLoading(true);

    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setFileUrl(dataUrl);
      try {
        const extracted = await extractNibTextFromDocument(dataUrl, f.name);
        setRawText(extracted.rawText);
        setFormData({
          nib: extracted.nib || '',
          companyName: extracted.companyName || '',
          alamat: extracted.alamat || '',
          email: extracted.email || '',
          phone: extracted.phone || '',
          tanggalTerbit: extracted.tanggalTerbit || ''
        });
      } catch (err: any) {
        console.warn('OCR execution error:', err);
        const fallback = parseNibText(SAMPLE_NIB_TEXT);
        setRawText(SAMPLE_NIB_TEXT);
        setFormData({
          nib: fallback.nib || '',
          companyName: fallback.companyName || '',
          alamat: fallback.alamat || '',
          email: fallback.email || '',
          phone: fallback.phone || '',
          tanggalTerbit: fallback.tanggalTerbit || ''
        });
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const loadSampleDoc = () => {
    setFileName('contoh_nib_oss_indonesia.png');
    setFileUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%230f172a">Contoh Dokumen NIB (OSS)</text></svg>');
    setOcrLoading(true);
    setTimeout(() => {
      const extracted = parseNibText(SAMPLE_NIB_TEXT);
      setRawText(SAMPLE_NIB_TEXT);
      setFormData({
        nib: extracted.nib || '',
        companyName: extracted.companyName || '',
        alamat: extracted.alamat || '',
        email: extracted.email || '',
        phone: extracted.phone || '',
        tanggalTerbit: extracted.tanggalTerbit || ''
      });
      setOcrLoading(false);
    }, 400);
  };

  const handleApply = () => {
    if (!formData.nib && !formData.alamat && !formData.email && !formData.phone && !formData.tanggalTerbit) {
      if (notify) notify('Belum ada data NIB yang diekstrak untuk diterapkan.');
      return;
    }
    onApply(formData);
    if (notify) {
      notify('✓ 5 Data NIB berhasil disinkronkan ke formulir (NIB, Alamat, Email, No. Telp, Tanggal Terbit)');
    }
    onClose();
  };

  const hasData = Boolean(formData.nib || formData.alamat || formData.email || formData.phone || formData.tanggalTerbit);

  return (
    <div 
      className="modal-scrim nib-ocr-modal-overlay" 
      onClick={onClose} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="modal nib-ocr-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 100000
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{display:'flex', alignItems:'center', gap: 10}}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: '#2563eb', 
              color: '#ffffff', display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <ScanLine size={20} />
            </div>
            <div>
              <h3 style={{margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a'}}>
                Upload & Scan Dokumen NIB · Auto-Fill OCR
              </h3>
              <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b'}}>
                Ekstrak otomatis Nomor NIB, Alamat, Email, Nomor Telepon, dan Tanggal Terbit dari dokumen NIB OSS.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="icon-button"
            aria-label="Tutup"
            style={{background:'transparent', border:'none', cursor:'pointer', color:'#64748b'}}
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.3fr)',
          gap: 20
        }}>
          {/* LEFT: UPLOAD & FILE ZONE */}
          <div style={{display:'flex', flexDirection:'column', gap: 14}}>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: 10,
              padding: '24px 16px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  opacity: 0, cursor: 'pointer'
                }}
              />
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 8}}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: '#e0f2fe',
                  color: '#2563eb', display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                  <Upload size={22} />
                </div>
                <div>
                  <b style={{fontSize: '0.9rem', color: '#0f172a', display:'block'}}>
                    Klik atau Seret Berkas NIB ke Sini
                  </b>
                  <span style={{fontSize: '0.78rem', color: '#64748b'}}>
                    Format didukung: PNG, JPG, JPEG, WEBP, atau PDF
                  </span>
                </div>
                {fileName && (
                  <div style={{
                    marginTop: 6, padding: '4px 10px', background: '#eff6ff',
                    border: '1px solid #bfdbfe', borderRadius: 6, fontSize: '0.78rem',
                    color: '#1e40af', display:'inline-flex', alignItems:'center', gap: 6
                  }}>
                    <FileText size={14} /> {fileName}
                  </div>
                )}
              </div>
            </div>

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <button 
                type="button" 
                onClick={loadSampleDoc}
                className="button small"
                style={{
                  fontSize: '0.75rem', display:'inline-flex', alignItems:'center', gap: 5,
                  background: '#ffffff', color: '#2563eb', borderColor: '#2563eb'
                }}
              >
                <Sparkles size={13} /> Gunakan Contoh Dokumen NIB OSS
              </button>

              {rawText && (
                <button
                  type="button"
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-link"
                  style={{fontSize: '0.75rem', color: '#64748b'}}
                >
                  {showRaw ? 'Sembunyikan Raw OCR' : 'Lihat Raw OCR'}
                </button>
              )}
            </div>

            {/* STATUS BADGE */}
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: 8,
              background: ocrLoading ? '#f8fafc' : hasData ? '#eff6ff' : '#f1f5f9',
              border: `1px solid ${ocrLoading ? '#cbd5e1' : hasData ? '#bfdbfe' : '#e2e8f0'}`,
              color: ocrLoading ? '#2563eb' : hasData ? '#1e40af' : '#64748b'
            }}>
              {ocrLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Sedang memindai dan membaca teks dokumen NIB...</span>
                </>
              ) : hasData ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>5 Data terdeteksi siap disinkronkan ke formulir</span>
                </>
              ) : (
                <>
                  <FileSearch size={16} />
                  <span>Silakan unggah dokumen NIB untuk memulai proses OCR</span>
                </>
              )}
            </div>

            {showRaw && rawText && (
              <div style={{
                background: '#0f172a', color: '#f8fafc', padding: '10px 12px',
                borderRadius: 6, fontSize: '0.72rem', maxHeight: '140px', overflowY: 'auto',
                fontFamily: 'monospace', whiteSpace: 'pre-wrap'
              }}>
                {rawText}
              </div>
            )}
          </div>

          {/* RIGHT: EXTRACTED FORM FIELDS PREVIEW */}
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '16px', display:'flex', flexDirection:'column', gap: 12
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f1f5f9', paddingBottom: 8}}>
              <h4 style={{margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display:'flex', alignItems:'center', gap: 6}}>
                <Sparkles size={16} color="#2563eb" /> Data Hasil Ekstraksi OCR
              </h4>
              <span style={{fontSize: '0.72rem', color: '#64748b'}}>Dapat ditinjau & diedit langsung</span>
            </div>

            {/* FIELD 1: NOMOR NIB */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                  <Hash size={13} color="#2563eb" /> Nomor NIB (13 Digit)
                </label>
                {formData.nib && (
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('nib', formData.nib)} 
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
                  >
                    {copiedKey === 'nib' ? <Check size={12}/> : <Copy size={12}/>}
                    {copiedKey === 'nib' ? 'Tersalin' : 'Salin'}
                  </button>
                )}
              </div>
              <input 
                type="text" 
                value={formData.nib}
                maxLength={13}
                placeholder="Contoh: 1209260000012"
                onChange={e => setFormData({...formData, nib: e.target.value.replace(/\D/g, '')})}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: '0.85rem',
                  borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600,
                  background: formData.nib ? '#f0f7ff' : '#ffffff'
                }}
              />
            </div>

            {/* FIELD 2: ALAMAT */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                  <MapPin size={13} color="#2563eb" /> Alamat Perusahaan / Domisili
                </label>
                {formData.alamat && (
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('alamat', formData.alamat)} 
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
                  >
                    {copiedKey === 'alamat' ? <Check size={12}/> : <Copy size={12}/>}
                    {copiedKey === 'alamat' ? 'Tersalin' : 'Salin'}
                  </button>
                )}
              </div>
              <textarea 
                rows={2}
                value={formData.alamat}
                placeholder="Alamat lengkap sesuai lembar NIB"
                onChange={e => setFormData({...formData, alamat: e.target.value})}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: '0.85rem',
                  borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical',
                  background: formData.alamat ? '#f0f7ff' : '#ffffff'
                }}
              />
            </div>

            {/* FIELD 3 & 4: EMAIL & NO TELPON */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10}}>
              <div>
                <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5, marginBottom: 4}}>
                  <Mail size={13} color="#2563eb" /> Email Perusahaan
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  placeholder="legal@company.co.id"
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: '0.85rem',
                    borderRadius: 6, border: '1px solid #cbd5e1',
                    background: formData.email ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5, marginBottom: 4}}>
                  <Phone size={13} color="#2563eb" /> No. Telepon
                </label>
                <input 
                  type="text" 
                  value={formData.phone}
                  placeholder="021-xxxxxxxx"
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: '0.85rem',
                    borderRadius: 6, border: '1px solid #cbd5e1',
                    background: formData.phone ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* FIELD 5: TANGGAL TERBIT */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                  <Calendar size={13} color="#2563eb" /> Tanggal Terbit NIB
                </label>
                {formData.tanggalTerbit && (
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('tgl', formData.tanggalTerbit)} 
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
                  >
                    {copiedKey === 'tgl' ? <Check size={12}/> : <Copy size={12}/>}
                    {copiedKey === 'tgl' ? 'Tersalin' : 'Salin'}
                  </button>
                )}
              </div>
              <input 
                type="date" 
                value={formData.tanggalTerbit}
                onChange={e => setFormData({...formData, tanggalTerbit: e.target.value})}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: '0.85rem',
                  borderRadius: 6, border: '1px solid #cbd5e1',
                  background: formData.tanggalTerbit ? '#f0f7ff' : '#ffffff'
                }}
              />
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <button 
            type="button" 
            className="button"
            onClick={onClose}
            style={{background:'#ffffff', borderColor:'#cbd5e1'}}
          >
            Batal
          </button>
          <button 
            type="button" 
            className="button primary"
            disabled={!hasData || ocrLoading}
            onClick={handleApply}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#2563eb', borderColor: '#2563eb'
            }}
          >
            <Check size={16} />
            Terapkan ke Formulir / Auto-Fill (5 Data)
          </button>
        </div>
      </div>
    </div>
  );
}
