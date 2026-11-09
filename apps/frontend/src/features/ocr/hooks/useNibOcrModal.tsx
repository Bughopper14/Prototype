/** All state, derived values and handlers of NibOcrModal; shared with its sections through NibOcrModalContext. */
import {extractWilayahFromAddressAndText} from '@/features/ocr/lib/nib/address-wilayah';
import {extractNibTextFromDocument} from '@/features/ocr/lib/nib/extract';
import {api} from '@/shared/lib/api';
import {normalizeWilayahInput, useMasterData} from '@/shared/master-data';
import React, {useEffect, useRef, useState} from 'react';

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

export function useNibOcrModal({
  open,
  onClose,
  onApply,
  notify,
  existingDocumentUrl,
  existingFileName,
}: NibOcrModalProps) {
  const master = useMasterData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [rawText, setRawText] = useState<string>('');
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
    rw: '',
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setIsDragging(false);
    }
  }, [open]);

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
        const newNib = String(d.nib || '')
          .replace(/\D/g, '')
          .slice(0, 13);
        const newCompanyName = String(d.company_name || d.companyName || '').trim();
        const rawAddress = String(
          d.alamat_lengkap || d.fullAddress || d.alamat || d.companyAddress || '',
        ).trim();

        let newProvince = String(d.provinsi || d.province || '').trim();
        let newCity = String(d.kota || d.city || d.cityRegency || '').trim();
        let newDistrict = String(d.kecamatan || d.district || '').trim();
        let newVillage = String(d.kel_desa || d.village || d.kelurahan || '').trim();
        let newPostal = String(d.kode_pos || d.postalCode || '')
          .replace(/\D/g, '')
          .slice(0, 5);
        let newRt = String(d.rt || '').trim();
        let newRw = String(d.rw || '').trim();

        // Always resolve & normalize wilayah fields through master data resolver
        const w = extractWilayahFromAddressAndText(
          `${rawAddress} ${newProvince} ${newCity} ${newDistrict} ${newVillage}`,
          rawAddress,
          master,
        );
        newProvince = w.province || normalizeWilayahInput(newProvince);
        newCity = w.city || normalizeWilayahInput(newCity);
        newDistrict = w.district || normalizeWilayahInput(newDistrict);
        newVillage = w.village || normalizeWilayahInput(newVillage);
        if (w.postalCode && !newPostal) newPostal = w.postalCode;
        if (w.rt && !newRt) newRt = w.rt;
        if (w.rw && !newRw) newRw = w.rw;

        const newEmail = String(d.email || '').trim();
        const newPhone = String(d.phone || d.phoneFax || '').trim();
        const rawTanggal = String(
          d.tanggal_terbit || d.establishmentDate || d.nibIssuedDate || d.issueDate || d.tanggalTerbit || '',
        ).trim();
        let newTanggal = rawTanggal;
        const isoMatch = rawTanggal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (isoMatch) {
          newTanggal = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
        } else {
          const dmMatch = rawTanggal.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
          if (dmMatch) {
            newTanggal = `${dmMatch[3]}-${dmMatch[2].padStart(2, '0')}-${dmMatch[1].padStart(2, '0')}`;
          }
        }

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
          rw: newRw,
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
            rw: extracted.rw || '',
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
    formData.tanggalTerbit,
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

  return {
    open,
    onClose,
    onApply,
    notify,
    existingDocumentUrl,
    existingFileName,
    master,
    fileInputRef,
    fileUrl,
    setFileUrl,
    fileName,
    setFileName,
    fileType,
    setFileType,
    zoom,
    setZoom,
    rotation,
    setRotation,
    ocrLoading,
    setOcrLoading,
    rawText,
    setRawText,
    copiedKey,
    setCopiedKey,
    isDragging,
    setIsDragging,
    formData,
    setFormData,
    copyToClipboard,
    processFile,
    handleFileUpload,
    handleDrop,
    filledCount,
    handleApply,
    hasData,
  };
}
