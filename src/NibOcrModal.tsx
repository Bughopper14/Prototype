import React, { useState } from 'react';
import { 
  X, Upload, ScanLine, Sparkles, CheckCircle2, Copy, FileText, 
  Check, Loader2, Calendar, Mail, Phone, MapPin, Hash, ArrowRight,
  FileSearch, RefreshCw, Building2, ZoomIn, ZoomOut, RotateCw, Maximize2
} from 'lucide-react';
import { api } from './api';
import { 
  extractNibTextFromDocument, parseNibText, extractWilayahFromAddressAndText, 
  SAMPLE_NIB_TEXT, ParsedNibData 
} from './nib-ocr';
import { useMasterData } from './master-data';

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
    city?: string;
    district?: string;
    village?: string;
    postalCode?: string;
    province?: string;
    rt?: string;
    rw?: string;
  }) => void;
  notify?: (msg: string) => void;
}

export function NibOcrModal({ open, onClose, onApply, notify }: NibOcrModalProps) {
  const master = useMasterData();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [rawText, setRawText] = useState<string>('');
  const [showRaw, setShowRaw] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    nib: '',
    companyName: '',
    alamat: '',
    email: '',
    phone: '',
    tanggalTerbit: '',
    city: '',
    district: '',
    village: '',
    postalCode: '',
    province: '',
    rt: '',
    rw: ''
  });

  if (!open) return null;

  const copyToClipboard = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const processFile = async (f: File) => {
    if (!f) return;
    setFileName(f.name);
    setOcrLoading(true);
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    setFileType(isPdf ? 'pdf' : 'image');
    try {
      const objectUrl = URL.createObjectURL(f);
      setFileUrl(objectUrl);
    } catch {}
    setZoom(1);
    setRotation(0);

    try {
      // 1. Send file directly to OCR backend scanner (supports PDF, PNG, JPG, JPEG, WEBP)
      const uploadPayload = new FormData();
      uploadPayload.append('file', f);
      uploadPayload.append('doc_type', 'nib');
      
      const res = await api('/ocr/scan', 'POST', uploadPayload);
      if (res && res.data) {
        const d = res.data;
        const newNib = String(d.nib || '').replace(/\D/g, '').slice(0, 13);
        const newCompanyName = String(d.company_name || d.companyName || '').trim();
        const rawAddress = String(d.alamat_lengkap || d.fullAddress || d.alamat || d.companyAddress || '').trim();
        
        let newProvince = String(d.provinsi || d.province || '').trim();
        let newCity = String(d.kota || d.city || d.cityRegency || '').trim();
        let newDistrict = String(d.kecamatan || d.district || '').trim();
        let newVillage = String(d.kel_desa || d.village || d.kelurahan || '').trim();
        let newPostal = String(d.kode_pos || d.postalCode || '').replace(/\D/g, '').slice(0, 5);
        let newRt = String(d.rt || '').trim();
        let newRw = String(d.rw || '').trim();

        // If any region fields are missing, resolve them via address parser & master data
        if (!newProvince || !newCity || !newDistrict || !newVillage || !newPostal || !newRt || !newRw) {
          const w = extractWilayahFromAddressAndText(rawAddress, rawAddress, master);
          if (!newProvince && w.province) newProvince = w.province;
          if (!newCity && w.city) newCity = w.city;
          if (!newDistrict && w.district) newDistrict = w.district;
          if (!newVillage && w.village) newVillage = w.village;
          if (!newPostal && w.postalCode) newPostal = w.postalCode;
          if (!newRt && w.rt) newRt = w.rt;
          if (!newRw && w.rw) newRw = w.rw;
        }

        const newEmail = String(d.email || '').trim();
        const newPhone = String(d.phone || d.phoneFax || '').trim();
        const newTanggal = String(d.tanggal_terbit || d.establishmentDate || '').trim();

        setFormData({
          nib: newNib,
          companyName: newCompanyName,
          alamat: rawAddress,
          province: newProvince,
          city: newCity,
          district: newDistrict,
          village: newVillage,
          postalCode: newPostal,
          email: newEmail,
          phone: newPhone,
          tanggalTerbit: newTanggal,
          rt: newRt,
          rw: newRw
        });
        setRawText(rawAddress || JSON.stringify(d, null, 2));
        if (notify) {
          notify(`✓ Document ${f.name} successfully scanned and parsed via OCR`);
        }
        setOcrLoading(false);
        return;
      }
    } catch (backendErr: any) {
      console.warn('Backend OCR scan failed:', backendErr);
      if (isPdf) {
        setOcrLoading(false);
        if (notify) notify(`Document scan error: ${backendErr?.message || 'Server error'}`);
        return;
      }
    }

    if (!isPdf) {
      // 2. Client-side fallback for images when server is unavailable
      const r = new FileReader();
      r.onload = async () => {
        const dataUrl = r.result as string;
        setFileUrl(dataUrl);
        try {
          const extracted = await extractNibTextFromDocument(dataUrl, f.name, master);
          setRawText(extracted.rawText);
          setFormData({
            nib: extracted.nib || '',
            companyName: extracted.companyName || '',
            alamat: extracted.alamat || '',
            email: extracted.email || '',
            phone: extracted.phone || '',
            tanggalTerbit: extracted.tanggalTerbit || '',
            city: extracted.city || '',
            district: extracted.district || '',
            village: extracted.village || '',
            postalCode: extracted.postalCode || '',
            province: extracted.province || '',
            rt: extracted.rt || '',
            rw: extracted.rw || ''
          });
        } catch (err: any) {
          console.warn('Client-side OCR fallback error:', err);
        } finally {
          setOcrLoading(false);
        }
      };
      r.readAsDataURL(f);
    } else {
      setOcrLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const loadSampleDoc = () => {
    setFileName('sample_oss_nib_document.png');
    setFileUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%230f172a">Sample OSS NIB Document</text></svg>');
    setOcrLoading(true);
    setTimeout(() => {
      const extracted = parseNibText(SAMPLE_NIB_TEXT, master);
      setRawText(SAMPLE_NIB_TEXT);
      setFormData({
        nib: extracted.nib || '',
        companyName: extracted.companyName || '',
        alamat: extracted.alamat || '',
        email: extracted.email || '',
        phone: extracted.phone || '',
        tanggalTerbit: extracted.tanggalTerbit || '',
        city: extracted.city || '',
        district: extracted.district || '',
        village: extracted.village || '',
        postalCode: extracted.postalCode || '',
        province: extracted.province || '',
        rt: extracted.rt || '',
        rw: extracted.rw || ''
      });
      setOcrLoading(false);
    }, 300);
  };

  const filledCount = [
    formData.nib,
    formData.companyName,
    formData.alamat,
    formData.province,
    formData.city,
    formData.district,
    formData.village,
    formData.postalCode,
    formData.email,
    formData.phone,
    formData.tanggalTerbit
  ].filter(Boolean).length;

  const handleApply = () => {
    if (filledCount === 0) {
      if (notify) notify('No NIB data extracted to apply.');
      return;
    }
    // Apply data to outside form
    onApply(formData);
    if (notify) {
      notify(`✓ ${filledCount} NIB fields successfully synced to form`);
    }
    onClose();
  };

  const hasData = filledCount > 0;

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
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="modal nib-ocr-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(1600px, 96vw)',
          maxWidth: '96vw',
          maxHeight: '94vh',
          height: 'min(920px, 94vh)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.45)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 100000
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          flexShrink: 0
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
                Upload & Scan NIB Document · Auto-Fill OCR
              </h3>
              <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b'}}>
                Automatically extract NIB number, company name, address, administrative regions (regency, district, village, zip code), contacts, and issue date.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="icon-button"
            aria-label="Close"
            style={{background:'transparent', border:'none', cursor:'pointer', color:'#64748b'}}
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{
          padding: '16px 20px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          flex: '1 1 auto',
          minHeight: 0
        }}>
          {/* LEFT: UPLOAD & FILE ZONE (50% VIEW) */}
          <div style={{display:'flex', flexDirection:'column', gap: 12, height: '100%', minHeight: 0}}>
            {fileUrl ? (
              <div style={{
                background: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 0',
                minHeight: 0
              }}>
                {/* TOOLBAR */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 12px',
                  background: '#1e293b',
                  borderBottom: '1px solid #334155',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '55%' }}>
                    <FileText size={14} color="#60a5fa" />
                    <span style={{ fontSize: '0.74rem', color: '#f8fafc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fileName || 'NIB Document'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                      title="Zoom Out"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', minWidth: 32, textAlign: 'center' }}>
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                      title="Zoom In"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      title="Rotate 90°"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <RotateCw size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setZoom(1); setRotation(0); }}
                      title="Reset"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>
                </div>

                {/* PREVIEW CANVAS */}
                <div style={{
                  flex: '1 1 0',
                  minHeight: '480px',
                  height: '100%',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#090d16',
                  padding: '8px'
                }}>
                  {fileType === 'pdf' ? (
                    <iframe
                      src={`${fileUrl}#toolbar=0`}
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4, background: '#ffffff', minHeight: '480px' }}
                      title="NIB PDF Preview"
                    />
                  ) : (
                    <img
                      src={fileUrl}
                      alt="NIB Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  )}
                </div>

                {/* BOTTOM ACTION */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: '#1e293b',
                  borderTop: '1px solid #334155',
                  flexShrink: 0
                }}>
                  <label style={{ fontSize: '0.72rem', color: '#60a5fa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <RefreshCw size={12} /> Replace NIB Document
                    <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                  <button
                    type="button"
                    onClick={() => { setFileUrl(null); setFileName(''); setFileType(null); }}
                    style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    Remove Document
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) processFile(droppedFile);
                }}
                style={{
                  border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: isDragging ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  flex: '1 1 0',
                  minHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer'
                  }}
                />
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 10}}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', background: isDragging ? '#dbeafe' : '#e0f2fe',
                    color: '#2563eb', display:'flex', alignItems:'center', justifyContent:'center'
                  }}>
                    <Upload size={26} />
                  </div>
                  <div>
                    <b style={{fontSize: '0.96rem', color: '#0f172a', display:'block'}}>
                      {isDragging ? 'Drop NIB Document Here' : 'Click or Drag NIB File Here'}
                    </b>
                    <span style={{fontSize: '0.8rem', color: '#64748b'}}>
                      Supported formats: PNG, JPG, JPEG, WEBP, or PDF
                    </span>
                  </div>
                </div>
              </div>
            )}

            {rawText && (
              <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', flexShrink: 0}}>
                <button
                  type="button"
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-link"
                  style={{fontSize: '0.75rem', color: '#64748b'}}
                >
                  {showRaw ? 'Hide Raw OCR' : 'View Raw OCR'}
                </button>
              </div>
            )}

            {/* STATUS BADGE */}
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: 8,
              background: ocrLoading ? '#f8fafc' : hasData ? '#eff6ff' : '#f1f5f9',
              border: `1px solid ${ocrLoading ? '#cbd5e1' : hasData ? '#bfdbfe' : '#e2e8f0'}`,
              color: ocrLoading ? '#2563eb' : hasData ? '#1e40af' : '#64748b',
              flexShrink: 0
            }}>
              {ocrLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Scanning and reading NIB document via OCR Engine...</span>
                </>
              ) : hasData ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>{filledCount} Fields detected and ready to sync to form</span>
                </>
              ) : (
                <>
                  <FileSearch size={16} />
                  <span>Please upload a NIB document to start OCR processing</span>
                </>
              )}
            </div>

            {showRaw && rawText && (
              <div style={{
                background: '#0f172a', color: '#f8fafc', padding: '10px 12px',
                borderRadius: 6, fontSize: '0.72rem', maxHeight: '120px', overflowY: 'auto',
                fontFamily: 'monospace', whiteSpace: 'pre-wrap', flexShrink: 0
              }}>
                {rawText}
              </div>
            )}
          </div>

          {/* RIGHT: EXTRACTED FORM FIELDS PREVIEW */}
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '16px', display:'flex', flexDirection:'column',
            height: '100%', minHeight: 0
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f1f5f9', paddingBottom: 8, marginBottom: 12, flexShrink: 0}}>
              <h4 style={{margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display:'flex', alignItems:'center', gap: 6}}>
                <Sparkles size={15} color="#2563eb" /> OCR Extracted Data
              </h4>
              <span style={{fontSize: '0.72rem', color: '#64748b'}}>Review & edit before applying</span>
            </div>

            {/* SCROLLABLE FORM FIELDS */}
            <div style={{
              flex: '1 1 0',
              overflowY: 'auto',
              paddingRight: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: 11,
              minHeight: 0
            }}>

            {/* FIELD 1: NOMOR NIB */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 3}}>
                <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                  <Hash size={12} color="#2563eb" /> NIB Number (13 Digits)
                </label>
                {formData.nib && (
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('nib', formData.nib)} 
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.7rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
                  >
                    {copiedKey === 'nib' ? <Check size={11}/> : <Copy size={11}/>}
                    {copiedKey === 'nib' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <input 
                type="text" 
                value={formData.nib}
                maxLength={13}
                placeholder="e.g. 1209260000012"
                onChange={e => setFormData({...formData, nib: e.target.value.replace(/\D/g, '')})}
                style={{
                  width: '100%', padding: '6px 9px', fontSize: '0.82rem',
                  borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600,
                  background: formData.nib ? '#f0f7ff' : '#ffffff'
                }}
              />
            </div>

            {/* FIELD 2: COMPANY NAME */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 3}}>
                <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                  <Building2 size={12} color="#2563eb" /> Company Name
                </label>
                {formData.companyName && (
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('companyName', formData.companyName)} 
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.7rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
                  >
                    {copiedKey === 'companyName' ? <Check size={11}/> : <Copy size={11}/>}
                    {copiedKey === 'companyName' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <input 
                type="text" 
                value={formData.companyName}
                placeholder="e.g. PT NUSANTARA MINING RESOURCES"
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                style={{
                  width: '100%', padding: '6px 9px', fontSize: '0.82rem',
                  borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600,
                  background: formData.companyName ? '#f0f7ff' : '#ffffff'
                }}
              />
            </div>

            {/* FIELD 3: ALAMAT */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 3}}>
                <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                  <MapPin size={12} color="#2563eb" /> Company Address / Domicile
                </label>
                {formData.alamat && (
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('alamat', formData.alamat)} 
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.7rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
                  >
                    {copiedKey === 'alamat' ? <Check size={11}/> : <Copy size={11}/>}
                    {copiedKey === 'alamat' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <textarea 
                rows={2}
                value={formData.alamat}
                placeholder="Full address as stated on the NIB document"
                onChange={e => setFormData({...formData, alamat: e.target.value})}
                style={{
                  width: '100%', padding: '6px 9px', fontSize: '0.82rem',
                  borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical',
                  background: formData.alamat ? '#f0f7ff' : '#ffffff'
                }}
              />
            </div>

            {/* WILAYAH: PROVINSI, KABUPATEN/KOTA, KECAMATAN, KELURAHAN, KODE POS */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '10px', display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <span style={{fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                Administrative Regions (Wilayah)
              </span>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8}}>
                <div>
                  <label style={{fontSize: '0.72rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 2}}>
                    Province (Provinsi)
                  </label>
                  <input 
                    type="text" 
                    value={formData.province}
                    placeholder="e.g. DKI Jakarta"
                    onChange={e => setFormData({...formData, province: e.target.value})}
                    style={{
                      width: '100%', padding: '5px 8px', fontSize: '0.78rem',
                      borderRadius: 6, border: '1px solid #cbd5e1',
                      background: formData.province ? '#f0f7ff' : '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label style={{fontSize: '0.72rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 2}}>
                    City / Regency (Kabupaten/Kota)
                  </label>
                  <input 
                    type="text" 
                    value={formData.city}
                    placeholder="e.g. Jakarta Selatan"
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    style={{
                      width: '100%', padding: '5px 8px', fontSize: '0.78rem',
                      borderRadius: 6, border: '1px solid #cbd5e1',
                      background: formData.city ? '#f0f7ff' : '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label style={{fontSize: '0.72rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 2}}>
                    District (Kecamatan)
                  </label>
                  <input 
                    type="text" 
                    value={formData.district}
                    placeholder="e.g. Setiabudi"
                    onChange={e => setFormData({...formData, district: e.target.value})}
                    style={{
                      width: '100%', padding: '5px 8px', fontSize: '0.78rem',
                      borderRadius: 6, border: '1px solid #cbd5e1',
                      background: formData.district ? '#f0f7ff' : '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label style={{fontSize: '0.72rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 2}}>
                    Village / Sub-district (Kelurahan)
                  </label>
                  <input 
                    type="text" 
                    value={formData.village}
                    placeholder="e.g. Karet Semanggi"
                    onChange={e => setFormData({...formData, village: e.target.value})}
                    style={{
                      width: '100%', padding: '5px 8px', fontSize: '0.78rem',
                      borderRadius: 6, border: '1px solid #cbd5e1',
                      background: formData.village ? '#f0f7ff' : '#ffffff'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{fontSize: '0.72rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 2}}>
                  Postal / Zip Code (Kode Pos)
                </label>
                <input 
                  type="text" 
                  value={formData.postalCode}
                  placeholder="e.g. 12930"
                  onChange={e => setFormData({...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5)})}
                  style={{
                    width: '100%', padding: '5px 8px', fontSize: '0.78rem',
                    borderRadius: 6, border: '1px solid #cbd5e1',
                    background: formData.postalCode ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* FIELD: EMAIL & NO TELPON */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8}}>
              <div>
                <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5, marginBottom: 3}}>
                  <Mail size={12} color="#2563eb" /> Company Email
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  placeholder="legal@company.co.id"
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%', padding: '6px 9px', fontSize: '0.82rem',
                    borderRadius: 6, border: '1px solid #cbd5e1',
                    background: formData.email ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5, marginBottom: 3}}>
                  <Phone size={12} color="#2563eb" /> Phone Number
                </label>
                <input 
                  type="text" 
                  value={formData.phone}
                  placeholder="021-xxxxxxxx"
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  style={{
                    width: '100%', padding: '6px 9px', fontSize: '0.82rem',
                    borderRadius: 6, border: '1px solid #cbd5e1',
                    background: formData.phone ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* FIELD: TANGGAL TERBIT NIB */}
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 3}}>
                <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                  <Calendar size={12} color="#2563eb" /> NIB Issued Date
                </label>
                {formData.tanggalTerbit && (
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('tgl', formData.tanggalTerbit)} 
                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.7rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
                  >
                    {copiedKey === 'tgl' ? <Check size={11}/> : <Copy size={11}/>}
                    {copiedKey === 'tgl' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <input 
                type="date" 
                value={formData.tanggalTerbit}
                onChange={e => setFormData({...formData, tanggalTerbit: e.target.value})}
                style={{
                  width: '100%', padding: '6px 9px', fontSize: '0.82rem',
                  borderRadius: 6, border: '1px solid #cbd5e1',
                  background: formData.tanggalTerbit ? '#f0f7ff' : '#ffffff'
                }}
              />
            </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '12px 20px',
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
            Cancel
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
            Apply to Form / Auto-Fill ({filledCount} Fields)
          </button>
        </div>
      </div>
    </div>
  );
}
