import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, ScanLine, Sparkles, CheckCircle2, Copy, FileText, 
  Check, Loader2, Calendar, Mail, Phone, MapPin, Hash, ArrowRight,
  FileSearch, RefreshCw, Building2, ZoomIn, ZoomOut, RotateCw, Maximize2, ExternalLink
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
  existingDocumentUrl?: string;
  existingFileName?: string;
}

export function NibOcrModal({ open, onClose, onApply, notify, existingDocumentUrl, existingFileName }: NibOcrModalProps) {
  const master = useMasterData();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setIsDragging(false);
    }
  }, [open]);

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
          if (notify) {
            notify(`✓ Document ${f.name} parsed via client-side OCR engine`);
          }
        } catch (err: any) {
          console.warn('Client-side OCR fallback error:', err);
          if (notify) notify(`Client-side OCR error: ${err?.message || 'Unknown error'}`);
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
    if (f) {
      processFile(f);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
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
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="modal nib-ocr-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(1820px, 98vw)',
          maxWidth: '98vw',
          maxHeight: '94vh',
          height: 'min(960px, 94vh)',
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
          padding: '14px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          flexShrink: 0
        }}>
          <div style={{display:'flex', alignItems:'center', gap: 12}}>
            <div style={{
              width: 38, height: 38, borderRadius: 8, background: '#2563eb', 
              color: '#ffffff', display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <ScanLine size={22} />
            </div>
            <div>
              <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a'}}>
                Upload & Scan NIB Document · Auto-Fill OCR
              </h3>
              <p style={{margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b'}}>
                Automatically extract NIB number, company name, domicile address, administrative regions, contacts, and issue date.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="icon-button"
            aria-label="Close"
            style={{background:'transparent', border:'none', cursor:'pointer', color:'#64748b', padding: 6}}
          >
            <X size={22} />
          </button>
        </div>

        {/* MODAL BODY (50% LEFT VIEWER, 50% RIGHT FORM) */}
        <div style={{
          padding: '18px 24px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
          gap: 22,
          flex: '1 1 auto',
          minHeight: 0
        }}>
          {/* LEFT: UPLOAD & FILE ZONE (50% VIEW) */}
          <div style={{display:'flex', flexDirection:'column', gap: 12, height: '100%', minHeight: 0, minWidth: 0}}>
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
                  padding: '8px 14px',
                  background: '#1e293b',
                  borderBottom: '1px solid #334155',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '50%' }}>
                    <FileText size={16} color="#60a5fa" />
                    <span style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fileName || 'NIB Document'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                      title="Zoom Out"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '5px 9px', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', minWidth: 44, textAlign: 'center', fontWeight: 600 }}>
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.min(3, Number((z + 0.15).toFixed(2))))}
                      title="Zoom In"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '5px 9px', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      title="Rotate 90°"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '5px 9px', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setZoom(1); setRotation(0); }}
                      title="Reset Zoom"
                      style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '5px 9px', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Maximize2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Replace Document"
                      style={{ background: '#2563eb', border: 'none', color: '#ffffff', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <RefreshCw size={12} /> Replace
                    </button>
                  </div>
                </div>

                {/* PREVIEW CANVAS */}
                <div style={{
                  flex: '1 1 0',
                  minHeight: 0,
                  height: '100%',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#090d16',
                  padding: '8px',
                  position: 'relative'
                }}>
                  {fileType === 'pdf' ? (
                    <iframe
                      key={`${fileUrl}-${Math.round(zoom * 100)}`}
                      src={`${fileUrl}#toolbar=1&navpanes=0&zoom=${Math.round(zoom * 100)}`}
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4, background: '#ffffff', minHeight: '100%' }}
                      title="NIB PDF Preview"
                    />
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '100%',
                      minHeight: '100%',
                      margin: 'auto'
                    }}>
                      <img
                        src={fileUrl}
                        alt="NIB Preview"
                        style={{
                          maxWidth: zoom <= 1 ? '100%' : 'none',
                          maxHeight: zoom <= 1 ? '100%' : 'none',
                          width: zoom > 1 ? `${Math.round(zoom * 100)}%` : 'auto',
                          objectFit: 'contain',
                          transform: `rotate(${rotation}deg)`,
                          transition: 'width 0.15s ease, transform 0.15s ease'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* BOTTOM ACTION */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 14px',
                  background: '#1e293b',
                  borderTop: '1px solid #334155',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Previewing {fileType?.toUpperCase()} · Zoom: {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => { setFileUrl(null); setFileName(''); setFileType(null); }}
                    style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
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
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #2563eb' : '2px dashed #94a3b8',
                  borderRadius: 12,
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: isDragging ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  flex: '1 1 0',
                  minHeight: '380px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16
                }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: isDragging ? '#dbeafe' : '#e0f2fe',
                  color: '#2563eb', display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)'
                }}>
                  <Upload size={32} />
                </div>
                <div>
                  <b style={{fontSize: '1.05rem', color: '#0f172a', display:'block', marginBottom: 4}}>
                    {isDragging ? 'Drop NIB Document Here' : 'Click or Drag NIB File Here'}
                  </b>
                  <span style={{fontSize: '0.84rem', color: '#64748b'}}>
                    Supported formats: PDF, PNG, JPG, JPEG, or WEBP
                  </span>
                </div>
                <button
                  type="button"
                  className="button primary small"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  style={{ marginTop: 8 }}
                >
                  <Upload size={14} style={{ marginRight: 6 }} /> Browse File
                </button>
              </div>
            )}

            {/* HIDDEN INPUT FOR FILE SELECTION */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            {/* STATUS NOTIFICATION BAR */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 500,
              background: ocrLoading ? '#eff6ff' : hasData ? '#f0fdf4' : '#f1f5f9',
              border: `1px solid ${ocrLoading ? '#bfdbfe' : hasData ? '#bbf7d0' : '#e2e8f0'}`,
              color: ocrLoading ? '#2563eb' : hasData ? '#166534' : '#64748b',
              flexShrink: 0
            }}>
              {ocrLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Scanning and reading NIB document via OCR Engine...</span>
                </>
              ) : hasData ? (
                <>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>{filledCount} fields detected and ready to sync to form</span>
                </>
              ) : (
                <>
                  <FileSearch size={16} />
                  <span>Please upload or drop a NIB document to start OCR processing</span>
                </>
              )}
            </div>

            {rawText && (
              <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', flexShrink: 0}}>
                <button
                  type="button"
                  onClick={() => setShowRaw(!showRaw)}
                  style={{
                    background: 'none', border: 'none', color: '#64748b',
                    fontSize: '0.74rem', cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  {showRaw ? 'Hide Raw OCR Text' : 'View Raw OCR Text'}
                </button>
              </div>
            )}

            {showRaw && rawText && (
              <div style={{
                background: '#0f172a', color: '#f8fafc', padding: '10px 14px',
                borderRadius: 8, fontSize: '0.74rem', maxHeight: '120px', overflowY: 'auto',
                fontFamily: 'monospace', whiteSpace: 'pre-wrap', flexShrink: 0
              }}>
                {rawText}
              </div>
            )}
          </div>

          {/* RIGHT: EXTRACTED FORM FIELDS PREVIEW */}
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '16px 20px', display:'flex', flexDirection:'column',
            height: '100%', minHeight: 0
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f1f5f9', paddingBottom: 10, marginBottom: 12, flexShrink: 0}}>
              <h4 style={{margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', display:'flex', alignItems:'center', gap: 6}}>
                <Sparkles size={16} color="#2563eb" /> OCR Extracted Data
              </h4>
              <span style={{fontSize: '0.76rem', color: '#64748b'}}>Review & edit before applying</span>
            </div>

            {/* SCROLLABLE FORM FIELDS */}
            <div style={{
              flex: '1 1 0',
              overflowY: 'auto',
              paddingRight: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minHeight: 0
            }}>

              {/* FIELD 1: NIB NUMBER */}
              <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                  <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                    <Hash size={13} color="#2563eb" /> NIB Number (13 Digits)
                  </label>
                  {formData.nib && (
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard('nib', formData.nib)} 
                      style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
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
                    width: '100%', padding: '7px 10px', fontSize: '0.84rem',
                    borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600,
                    background: formData.nib ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>

              {/* FIELD 2: COMPANY NAME */}
              <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                  <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                    <Building2 size={13} color="#2563eb" /> Company Name
                  </label>
                  {formData.companyName && (
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard('companyName', formData.companyName)} 
                      style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
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
                    width: '100%', padding: '7px 10px', fontSize: '0.84rem',
                    borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600,
                    background: formData.companyName ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>

              {/* FIELD 3: DOMICILE ADDRESS */}
              <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                  <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                    <MapPin size={13} color="#2563eb" /> Company Address / Domicile
                  </label>
                  {formData.alamat && (
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard('alamat', formData.alamat)} 
                      style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
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
                    width: '100%', padding: '7px 10px', fontSize: '0.84rem',
                    borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical',
                    background: formData.alamat ? '#f0f7ff' : '#ffffff'
                  }}
                />
              </div>

              {/* ADMINISTRATIVE REGIONS (ALL IN ENGLISH, CLEAN 2-COLUMN GRID) */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <span style={{fontSize: '0.76rem', fontWeight: 700, color: '#002060', textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                  Administrative Regions
                </span>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12}}>
                  <div>
                    <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 4}}>
                      Province
                    </label>
                    <input 
                      type="text" 
                      value={formData.province}
                      placeholder="e.g. DKI Jakarta"
                      onChange={e => setFormData({...formData, province: e.target.value})}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                        borderRadius: 6, border: '1px solid #cbd5e1',
                        background: formData.province ? '#f0f7ff' : '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 4}}>
                      City / Regency
                    </label>
                    <input 
                      type="text" 
                      value={formData.city}
                      placeholder="e.g. South Jakarta"
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                        borderRadius: 6, border: '1px solid #cbd5e1',
                        background: formData.city ? '#f0f7ff' : '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 4}}>
                      District
                    </label>
                    <input 
                      type="text" 
                      value={formData.district}
                      placeholder="e.g. Setiabudi"
                      onChange={e => setFormData({...formData, district: e.target.value})}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                        borderRadius: 6, border: '1px solid #cbd5e1',
                        background: formData.district ? '#f0f7ff' : '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 4}}>
                      Village / Sub-district
                    </label>
                    <input 
                      type="text" 
                      value={formData.village}
                      placeholder="e.g. Karet Semanggi"
                      onChange={e => setFormData({...formData, village: e.target.value})}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                        borderRadius: 6, border: '1px solid #cbd5e1',
                        background: formData.village ? '#f0f7ff' : '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 4}}>
                      Postal / Zip Code
                    </label>
                    <input 
                      type="text" 
                      value={formData.postalCode}
                      placeholder="e.g. 12930"
                      onChange={e => setFormData({...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5)})}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                        borderRadius: 6, border: '1px solid #cbd5e1',
                        background: formData.postalCode ? '#f0f7ff' : '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{fontSize: '0.76rem', fontWeight: 600, color: '#334155', display:'block', marginBottom: 4}}>
                      RT / RW
                    </label>
                    <div style={{display:'flex', gap: 6, alignItems:'center'}}>
                      <input 
                        type="text" 
                        value={formData.rt}
                        maxLength={3}
                        placeholder="RT 005"
                        onChange={e => setFormData({...formData, rt: e.target.value.replace(/\D/g, '')})}
                        style={{
                          width: '50%', padding: '6px 10px', fontSize: '0.82rem',
                          borderRadius: 6, border: '1px solid #cbd5e1',
                          background: formData.rt ? '#f0f7ff' : '#ffffff'
                        }}
                      />
                      <span style={{color: '#94a3b8'}}>/</span>
                      <input 
                        type="text" 
                        value={formData.rw}
                        maxLength={3}
                        placeholder="RW 003"
                        onChange={e => setFormData({...formData, rw: e.target.value.replace(/\D/g, '')})}
                        style={{
                          width: '50%', padding: '6px 10px', fontSize: '0.82rem',
                          borderRadius: 6, border: '1px solid #cbd5e1',
                          background: formData.rw ? '#f0f7ff' : '#ffffff'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FIELD: EMAIL & PHONE NUMBER */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12}}>
                <div>
                  <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5, marginBottom: 4}}>
                    <Mail size={13} color="#2563eb" /> Company Email
                  </label>
                  <input 
                    type="email" 
                    value={formData.email}
                    placeholder="legal@company.co.id"
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    style={{
                      width: '100%', padding: '7px 10px', fontSize: '0.84rem',
                      borderRadius: 6, border: '1px solid #cbd5e1',
                      background: formData.email ? '#f0f7ff' : '#ffffff'
                    }}
                  />
                </div>

                <div>
                  <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5, marginBottom: 4}}>
                    <Phone size={13} color="#2563eb" /> Phone Number
                  </label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    placeholder="021-xxxxxxxx"
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    style={{
                      width: '100%', padding: '7px 10px', fontSize: '0.84rem',
                      borderRadius: 6, border: '1px solid #cbd5e1',
                      background: formData.phone ? '#f0f7ff' : '#ffffff'
                    }}
                  />
                </div>
              </div>

              {/* FIELD: TANGGAL TERBIT NIB */}
              <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}}>
                  <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display:'flex', alignItems:'center', gap: 5}}>
                    <Calendar size={13} color="#2563eb" /> NIB Issued Date
                  </label>
                  {formData.tanggalTerbit && (
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard('tgl', formData.tanggalTerbit)} 
                      style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#2563eb', display:'inline-flex', alignItems:'center', gap: 3}}
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
                    width: '100%', padding: '7px 10px', fontSize: '0.84rem',
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
          padding: '12px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          flexShrink: 0
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
              background: '#2563eb', borderColor: '#2563eb',
              padding: '8px 18px', fontSize: '0.88rem'
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
