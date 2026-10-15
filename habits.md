# habits.md — CRM Captive Multi-Finance LiuGong (LOS-DMS)

> ⚠️ **Aturan & Kebiasaan Khusus Pengembangan Modul CRM (LFI LOS-DMS)**

---

## 1. Aturan Bisnis & Rekonsiliasi Legal
- **Cumulative Deed Inheritance**: Jangan pernah berasumsi akta perubahan memuat seluruh pemegang saham. Selalu jalankan fungsi rekonsiliasi kumulatif untuk mewariskan data pemegang saham dari akta pendirian/akta perubahan terdahulu.
- **Total Saham Mutlak 100.00%**: Sistem wajib menolak penyimpanan akta jika akumulasi persentase kepemilikan modal kurang atau lebih dari 100.00%.
- **Dual-Column Persistence**: Saat menyimpan proposal unit alat berat, SELALU simpan free-text snapshot (`brand`, `model_name`, `unit_price`, dll) di samping ID foreign key master catalog.

## 2. Maker-Checker Otorisasi
- **Admin Marketing (Maker)**: Berhak menginput dan mengedit pada status `DRAFT` atau `RETURNED`. Setelah klik `Submit to BS`, formulir harus terkunci (*read-only*).
- **Admin Business Support (Checker)**: Berhak melakukan verifikasi cabang (`APPROVE` atau `RETURN`). Pengembalian berkas WAJIB disertai *Reason Code* standar dan catatan perbaikan.
- Role Maker dilarang keras memanggil endpoint approval Checker (HTTP 403 Forbidden).

## 3. Database & Audit Integrity
- Tabel `approval_logs` dan `rejection_logs` dilindungi trigger anti-tampering. Dilarang menjalankan query `UPDATE` atau `DELETE` pada tabel log audit.
- Semua file dokumen debitur disimpan di storage privat (MinIO/S3) dan hanya dapat diakses melalui Short-Lived Signed URL (maksimal 15 menit).
