import React, {useRef, useState, useEffect} from 'react';
import {ConfirmUploadBubble} from '@/shared/ui/ConfirmUploadBubble';
import {
  ScanLine,
  X,
  UploadCloud,
  FileText,
  Check,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Layers,
  Loader2,
} from 'lucide-react';
import {api} from '@/shared/lib/api';
import {extractIdDocumentFromImage} from '@/features/ocr/lib/id-documents/extract';
import {parseNpwpText} from '@/features/ocr/lib/id-documents/parse-npwp';

export interface NpwpOcrModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (data: {
    npwp?: string;
    nama?: string;
    alamat?: string;
    kpp?: string;
    tanggalTerdaftar?: string;
  }) => void;
  notify?: (msg: string) => void;
  applicationId?: string;
  onDocumentUploaded?: (updatedApp: any) => void;
  isApproved?: boolean;
}

export function NpwpOcrModal({
  open,
  onClose,
  onApply,
  notify,
  applicationId,
  onDocumentUploaded,
  isApproved,
}: NpwpOcrModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  // The scan in the server's temp folder: filed under the application (documents + checklist) when the data is applied.
  const [tempKey, setTempKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    npwp: '',
    nama: '',
    alamat: '',
    kpp: '',
    tanggalTerdaftar: '',
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setIsDragging(false);
      setErrorMessage(null);
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
    setSelectedFile(f);
    setFileName(f.name);
    setOcrLoading(true);
    setOcrSuccess(false);
    setErrorMessage(null);
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    setFileType(isPdf ? 'pdf' : 'image');

    try {
      const objectUrl = URL.createObjectURL(f);
      setFileUrl(objectUrl);
    } catch {}
    setZoom(1);
    setRotation(0);

    let extractedNpwp = '';
    let extractedNama = '';
    let extractedAlamat = '';
    let extractedKpp = '';
    let extractedTanggal = '';

    try {
      // 1. Primary: send file to OCR backend scanner
      const uploadPayload = new FormData();
      uploadPayload.append('file', f);
      uploadPayload.append('doc_type', 'npwp');
      uploadPayload.append('sub_type', 'NPWPUSAHA');
      if (applicationId) uploadPayload.append('application_id', applicationId);

      const res = await api('/ocr/scan', 'POST', uploadPayload);
      setTempKey(res?.temp_key || null);
      if (res && res.data) {
        const d = res.data;
        extractedNpwp = d.npwp_number || d.raw_npwp || d.npwp || '';
        extractedNama = d.nama || d.nama_wajib_pajak || d.company_name || '';
        extractedAlamat = d.alamat || '';
        extractedKpp = d.kpp || '';
        extractedTanggal = d.tanggal_terdaftar || '';

      }
    } catch (backendErr: any) {
      console.warn('Backend NPWP OCR scan error:', backendErr);
      if (isPdf) {
        setErrorMessage(backendErr?.message || 'Gagal memproses file PDF via OCR');
      }
    }

    // 2. Client-side fallback for images if backend returned no NPWP
    if (!extractedNpwp && !isPdf) {
      try {
        const r = new FileReader();
        r.onload = async () => {
          try {
            const dataUrl = r.result as string;
            const res = await extractIdDocumentFromImage(dataUrl, 'npwp', f.name, {applicationId});
            const d = res.data || {};
            const parsed = typeof d === 'object' && d.npwpNumber ? d : parseNpwpText(res.rawText || String(d));
            
            const npwpFinal = parsed.npwpNumber || parsed.rawNpwp || '';
            setFormData({
              npwp: npwpFinal,
              nama: parsed.nama || '',
              alamat: parsed.alamat || '',
              kpp: parsed.kpp || '',
              tanggalTerdaftar: parsed.tanggalTerdaftar || '',
            });
            setOcrLoading(false);
            if (npwpFinal) {
              setOcrSuccess(true);
              if (notify) notify(`✓ Dokumen NPWP ${f.name} berhasil di-scan`);
            } else {
              setErrorMessage('Nomor NPWP tidak terdeteksi dari gambar. Anda dapat mengisinya manual di samping.');
            }
          } catch (cErr: any) {
            setOcrLoading(false);
            setErrorMessage('Gagal mengekstrak teks NPWP dari gambar.');
          }
        };
        r.readAsDataURL(f);
        return;
      } catch (clientErr) {
        console.warn('Client-side NPWP parse error:', clientErr);
      }
    }

    setFormData({
      npwp: extractedNpwp,
      nama: extractedNama,
      alamat: extractedAlamat,
      kpp: extractedKpp,
      tanggalTerdaftar: extractedTanggal,
    });
    setOcrLoading(false);

    if (extractedNpwp) {
      setOcrSuccess(true);
      if (notify) notify(`✓ Dokumen NPWP ${f.name} berhasil di-scan`);
    } else if (!errorMessage) {
      setErrorMessage('Nomor NPWP tidak terdeteksi. Silakan periksa file atau isi manual pada form.');
    }
  };

  const triggerProcessFile = (f: File) => {
    if (isApproved) {
      setPendingFile(f);
      setConfirmOpen(true);
    } else {
      processFile(f);
    }
  };

  const confirmPendingFile = () => {
    if (pendingFile) {
      processFile(pendingFile);
      setPendingFile(null);
    }
    setConfirmOpen(false);
  };

  const cancelPendingFile = () => {
    setPendingFile(null);
    setConfirmOpen(false);
  };

  const handleApply = async () => {
    onApply({
      npwp: formData.npwp,
      nama: formData.nama,
      alamat: formData.alamat,
      kpp: formData.kpp,
      tanggalTerdaftar: formData.tanggalTerdaftar,
    });

    // The scan is used now: the server files it under the application and adds it to the checklist (when the workflow has an NPWP document).
    if (tempKey) {
      api('/ocr/keep', 'POST', {temp_key: tempKey, doc_type: 'npwp'})
        .then(() => (applicationId && onDocumentUploaded ? api(`/applications/${applicationId}`) : null))
        .then(updated => {
          if (updated && onDocumentUploaded) onDocumentUploaded(updated);
        })
        .catch(e => console.warn('Filing the NPWP scan failed:', e));
    }

    onClose();
  };

  const hasData = Boolean(formData.npwp.trim());
  const filledCount = Object.values(formData).filter(v => Boolean(v && v.trim())).length;

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
        boxSizing: 'border-box',
      }}
    >
      <div
        className="modal nib-ocr-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(1480px, 98vw)',
          maxWidth: '98vw',
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
          zIndex: 100000,
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScanLine size={22} />
            </div>
            <div>
              <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a'}}>
                Upload &amp; Scan Dokumen NPWP · Auto-Fill OCR
              </h3>
              <p style={{margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b'}}>
                Ekstrak nomor NPWP perusahaan otomatis dari file PDF atau foto dokumen NPWP/SKT, serta simpan ke Document Checklist.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button"
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* STATUS BAR */}
        <div
          style={{
            padding: '8px 24px',
            background: ocrLoading ? '#eff6ff' : errorMessage ? '#fef2f2' : ocrSuccess ? '#f0fdf4' : '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 38,
            boxSizing: 'border-box',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            {ocrLoading ? (
              <>
                <Loader2 size={16} className="text-primary spin" />
                <span style={{color: '#1d4ed8', fontWeight: 600}}>
                  Sedang memproses OCR dokumen NPWP...
                </span>
              </>
            ) : errorMessage ? (
              <>
                <AlertCircle size={16} style={{color: '#dc2626'}} />
                <span style={{color: '#b91c1c', fontWeight: 500}}>{errorMessage}</span>
              </>
            ) : ocrSuccess ? (
              <>
                <CheckCircle2 size={16} style={{color: '#16a34a'}} />
                <span style={{color: '#15803d', fontWeight: 600}}>
                  ✓ Berhasil mengekstrak {filledCount} data dari dokumen {fileName}
                </span>
              </>
            ) : (
              <span style={{color: '#64748b'}}>
                Silakan upload file dokumen kartu NPWP atau Surat Keterangan Terdaftar (PDF, JPG, PNG).
              </span>
            )}
          </div>
          {hasData && !ocrLoading && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#15803d',
                background: '#dcfce7',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              NPWP Terdeteksi
            </span>
          )}
        </div>

        {/* MODAL BODY (50% LEFT VIEWER, 50% RIGHT FORM) */}
        <div
          style={{
            padding: '16px 24px 20px 24px',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
            gap: 22,
            flex: '1 1 auto',
            minHeight: 0,
          }}
        >
          {/* LEFT: UPLOAD & VIEWER ZONE */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              height: '100%',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {fileUrl ? (
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '1 1 0',
                  minHeight: 0,
                }}
              >
                {/* TOOLBAR */}
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#1e293b',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: '#cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '220px',
                    }}
                    title={fileName}
                  >
                    {fileName}
                  </span>
                  <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                      className="button icon only ghost"
                      style={{color: '#cbd5e1', padding: 4}}
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span style={{color: '#94a3b8', fontSize: '0.75rem', minWidth: 36, textAlign: 'center'}}>
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                      className="button icon only ghost"
                      style={{color: '#cbd5e1', padding: 4}}
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="button icon only ghost"
                      style={{color: '#cbd5e1', padding: 4}}
                      title="Rotate 90°"
                    >
                      <RotateCw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="button small"
                      style={{
                        background: '#334155',
                        borderColor: '#475569',
                        color: '#f8fafc',
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                      }}
                      title="Ganti Dokumen"
                    >
                      <RefreshCw size={12} style={{marginRight: 4}} /> Ganti File
                    </button>
                  </div>
                </div>

                {/* CANVAS */}
                <div
                  style={{
                    flex: '1 1 0',
                    minHeight: 0,
                    overflow: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                  }}
                >
                  {fileType === 'pdf' ? (
                    <iframe
                      src={`${fileUrl}#toolbar=0`}
                      title="NPWP PDF Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: 6,
                        background: '#ffffff',
                      }}
                    />
                  ) : (
                    <img
                      src={fileUrl}
                      alt="NPWP Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) triggerProcessFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: '1 1 0',
                  minHeight: 0,
                  border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                  background: isDragging ? '#eff6ff' : '#f8fafc',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 24,
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <UploadCloud size={28} />
                </div>
                <h4 style={{margin: '0 0 6px 0', fontSize: '1rem', color: '#1e293b'}}>
                  Pilih atau Drag &amp; Drop Dokumen NPWP
                </h4>
                <p style={{margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', maxWidth: 360}}>
                  Mendukung file scan kartu NPWP, e-NPWP, atau SKT dalam format PDF, PNG, JPG, JPEG.
                </p>
                <button type="button" className="button primary small" style={{pointerEvents: 'none'}}>
                  Browse File
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              style={{display: 'none'}}
              onChange={e => {
                if (e.target.files?.[0]) triggerProcessFile(e.target.files[0]);
              }}
            />
          </div>

          {/* RIGHT: EXTRACTED NPWP FIELDS */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
            }}
          >
            {/* FIELDS HEADER */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div>
                <h4 style={{margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0f172a'}}>
                  Hasil Ekstraksi OCR NPWP
                </h4>
                <span style={{fontSize: '0.76rem', color: '#64748b'}}>
                  Data dapat diedit atau diperiksa sebelum diterapkan ke form aplikasi.
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: filledCount > 0 ? '#1d4ed8' : '#94a3b8',
                  background: filledCount > 0 ? '#eff6ff' : '#f1f5f9',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                {filledCount} Terisi
              </span>
            </div>

            {/* SCROLLABLE FIELDS */}
            <div style={{flex: '1 1 auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14}}>
              {/* NOMOR NPWP (HERO FIELD) */}
              <div
                style={{
                  padding: 14,
                  background: '#f8fafc',
                  border: '1.5px solid #93c5fd',
                  borderRadius: 8,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
                  <label
                    htmlFor="ocr-npwp-number"
                    style={{fontSize: '0.84rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6}}
                  >
                    Nomor NPWP <span style={{color: '#dc2626'}}>*</span>
                  </label>
                  {formData.npwp && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard('npwp', formData.npwp)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copiedKey === 'npwp' ? '#16a34a' : '#2563eb',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      {copiedKey === 'npwp' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'npwp' ? 'Tersalin' : 'Salin'}
                    </button>
                  )}
                </div>
                <input
                  id="ocr-npwp-number"
                  type="text"
                  className="field-input"
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    fontFamily: 'monospace',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #bfdbfe',
                  }}
                  placeholder="Contoh: 01.234.567.8-901.000"
                  value={formData.npwp}
                  onChange={e => setFormData(p => ({...p, npwp: e.target.value}))}
                />
              </div>

              {/* NAMA WAJIB PAJAK */}
              <div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4}}>
                  <label htmlFor="ocr-npwp-nama" style={{fontSize: '0.8rem', fontWeight: 600, color: '#475569'}}>
                    Nama Wajib Pajak / Badan Usaha
                  </label>
                  {formData.nama && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard('nama', formData.nama)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copiedKey === 'nama' ? '#16a34a' : '#64748b',
                        fontSize: '0.72rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {copiedKey === 'nama' ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
                <input
                  id="ocr-npwp-nama"
                  type="text"
                  className="field-input"
                  placeholder="Nama perusahaan sesuai NPWP"
                  value={formData.nama}
                  onChange={e => setFormData(p => ({...p, nama: e.target.value}))}
                />
              </div>

              {/* ALAMAT */}
              <div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4}}>
                  <label htmlFor="ocr-npwp-alamat" style={{fontSize: '0.8rem', fontWeight: 600, color: '#475569'}}>
                    Alamat Terdaftar
                  </label>
                  {formData.alamat && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard('alamat', formData.alamat)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copiedKey === 'alamat' ? '#16a34a' : '#64748b',
                        fontSize: '0.72rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {copiedKey === 'alamat' ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
                <textarea
                  id="ocr-npwp-alamat"
                  className="field-input"
                  rows={2}
                  placeholder="Alamat domisili terdaftar pada NPWP"
                  value={formData.alamat}
                  onChange={e => setFormData(p => ({...p, alamat: e.target.value}))}
                />
              </div>

              {/* KPP & TANGGAL */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                <div>
                  <label htmlFor="ocr-npwp-kpp" style={{fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4}}>
                    KPP Terdaftar
                  </label>
                  <input
                    id="ocr-npwp-kpp"
                    type="text"
                    className="field-input"
                    placeholder="Kode / Kantor Pajak"
                    value={formData.kpp}
                    onChange={e => setFormData(p => ({...p, kpp: e.target.value}))}
                  />
                </div>
                <div>
                  <label htmlFor="ocr-npwp-tgl" style={{fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4}}>
                    Tanggal Terdaftar
                  </label>
                  <input
                    id="ocr-npwp-tgl"
                    type="text"
                    className="field-input"
                    placeholder="DD-MM-YYYY"
                    value={formData.tanggalTerdaftar}
                    onChange={e => setFormData(p => ({...p, tanggalTerdaftar: e.target.value}))}
                  />
                </div>
              </div>

              {/* CHECKLIST SYNC INFO CARD */}
              <div
                style={{
                  marginTop: 6,
                  padding: '10px 14px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Layers size={18} style={{color: '#0284c7', flexShrink: 0, marginTop: 1}} />
                <div style={{fontSize: '0.78rem', color: '#0369a1', lineHeight: 1.45}}>
                  <strong>Document Checklist Auto-Sync:</strong>
                  <br />
                  File dokumen NPWP yang di-upload akan otomatis tersimpan ke baris <strong>NPWP Badan Usaha</strong> pada checklist aplikasi pembiayaan ini (jika tersedia dalam workflow tahap FAP).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="button"
            onClick={onClose}
            style={{background: '#ffffff', borderColor: '#cbd5e1'}}
          >
            Batal / Cancel
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!hasData || ocrLoading}
            onClick={handleApply}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563eb',
              borderColor: '#2563eb',
              padding: '8px 18px',
              fontSize: '0.88rem',
            }}
          >
            <Check size={16} />
            Terapkan NPWP ke Form / Apply ({hasData ? '1 Field' : '0 Field'})
          </button>
        </div>

        <ConfirmUploadBubble
          open={confirmOpen}
          title="Are you sure?"
          message="This NPWP document has already been approved. Proceeding with this scan will upload a new file and restart its approval process."
          onCancel={cancelPendingFile}
          onConfirm={confirmPendingFile}
          placement="center"
        />
      </div>
    </div>
  );
}
