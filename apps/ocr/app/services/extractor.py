import re
from typing import List, Dict, Any, Tuple, Optional
from app.schemas import (
    DocumentType,
    InvoiceSchema,
    InvoiceItem,
    KTPSchema,
    NPWPSchema,
    PassportSchema,
    KitasSchema,
    ReceiptSchema,
    ContractSchema,
    PresentationSchema,
    GenericSchema
)

class InformationExtractor:
    """
    Comprehensive Information Extractor.
    Supports Invoices, KTP, Receipts, Contracts, Presentations,
    Smart Key Insight Summaries, and Custom Field extraction.
    """

    @classmethod
    def clean_number(cls, raw_val: str) -> Optional[float]:
        """Converts raw string currency like 'Rp 10,000,000' or '2,500,000' to float."""
        if not raw_val:
            return None
        s = re.sub(r'[^\d,\.]', '', raw_val).strip()
        if not s:
            return None

        if ',' in s and '.' in s:
            if s.rfind(',') > s.rfind('.'):
                s = s.replace('.', '').replace(',', '.')
            else:
                s = s.replace(',', '')
        elif '.' in s and ',' not in s:
            parts = s.split('.')
            if len(parts) > 2:
                s = s.replace('.', '')
            elif len(parts) == 2 and len(parts[1]) == 3:
                s = s.replace('.', '')
        elif ',' in s and '.' not in s:
            parts = s.split(',')
            if len(parts) > 2:
                s = s.replace(',', '')
            elif len(parts) == 2 and len(parts[1]) == 3:
                s = s.replace(',', '')
            elif len(parts) == 2 and len(parts[1]) <= 2:
                s = s.replace(',', '.')

        try:
            return float(s)
        except ValueError:
            return None

    @classmethod
    def detect_document_type(cls, text_or_boxes: Any, filename: str = "") -> DocumentType:
        """Determines document type based on filename extension and content keywords."""
        ext = filename.lower()
        if ext.endswith(('.pptx', '.ppt')):
            return DocumentType.PRESENTATION
        elif ext.endswith(('.docx', '.doc')):
            # Check content for legal/contract vs generic
            pass

        if isinstance(text_or_boxes, list):
            full_text = " ".join([b.get("text", "") for b in text_or_boxes]).upper()
        else:
            full_text = str(text_or_boxes).upper()

        if any(w in full_text for w in [
            "KITAS", "E-KITAS", "IJIN TINGGAL TERBATAS", "IZIN TINGGAL TERBATAS",
            "IJIN TINGGAL", "IZIN TINGGAL", "KITAP", "NIORA", "PERMIT NUMBER",
            "PERMIT NUEBER", "KARTU IJIN TINGGAL", "KARTU IZIN TINGGAL"
        ]):
            return DocumentType.KITAS
        elif any(w in full_text for w in [
            "PASSPORT", "PASPOR", "PASSEPORT", "PASAPORTE",
            "旅券", "护照", "護照", "ISSUING COUNTRY", "KANTOR IMIGRASI",
            "DATE OF EXPIRY", "TGL. HABIS BERLAKU", "TGL.HABISBERLAKU"
        ]) or re.search(r'P[<A-Z0-9][A-Z]{3}', full_text):
            return DocumentType.PASSPORT
        elif any(w in full_text for w in ["INVOICE", "FAKTUR", "TAGIHAN", "JATUH TEMPO", "SUBTOTAL"]):
            return DocumentType.INVOICE
        elif any(w in full_text for w in [
            "REPUBLIK INDONESIA", "KARTU TANDA PENDUDUK", "NIK", "GOL. DARAH", "GOL, DARAH",
            "JENIS KELAMIN", "JENISKELAMIN", "TEMPAT/TGL LAHIR", "TEMPAT/TGLLAHIR",
            "STATUS PERKAWINAN", "STATUSPERKAWINAN", "KTP", "KABUPATEN"
        ]):
            return DocumentType.KTP
        elif any(w in full_text for w in [
            "NPWP", "DIREKTORAT JENDERAL PAJAK", "DIREKTORATJENDERALPAJAK",
            "WAJIB PAJAK", "WAJIBPAJAK", "TGL TERDAFTAR", "TGLTERDAFTAR"
        ]):
            return DocumentType.NPWP
        elif any(w in full_text for w in ["PERJANJIAN", "KONTRAK", "MEMORANDUM OF UNDERSTANDING", "PASAL 1", "PIHAK PERTAMA"]):
            return DocumentType.CONTRACT
        elif any(w in full_text for w in ["STRUK", "RECEIPT", "KASIR", "KEMBALIAN", "TOTAL BAYAR"]):
            return DocumentType.RECEIPT
        elif any(w in full_text for w in ["SLIDE", "AGENDA", "KEY TAKEAWAYS", "PRESENTATION"]):
            return DocumentType.PRESENTATION
        return DocumentType.GENERIC

    @classmethod
    def extract_custom_targets(cls, full_text: str, custom_targets: List[str]) -> Dict[str, Any]:
        """
        Dynamically extracts user-configured custom fields from document text.
        Searches via key-value patterns, colon delimiters, and contextual proximity.
        """
        results: Dict[str, Any] = {}
        if not custom_targets:
            return results

        lines = [line.strip() for line in full_text.splitlines() if line.strip()]

        for target in custom_targets:
            target_clean = target.strip()
            if not target_clean:
                continue

            found_val = None
            target_lower = target_clean.lower()

            # Strategy 1: Direct key-value regex (e.g. "Target : Value" or "Target = Value")
            escaped = re.escape(target_clean)
            pattern = rf'(?:^|[\r\n\t|;])\s*{escaped}\s*[:=\-–]\s*([^\r\n|;]+)'
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                found_val = match.group(1).strip()

            # Strategy 2: Line by line search
            if not found_val:
                for i, line in enumerate(lines):
                    line_lower = line.lower()
                    if target_lower in line_lower:
                        if ":" in line:
                            parts = line.split(":", 1)
                            if target_lower in parts[0].lower() and len(parts) > 1 and parts[1].strip():
                                found_val = parts[1].strip()
                                break
                        elif "=" in line:
                            parts = line.split("=", 1)
                            if target_lower in parts[0].lower() and len(parts) > 1 and parts[1].strip():
                                found_val = parts[1].strip()
                                break
                        elif i + 1 < len(lines):
                            # Value is on the next line
                            next_line = lines[i + 1].strip()
                            if len(next_line) > 0 and len(next_line) < 150:
                                found_val = next_line
                                break

            # Strategy 3: Heuristic inline search (e.g., "Target sebesar Rp 50.000.000" or "Target pada 2026-10-15")
            if not found_val:
                inline_match = re.search(rf'{escaped}\s+(?:adalah|sebesar|yaitu|pada|di|sebanyak)?\s*([A-Za-z0-9\s.,\-\/]+)', full_text, re.IGNORECASE)
                if inline_match:
                    candidate = inline_match.group(1).strip()
                    # Keep candidate concise (up to first sentence punctuation or 60 chars)
                    candidate = candidate.split('.')[0].split(',')[0].strip()
                    if len(candidate) > 2:
                        found_val = candidate

            results[target_clean] = found_val if found_val else "Tidak terdeteksi"

        return results

    @classmethod
    def extract_key_insights(cls, full_text: str) -> Dict[str, Any]:
        """
        Extracts high-level executive insights from any document:
        - Summary
        - Key Dates
        - Financial / Monetary Values
        - Key Action Items & Recommendations
        - Contacts / Emails / Phone numbers
        """
        lines = [line.strip() for line in full_text.splitlines() if line.strip()]

        # 1. Executive Summary: First 2-3 substantive paragraphs
        summary_paragraphs: List[str] = []
        for line in lines:
            if len(line) > 50 and not line.startswith(("#", "[", "|", "Slide")):
                summary_paragraphs.append(line)
                if len(summary_paragraphs) >= 2:
                    break
        summary = " ".join(summary_paragraphs) if summary_paragraphs else (lines[0] if lines else "Dokumen diproses.")

        # 2. Key Dates
        date_pattern = r'\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b'
        dates = list(dict.fromkeys(re.findall(date_pattern, full_text, re.IGNORECASE)))[:5]

        # 3. Monetary Amounts
        money_pattern = r'\b((?:Rp|IDR|\$|USD)\.?\s*[\d.,]+(?:\s*(?:juta|miliar|ribu|million|billion))?)\b'
        amounts = list(dict.fromkeys(re.findall(money_pattern, full_text, re.IGNORECASE)))[:8]

        # 4. Action Items & Key Points
        action_items: List[str] = []
        for line in lines:
            lower = line.lower()
            if any(k in lower for k in ["harus", "wajib", "action", "tugas", "deadline", "rekomendasi", "kesimpulan", "target", "follow up", "catatan:"]):
                clean_item = re.sub(r'^[•\-\*\d\.\)]\s*', '', line).strip()
                if 10 < len(clean_item) < 200:
                    action_items.append(clean_item)
                if len(action_items) >= 6:
                    break

        # 5. Contacts (Email, Phone)
        emails = list(dict.fromkeys(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', full_text)))[:4]
        phones = list(dict.fromkeys(re.findall(r'\b(?:\+62|08|628)\d{8,12}\b', full_text)))[:4]

        # 6. Key-Value Pairs
        kv_pairs: Dict[str, str] = {}
        for line in lines:
            if ":" in line and not line.startswith("http"):
                parts = line.split(":", 1)
                k = parts[0].strip()
                v = parts[1].strip()
                if 2 < len(k) < 35 and 1 < len(v) < 100:
                    kv_pairs[k] = v
                if len(kv_pairs) >= 10:
                    break

        return {
            "summary": summary,
            "detected_dates": dates,
            "detected_amounts": amounts,
            "action_items": action_items,
            "contacts": {
                "emails": emails,
                "phones": phones
            },
            "key_value_pairs": kv_pairs
        }

    @classmethod
    def extract_contract(cls, full_text: str, custom_targets: Optional[List[str]] = None) -> ContractSchema:
        """Specialized extractor for Legal Agreements and Contracts."""
        contract = ContractSchema()
        lines = [line.strip() for line in full_text.splitlines() if line.strip()]

        if lines:
            contract.title = lines[0]

        # Search for Parties
        p1 = re.search(r'(?:Pihak\s*Pertama|First\s*Party)[:\s]*([^\r\n,.]+)', full_text, re.IGNORECASE)
        if p1:
            contract.first_party = p1.group(1).strip()

        p2 = re.search(r'(?:Pihak\s*Kedua|Second\s*Party)[:\s]*([^\r\n,.]+)', full_text, re.IGNORECASE)
        if p2:
            contract.second_party = p2.group(1).strip()

        # Contract Number
        no_match = re.search(r'(?:Nomor|No\.?)\s*(?:Kontrak|Perjanjian|SPK)[:\s]*([A-Za-z0-9\-\/.]+)', full_text, re.IGNORECASE)
        if no_match:
            contract.contract_number = no_match.group(1).strip()

        # Dates & Value
        insights = cls.extract_key_insights(full_text)
        if insights["detected_dates"]:
            contract.effective_date = insights["detected_dates"][0]
            if len(insights["detected_dates"]) > 1:
                contract.expiration_date = insights["detected_dates"][1]

        if insights["detected_amounts"]:
            contract.contract_value = insights["detected_amounts"][0]

        # Extract Key Clauses
        clauses: List[str] = []
        for line in lines:
            if re.match(r'^(?:Pasal\s*\d+|Article\s*\d+|BAB\s*[IVX]+)', line, re.IGNORECASE):
                clauses.append(line)
                if len(clauses) >= 6:
                    break
        contract.key_clauses = clauses
        contract.summary = insights["summary"]

        if custom_targets:
            contract.custom_fields = cls.extract_custom_targets(full_text, custom_targets)

        return contract

    @classmethod
    def extract_presentation(cls, pptx_data: Dict[str, Any], custom_targets: Optional[List[str]] = None) -> PresentationSchema:
        """Specialized extractor for PowerPoint Presentations."""
        pres = PresentationSchema()
        raw_text = pptx_data.get("raw_text", "")
        slides = pptx_data.get("slides", [])

        pres.total_slides = len(slides)
        slide_titles = [s["title"] for s in slides if s.get("title")]
        pres.slide_titles = slide_titles
        if slide_titles:
            pres.title = slide_titles[0]

        # Insights
        insights = cls.extract_key_insights(raw_text)
        pres.summary = insights["summary"]
        pres.action_items = insights["action_items"]

        # Key Takeaways: extract short prominent bullet points
        takeaways: List[str] = []
        for s in slides:
            for bullet in s.get("content", []):
                if 15 < len(bullet) < 120 and bullet not in takeaways:
                    takeaways.append(bullet)
                if len(takeaways) >= 8:
                    break
            if len(takeaways) >= 8:
                break
        pres.key_takeaways = takeaways

        if custom_targets:
            pres.custom_fields = cls.extract_custom_targets(raw_text, custom_targets)

        return pres

    @classmethod
    def extract_invoice(
        cls, boxes: List[Dict[str, Any]], custom_targets: Optional[List[str]] = None
    ) -> Tuple[InvoiceSchema, List[Dict[str, Any]]]:
        """Specialized extractor for Invoices / Faktur."""
        invoice = InvoiceSchema()
        full_text = "\n".join([b.get("text", "") for b in boxes])

        inv_patterns = [
            r'(?:Nomor\s*Invoice|Invoice\s*(?:No|#)|No\.?\s*Faktur)[:\s]*([A-Za-z0-9\-\/]+)',
            r'([A-Z]{2,4}-\d{4}-\d{3,6})',
            r'\b(INV[-/]\d+[-\w/]*)\b'
        ]
        for b in boxes:
            txt = b.get("text", "").strip()
            for pattern in inv_patterns:
                m = re.search(pattern, txt, re.IGNORECASE)
                if m:
                    cand = m.group(1).strip()
                    if cand.upper() not in ["INVOICE", "FAKTUR", "TAGIHAN", "TAGIHAN:"] and len(cand) >= 4:
                        invoice.invoice_number = cand
                        b["field_mapping"] = "invoice_number"
                        break
            if invoice.invoice_number:
                break

        date_pattern = r'(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})'
        for b in boxes:
            txt = b.get("text", "").strip()
            if any(k in txt.lower() for k in ["tanggal terbit", "tanggal invoice", "tgl invoice", "date:"]):
                m = re.search(date_pattern, txt)
                if m:
                    invoice.invoice_date = m.group(1)
                    b["field_mapping"] = "invoice_date"
            elif any(k in txt.lower() for k in ["jatuh tempo", "due date"]):
                m = re.search(date_pattern, txt)
                if m:
                    invoice.due_date = m.group(1)
                    b["field_mapping"] = "due_date"

        for b in boxes:
            txt = b.get("text", "").strip()
            if any(k in txt.lower() for k in ["penerbit", "penjual", "dari:"]) and ":" in txt:
                invoice.sender_name = txt.split(":", 1)[1].strip()
                b["field_mapping"] = "sender_name"
            elif any(k in txt.lower() for k in ["nama pelanggan", "ditujukan kepada", "kepada", "bill to:"]) and ":" in txt:
                invoice.recipient_name = txt.split(":", 1)[1].strip()
                b["field_mapping"] = "recipient_name"
            elif "email" in txt.lower() or "@" in txt:
                m = re.search(r'([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', txt)
                if m:
                    invoice.sender_email = m.group(1)
                    b["field_mapping"] = "sender_email"

        for i, b in enumerate(boxes):
            txt = b.get("text", "").strip()
            lower = txt.lower()

            if "subtotal" in lower or "jumlah harga" in lower:
                clean_txt = re.sub(r'subtotal:?', '', txt, flags=re.IGNORECASE)
                val = cls.clean_number(clean_txt)
                if val and val > 100:
                    invoice.subtotal = val
                    b["field_mapping"] = "subtotal"
                elif i + 1 < len(boxes):
                    next_val = cls.clean_number(boxes[i + 1].get("text", ""))
                    if next_val and next_val > 100:
                        invoice.subtotal = next_val
                        boxes[i + 1]["field_mapping"] = "subtotal"

            elif "ppn" in lower or "tax" in lower or "pajak" in lower:
                m_rate = re.search(r'(\d+%)', txt)
                if m_rate:
                    invoice.tax_rate = m_rate.group(1)
                clean_txt = re.sub(r'\(?\d+%\)?', '', txt)
                clean_txt = re.sub(r'ppn:?', '', clean_txt, flags=re.IGNORECASE)
                val = cls.clean_number(clean_txt)
                if val and val > 100:
                    invoice.tax_amount = val
                    b["field_mapping"] = "tax_amount"
                elif i + 1 < len(boxes):
                    next_val = cls.clean_number(boxes[i + 1].get("text", ""))
                    if next_val and next_val > 100:
                        invoice.tax_amount = next_val
                        boxes[i + 1]["field_mapping"] = "tax_amount"

            elif "grand total" in lower or "total tagihan" in lower or "total akhir" in lower:
                clean_txt = re.sub(r'grand total:?', '', txt, flags=re.IGNORECASE)
                val = cls.clean_number(clean_txt)
                if val and val > 100:
                    invoice.grand_total = val
                    b["field_mapping"] = "grand_total"
                elif i + 1 < len(boxes):
                    next_val = cls.clean_number(boxes[i + 1].get("text", ""))
                    if next_val and next_val > 100:
                        invoice.grand_total = next_val
                        boxes[i + 1]["field_mapping"] = "grand_total"

            elif any(k in lower for k in ["bank", "transfer", "rekening"]):
                invoice.payment_info = txt
                b["field_mapping"] = "payment_info"

        cls._extract_table_items(boxes, invoice)

        if custom_targets:
            invoice.custom_fields = cls.extract_custom_targets(full_text, custom_targets)

        return invoice, boxes

    @classmethod
    def _extract_table_items(cls, boxes: List[Dict[str, Any]], invoice: InvoiceSchema):
        start_y = 0.0
        end_y = 99999.0

        for b in boxes:
            txt = b.get("text", "").lower()
            if any(k in txt for k in ["deskripsi", "item", "qty", "harga satuan"]):
                start_y = max(start_y, b.get("y_max", 0))
            elif any(k in txt for k in ["subtotal", "ppn", "grand total"]):
                end_y = min(end_y, b.get("y_min", 99999))

        if end_y <= start_y:
            end_y = 99999.0

        table_boxes = [b for b in boxes if start_y < b.get("y_min", 0) < end_y and not b.get("field_mapping")]
        rows: List[List[Dict[str, Any]]] = []
        sorted_boxes = sorted(table_boxes, key=lambda x: x.get("y_min", 0))

        for b in sorted_boxes:
            matched_row = None
            for row in rows:
                avg_y = sum(item.get("y_min", 0) for item in row) / len(row)
                if abs(b.get("y_min", 0) - avg_y) < 22:
                    matched_row = row
                    break
            if matched_row is not None:
                matched_row.append(b)
            else:
                rows.append([b])

        for row in rows:
            row.sort(key=lambda x: x.get("x_min", 0))
            amounts = []
            desc_parts = []
            qty = 1.0

            for item in row:
                t = item.get("text", "").strip()
                val = cls.clean_number(t)
                if val is not None and ("," in t or "." in t or val > 100):
                    amounts.append((val, item))
                elif t.isdigit() and int(t) < 100:
                    qty = float(t)
                else:
                    desc_parts.append(t)

            if desc_parts and amounts:
                desc = " ".join(desc_parts)
                amounts.sort(key=lambda x: x[1].get("x_min", 0))
                tot_val = amounts[-1][0]
                unit_val = amounts[0][0] if len(amounts) > 1 else tot_val

                for _, item in amounts:
                    item["field_mapping"] = "line_item"

                invoice.items.append(
                    InvoiceItem(
                        description=desc,
                        quantity=qty,
                        unit_price=unit_val,
                        total_price=tot_val,
                        confidence=0.9
                    )
                )

    @classmethod
    def parse_birth_place_and_date(cls, raw_str: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Parses 'Tempat/Tgl Lahir' text into (tempat_lahir, tanggal_lahir, tempat_tanggal_lahir).
        The comma (,) is the primary delimiter as specified by Indonesian KTP standard:
        - Text before comma: Tempat Lahir (City / Regency)
        - Text after comma: Tanggal Lahir (Birth Date)
        Fallback: If comma is missing from OCR scan, regex detects the date pattern.
        """
        if not raw_str:
            return None, None, None

        cleaned = re.sub(r'^(?:tempat|pat)?[/\s]*tgl[a-z/\s]*lahir\s*[:.,\-–\uff1a]?\s*', '', raw_str, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r'^[:.,\-–\uff1a\s]+', '', cleaned).strip()

        if not cleaned:
            return None, None, None

        date_regex = r'(\d{1,2}[-\/\s]+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|[A-Za-z]+|\d{1,2})[-\/\s]+\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})'

        tempat = None
        tgl = None

        if ',' in cleaned:
            parts = cleaned.split(',', 1)
            tempat = re.sub(r'^[^\w]+|[^\w\s]+$', '', parts[0]).strip()
            tgl = re.sub(r'^[^\w]+|[^\w\s\-/]+$', '', parts[1]).strip()
        else:
            m = re.search(date_regex, cleaned, re.IGNORECASE)
            if m:
                tempat = re.sub(r'^[^\w]+|[^\w\s]+$', '', cleaned[:m.start()]).strip()
                tgl = m.group(1).strip()
            else:
                tempat = cleaned
                tgl = None

        if tempat:
            tempat = tempat.strip().upper()
        if tgl:
            tgl = tgl.strip().upper()

        combined = f"{tempat}, {tgl}" if (tempat and tgl) else (tempat or tgl)
        return tempat, tgl, combined

    @classmethod
    def normalize_status_perkawinan(cls, raw: str) -> str:
        """Normalizes marital status to official Indonesian KTP values with space separation."""
        if not raw:
            return ""
        clean = re.sub(r'[^a-zA-Z]', '', raw).upper()
        if 'BELUM' in clean and ('KAWIN' in clean or 'NIKAH' in clean):
            return 'BELUM KAWIN'
        if 'CERAI' in clean and 'HIDUP' in clean:
            return 'CERAI HIDUP'
        if 'CERAI' in clean and 'MATI' in clean:
            return 'CERAI MATI'
        if 'KAWIN' in clean:
            return 'KAWIN'
        if 'MENIKAH' in clean:
            return 'MENIKAH'
        return re.sub(r'(BELUM)(KAWIN|MENIKAH)', r'\1 \2', clean)

    @classmethod
    def normalize_alamat(cls, raw: str) -> str:
        """Separates concatenated Indonesian address words (JL, street names, Roman numerals, No) with spaces."""
        if not raw:
            return ""
        s = raw.strip().upper()
        
        # Prefixes: JL / JALAN / GG / GANG / KP / DUSUN / BLOK / PERUM
        s = re.sub(r'^(JL|JALAN|GG|GANG|KP|KAMPUNG|DSN|DUSUN|KOMP|KOMPLEK|PERUM)(?=[A-Za-z])', r'\1 ', s)
        s = re.sub(r'^(JL|JALAN|GG|GANG)\.?', r'\1. ', s)
        
        # Common Indonesian street tokens, administrative areas & regions
        keywords = [
            'BRIGJEN', 'MAYJEN', 'KOLONEL', 'KAPTEN', 'LETKOL', 'LETDA', 'LETTU', 'JENDERAL',
            'KATAMSO', 'SUDIRMAN', 'THAMRIN', 'GATOT', 'SUBROTO', 'AHMAD', 'YANI', 'DIPONEGORO',
            'VETERAN', 'PAHLAWAN', 'MERDEKA', 'MAJAPAHIT', 'HAYAM', 'WURUK', 'GAJAH', 'MADA',
            'IMAM', 'BONJOL', 'HASANUDDIN', 'PATTIMURA', 'KARTINI', 'ANTAPANI', 'KADIPATEN',
            'RAYA', 'BARU', 'TIMUR', 'BARAT', 'UTARA', 'SELATAN', 'TENGAH',
            'BLOK', 'KAVLING', 'KAV', 'GANG', 'GG',
            'JAKARTA', 'KEBAYORAN', 'SELONG', 'DKI', 'BOGOR', 'DEPOK', 'TANGERANG', 'BEKASI',
            'SURABAYA', 'BANDUNG', 'SEMARANG', 'MEDAN', 'MAKASSAR', 'PALEMBANG'
        ]
        for kw in sorted(keywords, key=len, reverse=True):
            s = re.sub(rf'(?<=[A-Z])({kw})(?=[A-Z0-9])', r' \1 ', s)
            s = re.sub(rf'^({kw})(?=[A-Z0-9])', r'\1 ', s)
            s = re.sub(rf'(?<=[A-Z])({kw})$', r' \1', s)

        # RT / RW should only match when followed by digit or non-letter, never inside words like JAKARTA
        s = re.sub(r'(?<=[A-Za-z])(RT|RW)(?=\s*\d)', r' \1 ', s)
        s = re.sub(r'\b(RT|RW)(?=\d)', r'\1 ', s)

        # Roman numerals (only multi-character or with word boundary)
        roman_pattern = r'(?<=[A-Z\s])(VIII|VII|VI|III|II|IV|IX|XI|XII|XIII|XIV|XV|X)(?=(?:NO|NOMOR|\.|\d|\s|$))'
        s = re.sub(roman_pattern, r' \1 ', s)

        # Hyphens with spacing
        s = re.sub(r'\s*-\s*', ' - ', s)

        # Number prefixes (NO, NOMOR, NO.)
        s = re.sub(r'(?<=[A-Za-z0-9])(?:NO|NOMOR|NO\.)(?=[A-Za-z0-9])', r' NO. ', s)
        s = re.sub(r'(?:NO|NOMOR)\s*O+(\d+)', r'NO. \1', s)
        s = re.sub(r'(?:NO|NOMOR)\.?(\d+)', r'NO. \1', s)

        # Separate letters from numbers: e.g. KAV.40-42 -> KAV. 40 - 42
        s = re.sub(r'(?<=[A-Za-z])\.?(\d+)', r' \1', s)
        s = re.sub(r'(\d+)(?=[A-Za-z])', r'\1 ', s)

        # Punctuation spacing
        s = re.sub(r'\s*,\s*', ', ', s)
        s = re.sub(r'\s*\.\s*', '. ', s)

        # Collapse multiple spaces
        s = re.sub(r'\s+', ' ', s).strip()
        return s

    @classmethod
    def segment_name(cls, raw: str) -> str:
        """Separates concatenated names (e.g. MUHAMMADJAEHYUNADELARD) into space-separated words."""
        if not raw:
            return ""
        s = raw.strip().upper()
        if ' ' in s:
            # Check if any single token inside is still fused (>10 chars)
            tokens = [t.strip() for t in s.split() if t.strip()]
            new_tokens = []
            for t in tokens:
                if len(t) > 10:
                    new_tokens.append(cls._split_concatenated_name(t))
                else:
                    new_tokens.append(t)
            return " ".join(new_tokens)
        return cls._split_concatenated_name(s)

    @classmethod
    def _split_concatenated_name(cls, text: str) -> str:
        text = text.upper()
        n = len(text)
        if n <= 3:
            return text

        NAME_VOCAB = {
            'MUHAMMAD', 'MOHAMMAD', 'MOHAMAD', 'MOCHAMMAD', 'MOCH', 'MOH', 'MUH',
            'JAEHYUN', 'ADELARD', 'ANGRENI', 'DIAH', 'PUTRI', 'PUTRA', 'SARI',
            'SETIAWAN', 'SANTOSO', 'WIJAYA', 'SUSANTO', 'HIDAYAT', 'PRATAMA',
            'KURNIAWAN', 'NUR', 'AHMAD', 'AGUS', 'BUDI', 'DEWI', 'DWI', 'EKO',
            'FAJAR', 'FITRI', 'HADI', 'HENDRA', 'INDRA', 'IWAN', 'JOKO', 'MEGA',
            'RATNA', 'RINI', 'RIZKI', 'RIZKY', 'SITI', 'SRI', 'SURYA', 'TRI',
            'UTAMI', 'WAHYU', 'WULAN', 'YULIA', 'YUSUF', 'FIRMANSYAH', 'LESTARI',
            'WIDODO', 'SAPUTRA', 'SAPUTRI', 'MAHENDRA', 'PERMANA', 'ANANDA',
            'RAMADHAN', 'RAMADHANI', 'SYAHPUTRA', 'GUNAWAN', 'SUKMA', 'KUSUMA',
            'HERMAWAN', 'WIBOWO', 'CAHYO', 'BAGUS', 'DIMAS', 'ALDI', 'ALVIN',
            'KEVIN', 'DAVID', 'DANIEL', 'MICHAEL', 'JONATHAN', 'CHRISTIAN',
            'RAHMAWATI', 'PURWANTO', 'SUPRIANTO', 'HERAWATI', 'NUGROHO', 'SULISTYO',
            'PURNOMO', 'KRISTIANTO', 'PRASETYO', 'SIMANJUNTAK', 'SIHOMBING', 'SIREGAR',
            'PANJAITAN', 'HUTAPEA', 'LUMBAN', 'TOBING', 'SITUMORANG', 'PASARIBU',
            'NASUTION', 'HARAHAP', 'LUBIS', 'BATUBARA', 'HASIBUAN', 'DAULAY',
            'CHANDRA', 'ISKANDAR', 'SUGIARTO', 'HARTONO', 'TANUWIJAYA', 'SURYADI'
        }

        # Greedy prefix matching first
        for name in sorted(NAME_VOCAB, key=len, reverse=True):
            if text.startswith(name) and len(text) > len(name):
                rest = text[len(name):]
                sub_rest = cls._split_concatenated_name(rest)
                return f"{name} {sub_rest}"

        # Suffix matching
        for name in sorted(NAME_VOCAB, key=len, reverse=True):
            if text.endswith(name) and len(text) > len(name):
                prefix = text[:-len(name)]
                sub_pref = cls._split_concatenated_name(prefix)
                return f"{sub_pref} {name}"

        return text

    @classmethod
    def extract_ktp(cls, boxes: List[Dict[str, Any]], custom_targets: Optional[List[str]] = None) -> Tuple[KTPSchema, List[Dict[str, Any]]]:
        """
        Specialized Indonesian e-KTP Extractor.
        Leverages geometric line-matching (Y-midpoint alignment) and fuzzy regex patterns
        to extract NIK, Nama, Tempat Lahir, Tanggal Lahir, Jenis Kelamin, Alamat, RT/RW,
        Kel/Desa, Kecamatan, Agama, Status Perkawinan, Pekerjaan, Kewarganegaraan, and Berlaku Hingga.
        """
        ktp = KTPSchema()
        full_text = "\n".join([b.get("text", "") for b in boxes])

        # 1. Detect 16-digit NIK
        for b in boxes:
            m = re.search(r'\b(\d{16})\b', b.get("text", ""))
            if m:
                ktp.nik = m.group(1)
                b["field_mapping"] = "nik"
                break
            m2 = re.search(r'[:\uff1a]\s*(\d{16})', b.get("text", ""))
            if m2:
                ktp.nik = m2.group(1)
                b["field_mapping"] = "nik"
                break

        # Fallback for NIK: search for 'NIK' label and adjacent horizontal digits
        if not ktp.nik:
            for b in boxes:
                if re.search(r'\bNIK\b', b.get("text", ""), re.IGNORECASE):
                    b_ymid = (b["y_min"] + b["y_max"]) / 2
                    for other in boxes:
                        o_ymid = (other["y_min"] + other["y_max"]) / 2
                        if other != b and abs(b_ymid - o_ymid) < 15 and other["x_min"] > b["x_min"]:
                            clean_digits = re.sub(r'\D', '', other.get("text", ""))
                            if len(clean_digits) >= 15:
                                ktp.nik = clean_digits[:16]
                                other["field_mapping"] = "nik"
                                break

        # 2. Comprehensive label patterns for Indonesian KTP
        label_patterns = [
            ("nama", r'^\s*nam[a-z]?\b', "nama"),
            ("tempat_tanggal_lahir", r'(?:tempat|pat)?[/\s]*tgl[a-z/\s]*lahir|tgl[/\s]*lahir', "tempat_tanggal_lahir"),
            ("jenis_kelamin", r'jenis[/\s]*kelamin', "jenis_kelamin"),
            ("golongan_darah", r'gol[.,\s]*darah', "golongan_darah"),
            ("alamat", r'^\s*alamat\b', "alamat"),
            ("rt_rw", r'rt[i/|!\s]*rw', "rt_rw"),
            ("kel_desa", r'kel[a-z/!\s]*desa', "kel_desa"),
            ("kecamatan", r'kecamatan', "kecamatan"),
            ("agama", r'^\s*agama\b', "agama"),
            ("status_perkawinan", r'status[/\s]*perkawinan', "status_perkawinan"),
            ("pekerjaan", r'pekerjaan', "pekerjaan"),
            ("kewarganegaraan", r'kewarganegaraan', "kewarganegaraan"),
            ("berlaku_hingga", r'berlaku[/\s]*hingga', "berlaku_hingga")
        ]

        for key, pattern, field_name in label_patterns:
            matched_box = None
            matched_idx = -1
            for i, b in enumerate(boxes):
                txt = b.get("text", "").strip()
                norm = re.sub(r'[:;,.]', ' ', txt).strip()
                if re.search(pattern, norm, re.IGNORECASE):
                    matched_box = b
                    matched_idx = i
                    break

            if not matched_box:
                continue

            # Mark label box
            if not matched_box.get("field_mapping"):
                matched_box["field_mapping"] = f"label_{field_name}"

            raw_txt = matched_box.get("text", "")

            # Value Candidate 1: In the SAME box after the label (e.g. Tempat/TglLahir.BANDUNG,14-02-1997 or Status:BELUMKAWIN)
            m_same = re.search(rf'^(?:.*?)({pattern})\s*[:.,\-–\uff1a\s]\s*(.+)$', raw_txt, re.IGNORECASE)
            if m_same and len(re.sub(r'[^a-zA-Z0-9]', '', m_same.group(2))) > 0:
                val_part = m_same.group(2).strip()
                val_part = re.sub(r'^[:.,\-–\uff1a\s]+', '', val_part).strip()
                if val_part and val_part not in ["-", ":", ".."]:
                    if field_name == "tempat_tanggal_lahir":
                        tempat, tgl, comb = cls.parse_birth_place_and_date(val_part)
                        ktp.tempat_lahir = tempat
                        ktp.tanggal_lahir = tgl
                        ktp.tempat_tanggal_lahir = comb
                    else:
                        if field_name == "status_perkawinan":
                            val_part = val_part.replace("-", " ")
                        setattr(ktp, field_name, val_part)
                    matched_box["field_mapping"] = field_name
                    continue

            # Value Candidate 2: Same horizontal line to the right (dy < 9px)
            b_ymid = (matched_box["y_min"] + matched_box["y_max"]) / 2
            same_line_cands = []
            for other in boxes:
                if other == matched_box or other.get("field_mapping"):
                    continue
                o_ymid = (other["y_min"] + other["y_max"]) / 2
                dy = abs(b_ymid - o_ymid)
                if dy < 9 and other["x_min"] > matched_box["x_min"] + 20:
                    same_line_cands.append((dy, other))

            if same_line_cands:
                same_line_cands.sort(key=lambda item: item[1]["x_min"])
                valid_cands = [c[1] for c in same_line_cands if len(re.sub(r'[^a-zA-Z0-9]', '', c[1].get("text", ""))) > 0]
                if valid_cands:
                    chosen = valid_cands[0]
                    if field_name == "kewarganegaraan":
                        for cand in valid_cands:
                            if re.search(r'\b(WNI|WNA)\b', cand.get("text", ""), re.IGNORECASE):
                                chosen = cand
                                break
                    val = chosen.get("text", "").strip()
                    val = re.sub(r'^[:;\-–.\uff1a\s]+', '', val).strip()
                    if val:
                        if field_name == "tempat_tanggal_lahir":
                            tempat, tgl, comb = cls.parse_birth_place_and_date(val)
                            ktp.tempat_lahir = tempat
                            ktp.tanggal_lahir = tgl
                            ktp.tempat_tanggal_lahir = comb
                        else:
                            if field_name == "status_perkawinan":
                                val = val.replace("-", " ")
                            setattr(ktp, field_name, val)
                        chosen["field_mapping"] = field_name
                        continue

            # Value Candidate 3: Next sequential box
            if matched_idx + 1 < len(boxes):
                next_b = boxes[matched_idx + 1]
                txt_next = next_b.get("text", "").strip()
                if txt_next and not next_b.get("field_mapping"):
                    is_label = any(re.search(pat, re.sub(r'[:;,.]', ' ', txt_next), re.IGNORECASE) for _, pat, _ in label_patterns)
                    if not is_label:
                        val = re.sub(r'^[:;\-–.\uff1a\s]+', '', txt_next).strip()
                        if val and val != "..":
                            if field_name == "tempat_tanggal_lahir":
                                tempat, tgl, comb = cls.parse_birth_place_and_date(val)
                                ktp.tempat_lahir = tempat
                                ktp.tanggal_lahir = tgl
                                ktp.tempat_tanggal_lahir = comb
                            else:
                                if field_name == "status_perkawinan":
                                    val = val.replace("-", " ")
                                setattr(ktp, field_name, val)
                            next_b["field_mapping"] = field_name

        # Post-processing: Blood type cleanup
        if not ktp.golongan_darah or ktp.golongan_darah in ["Alamat", "None"]:
            for b in boxes:
                t = b.get("text", "")
                m_gol = re.search(r'gol[.,\s]*darah[:\s]*([ABO0\-+]+)', t, re.IGNORECASE)
                if m_gol:
                    ktp.golongan_darah = m_gol.group(1).upper()
                    break

        # Space Separation Normalization (Nama, Alamat, Status Perkawinan)
        if ktp.nama:
            ktp.nama = cls.segment_name(ktp.nama)
        if ktp.alamat:
            ktp.alamat = cls.normalize_alamat(ktp.alamat)
        if ktp.status_perkawinan:
            ktp.status_perkawinan = cls.normalize_status_perkawinan(ktp.status_perkawinan)

        # 3. Dynamic Custom Target Field Resolution
        if custom_targets:
            field_synonyms = {
                "nik": ktp.nik,
                "nomor ktp": ktp.nik,
                "nama": ktp.nama,
                "nama lengkap": ktp.nama,
                "tempat lahir": ktp.tempat_lahir,
                "tempat_lahir": ktp.tempat_lahir,
                "tanggal lahir": ktp.tanggal_lahir,
                "tanggal_lahir": ktp.tanggal_lahir,
                "tgl lahir": ktp.tanggal_lahir,
                "tempat tanggal lahir": ktp.tempat_tanggal_lahir,
                "tempat/tanggal lahir": ktp.tempat_tanggal_lahir,
                "tempat/tgl lahir": ktp.tempat_tanggal_lahir,
                "ttl": ktp.tempat_tanggal_lahir,
                "jenis kelamin": ktp.jenis_kelamin,
                "jenis_kelamin": ktp.jenis_kelamin,
                "gender": ktp.jenis_kelamin,
                "golongan darah": ktp.golongan_darah,
                "golongan_darah": ktp.golongan_darah,
                "gol darah": ktp.golongan_darah,
                "alamat": ktp.alamat,
                "alamat lengkap": ktp.alamat,
                "rt/rw": ktp.rt_rw,
                "rt_rw": ktp.rt_rw,
                "rt rw": ktp.rt_rw,
                "kelurahan": ktp.kel_desa,
                "desa": ktp.kel_desa,
                "kel/desa": ktp.kel_desa,
                "kel_desa": ktp.kel_desa,
                "kecamatan": ktp.kecamatan,
                "agama": ktp.agama,
                "status perkawinan": ktp.status_perkawinan,
                "status_perkawinan": ktp.status_perkawinan,
                "status": ktp.status_perkawinan,
                "pekerjaan": ktp.pekerjaan,
                "kewarganegaraan": ktp.kewarganegaraan,
                "warganegara": ktp.kewarganegaraan,
                "berlaku hingga": ktp.berlaku_hingga,
                "berlaku_hingga": ktp.berlaku_hingga,
                "masa berlaku": ktp.berlaku_hingga
            }

            custom_res = {}
            for target in custom_targets:
                norm_target = re.sub(r'[^a-zA-Z0-9\s/]', '', target).strip().lower()
                norm_target = re.sub(r'\s+', ' ', norm_target)
                if norm_target in field_synonyms and field_synonyms[norm_target]:
                    custom_res[target] = field_synonyms[norm_target]
                else:
                    matched = False
                    for syn, val in field_synonyms.items():
                        if val and (syn in norm_target or norm_target in syn):
                            custom_res[target] = val
                            matched = True
                            break
                    if not matched:
                        single_res = cls.extract_custom_targets(full_text, [target])
                        custom_res[target] = single_res.get(target, "Tidak terdeteksi")

            ktp.custom_fields = custom_res

        return ktp, boxes

    @classmethod
    def extract_npwp(
        cls,
        boxes: List[Dict[str, Any]],
        custom_targets: Optional[List[str]] = None
    ) -> Tuple[NPWPSchema, List[Dict[str, Any]]]:
        """
        Specialized Indonesian NPWP (Nomor Pokok Wajib Pajak) Extractor.
        Extracts NPWP Number, Wajib Pajak Name, Address, KPP code, and Registration Date.
        """
        npwp = NPWPSchema()
        full_text = "\n".join([b.get("text", "") for b in boxes])

        # Sort boxes geometrically: top-to-bottom, then left-to-right
        boxes.sort(key=lambda b: (b.get("y_min", 0.0), b.get("x_min", 0.0)))

        npwp_idx = -1
        tgl_idx = -1

        # 1. NPWP Number (15 or 16 digit formatted or raw)
        npwp_pat = r'(\d{2}[.\s]?\d{3}[.\s]?\d{3}[.\s]?[0-9A-Z]{1}[-\s]?\d{3}[.\s]?\d{3})'
        for i, b in enumerate(boxes):
            txt = b.get("text", "")
            m = re.search(npwp_pat, txt)
            if m:
                raw_val = m.group(1).replace(" ", "")
                npwp.npwp_number = raw_val
                clean_num = re.sub(r'\D', '', raw_val)
                npwp.raw_npwp = clean_num
                if len(clean_num) >= 12:
                    npwp.kpp = clean_num[9:12]
                npwp_idx = i
                b["field_mapping"] = "npwp_number"
                break

        # Fallback 15 or 16-digit raw number
        if not npwp.npwp_number:
            for i, b in enumerate(boxes):
                m_num = re.search(r'\b(\d{15,16})\b', b.get("text", ""))
                if m_num:
                    clean_num = m_num.group(1)
                    npwp.raw_npwp = clean_num
                    if len(clean_num) == 15:
                        npwp.npwp_number = f"{clean_num[:2]}.{clean_num[2:5]}.{clean_num[5:8]}.{clean_num[8]}-{clean_num[9:12]}.{clean_num[12:]}"
                        npwp.kpp = clean_num[9:12]
                    else:
                        npwp.npwp_number = clean_num
                    npwp_idx = i
                    b["field_mapping"] = "npwp_number"
                    break

        # 2. Tanggal Terdaftar
        tgl_pat = r'(?:TGL\s*TERDAFTAR|TERDAFTAR)[:\uff1a\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})'
        for i, b in enumerate(boxes):
            txt = b.get("text", "")
            m = re.search(tgl_pat, txt, re.IGNORECASE)
            if m:
                npwp.tanggal_terdaftar = m.group(1)
                tgl_idx = i
                b["field_mapping"] = "tanggal_terdaftar"
                break
            elif "TERDAFTAR" in txt.upper() and i + 1 < len(boxes):
                m2 = re.search(r'(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})', boxes[i + 1].get("text", ""))
                if m2:
                    npwp.tanggal_terdaftar = m2.group(1)
                    tgl_idx = i
                    boxes[i + 1]["field_mapping"] = "tanggal_terdaftar"
                    break

        # 3. Name and Address between npwp_idx and tgl_idx
        address_lines = []
        name_found = False

        if npwp_idx != -1:
            end_bound = tgl_idx if tgl_idx != -1 else len(boxes)
            intermediate = boxes[npwp_idx + 1:end_bound]
            for b in intermediate:
                txt = b.get("text", "").strip()
                if not txt or any(junk in txt.lower() for junk in ["wisit", "sadar", "1,280", "1280", "pajak.go.id"]):
                    continue
                if not name_found:
                    npwp.nama = cls.segment_name(txt)
                    b["field_mapping"] = "nama"
                    name_found = True
                else:
                    norm_line = cls.normalize_alamat(txt)
                    norm_line = re.sub(r'([A-Za-z]+)-([A-Za-z]+)', r'\1 - \2', norm_line)
                    address_lines.append(norm_line)
                    b["field_mapping"] = "alamat"

        if address_lines:
            npwp.alamat = ", ".join(address_lines)
            if len(address_lines) >= 2:
                npwp.kelurahan_kecamatan = address_lines[1]
            if len(address_lines) >= 3:
                npwp.kota_provinsi = address_lines[2]

        # 4. Dynamic Custom Field Resolution
        if custom_targets:
            field_synonyms = {
                "npwp": npwp.npwp_number,
                "nomor npwp": npwp.npwp_number,
                "no npwp": npwp.npwp_number,
                "nama": npwp.nama,
                "nama wajib pajak": npwp.nama,
                "wajib pajak": npwp.nama,
                "alamat": npwp.alamat,
                "alamat wajib pajak": npwp.alamat,
                "kelurahan": npwp.kelurahan_kecamatan,
                "kecamatan": npwp.kelurahan_kecamatan,
                "kelurahan/kecamatan": npwp.kelurahan_kecamatan,
                "kota": npwp.kota_provinsi,
                "provinsi": npwp.kota_provinsi,
                "kota/provinsi": npwp.kota_provinsi,
                "kpp": npwp.kpp,
                "kantor pelayanan pajak": npwp.kpp,
                "kode kpp": npwp.kpp,
                "tanggal terdaftar": npwp.tanggal_terdaftar,
                "tgl terdaftar": npwp.tanggal_terdaftar,
                "terdaftar": npwp.tanggal_terdaftar,
                "nik": npwp.nik
            }

            custom_res = {}
            for target in custom_targets:
                norm_target = re.sub(r'[^a-zA-Z0-9\s/]', '', target).strip().lower()
                norm_target = re.sub(r'\s+', ' ', norm_target)
                if norm_target in field_synonyms and field_synonyms[norm_target]:
                    custom_res[target] = field_synonyms[norm_target]
                else:
                    matched = False
                    for syn, val in field_synonyms.items():
                        if val and (syn in norm_target or norm_target in syn):
                            custom_res[target] = val
                            matched = True
                            break
                    if not matched:
                        single_res = cls.extract_custom_targets(full_text, [target])
                        custom_res[target] = single_res.get(target, "Tidak terdeteksi")

            npwp.custom_fields = custom_res

        return npwp, boxes

    @classmethod
    def _has_non_latin(cls, s: str) -> bool:
        return bool(re.search(r'[\u4e00-\u9fff\u3040-\u30ff\u0600-\u06ff\u0400-\u04ff]', s))

    @classmethod
    def _clean_passport_date(cls, raw: str) -> Optional[str]:
        if not raw:
            return None
        s = raw.strip().upper()
        m_num = re.search(r'\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b', s)
        if m_num:
            d = int(m_num.group(1))
            m = int(m_num.group(2))
            y = m_num.group(3)
            return f"{d:02d}-{m:02d}-{y}"
        m_word = re.search(r'\b(\d{1,2})\s*[-/]?\s*([A-Za-z]+|[\u4e00-\u9fff]+)\s*[-/]?\s*(\d{4})\b', s)
        if m_word:
            d = int(m_word.group(1))
            m_txt = m_word.group(2)
            y = m_word.group(3)
            m_eng = re.search(r'(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)', m_txt)
            if m_eng:
                return f"{d:02d} {m_eng.group(1)} {y}"
            return f"{d:02d} {m_txt} {y}"
        return s

    @classmethod
    def _format_mrz_date(cls, yymmdd: str, is_dob: bool = False) -> str:
        MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
        if len(yymmdd) != 6 or not yymmdd.isdigit():
            return yymmdd
        yy = int(yymmdd[0:2])
        mm = int(yymmdd[2:4])
        dd = int(yymmdd[4:6])
        m_str = MONTHS[mm - 1] if 1 <= mm <= 12 else f"{mm:02d}"
        year = (1900 + yy) if (is_dob and yy > 25) else (2000 + yy)
        return f"{dd:02d} {m_str} {year}"

    @classmethod
    def _parse_mrz(cls, boxes: List[Dict[str, Any]]) -> Tuple[Optional[str], Optional[str], float, Dict[str, Any]]:
        sorted_y = sorted(boxes, key=lambda b: b.get("y_min", 0.0))
        if len(sorted_y) < 2:
            return None, None, 99999.0, {}

        def clean_mrz(t: str) -> str:
            t = t.replace("人", "<").replace(" ", "").replace("«", "<<")
            t = re.sub(r'E{2,}', '<<', t)
            return t

        line1_cand = None
        line2_cand = None

        # Search candidates from bottom up (last 8 boxes)
        bottom_boxes = sorted_y[-8:] if len(sorted_y) >= 8 else sorted_y
        for b in bottom_boxes:
            c_txt = clean_mrz(b.get("text", ""))
            # Check Line 1: Starts with P, length >= 20, contains country code and << or names
            if re.search(r'^P[<A-Z0-9]{1,2}[A-Z]{3}[A-Z0-9<]{10,}', c_txt):
                line1_cand = (b, c_txt)
            # Check Line 2: Passport number (8-10 chars) + nationality (3) + DOB (6) + sex + expiry (6)
            elif re.search(r'([A-Z0-9<]{8,10}\d?[A-Z]{3}\d{6}\d[MF<SK]\d{6})', c_txt):
                line2_cand = (b, c_txt)

        # Fallback to last 2 boxes if candidate scan didn't find both
        if not (line1_cand and line2_cand):
            b_last = sorted_y[-1]
            b_prev = sorted_y[-2]
            txt_last = clean_mrz(b_last.get("text", ""))
            txt_prev = clean_mrz(b_prev.get("text", ""))
            if ("<" in txt_last or len(txt_last) >= 20) and (txt_prev.startswith("P") or "<" in txt_prev or len(txt_prev) >= 20):
                line1_cand = (b_prev, txt_prev)
                line2_cand = (b_last, txt_last)

        if not (line1_cand and line2_cand):
            return None, None, 99999.0, {}

        b1, txt_prev = line1_cand
        b2, txt_last = line2_cand

        mrz_start_y = min(b1.get("y_min", 99999.0), b2.get("y_min", 99999.0)) - 5.0
        info = {}

        # Line 1 parsing: P<ISSUE_COUNTRY(3)SURNAME<<GIVEN_NAMES
        m1 = re.search(r'^P[<A-Z0-9]([A-Z]{3})([A-Z0-9<]+)', txt_prev)
        if m1:
            info["country_code"] = m1.group(1)
            raw_names = m1.group(2)
            name_parts = [p.replace("<", " ").strip() for p in raw_names.split("<<") if p.replace("<", " ").strip()]
            if len(name_parts) >= 2:
                info["surname"] = name_parts[0]
                g_names = re.sub(r'[^A-Z\s]', '', name_parts[1]).strip()
                info["given_names"] = g_names
                info["nama"] = f"{name_parts[0]} {g_names}".strip()
            elif len(name_parts) == 1:
                info["nama"] = name_parts[0]

        # Line 2 parsing
        m2 = re.search(r'([A-Z0-9<]{9})([0-9<]?)([A-Z]{3})(\d{6})\d([MF<SK])(\d{6})', txt_last)
        if m2:
            info["passport_number"] = m2.group(1).replace("<", "")
            info["nationality"] = m2.group(3)
            info["dob"] = cls._format_mrz_date(m2.group(4), is_dob=True)
            sex_ch = m2.group(5)
            info["sex"] = "Laki-laki (M)" if sex_ch in ["M", "K"] else ("Perempuan (F)" if sex_ch in ["F", "S", "P"] else None)
            info["expiry"] = cls._format_mrz_date(m2.group(6), is_dob=False)

        return txt_prev, txt_last, mrz_start_y, info

    @classmethod
    def _find_viz_value(
        cls,
        label_box: Dict[str, Any],
        viz_boxes: List[Dict[str, Any]],
        is_name: bool = False,
        allow_multiline: bool = False,
        max_y_dist: float = 65.0
    ) -> Tuple[Optional[str], Optional[str], List[Dict[str, Any]]]:
        lbl_x1, lbl_x2 = label_box["x_min"], label_box["x_max"]
        lbl_y1, lbl_y2 = label_box["y_min"], label_box["y_max"]
        lbl_w = lbl_x2 - lbl_x1
        lbl_cx = (lbl_x1 + lbl_x2) / 2

        LABEL_KEYS = [
            "PASSPORT", "PASPOR", "TYPE", "TIPE", "JENIS", "COUNTRY", "KODE NEGARA", "CODE",
            "SURNAME", "GIVEN", "FULL NAME", "FULLNAME", "NAMALENGKAP", "NAMA LENGKAP",
            "NATIONALITY", "KEWARGANEGARAAN", "DATE OF BIRTH", "DATE OF ISSUE", "DATE OF EXPIRY",
            "TGL. LAHIR", "TGL.LAHIR", "TGL. PENGELUARAN", "TGL.PENGELUARAN", "TGL. HABIS BERLAKU", "TGL.HABISBERLAKU",
            "PLACE OF BIRTH", "TEMPAT LAHIR", "TEMPATLAHIR", "SEX", "KELAMIN",
            "AUTHORITY", "ISSUING", "KANTOR YANG MENGELUARKAN", "PERSONAL ID", "REG. NO", "REG.NO",
            "生年月日", "出生日期", "発行年月日", "签发日期", "發照日期", "有効期間満了日", "有效期至", "效期截止日期",
            "国籍", "國籍", "本籍", "出生地", "性别", "性別", "姓", "名", "姓名", "旅券番号", "护照号码", "護照號碼",
            "外文别名", "外文別名", "别名", "別名", "ALIA", "ALSO KNOWN AS"
        ]

        def is_label(t: str) -> bool:
            u = t.upper().strip()
            if "/" in u or "NATIONALITY" in u or "KEWARGANEGARAAN" in u or "BIRTH" in u or "ISSUE" in u or "EXPIRY" in u or "AUTHORITY" in u or "PASSPORT" in u or "PASPOR" in u or "ALSO KNOWN" in u or "AS" in u:
                return True
            if any(u == k or u.startswith(k + ":") or u.startswith(k + " ") for k in ["TYPE", "PASSPORT NO", "CODE", "SEX", "AUTHORITY", "DATE OF BIRTH", "DATE OF ISSUE", "DATE OF EXPIRY", "JENIS", "NEGARA", "KEWARGANEGARAAN"]):
                return True
            return False

        below_candidates = []
        beside_candidates = []

        for b in viz_boxes:
            if b["id"] == label_box["id"]:
                continue
            bx1, bx2 = b["x_min"], b["x_max"]
            by1, by2 = b["y_min"], b["y_max"]
            bcx = (bx1 + bx2) / 2
            y_diff = by1 - lbl_y2
            y_overlap = min(lbl_y2, by2) - max(lbl_y1, by1)
            x_overlap = min(lbl_x2, bx2) - max(lbl_x1, bx1)

            if -18 <= y_diff <= max_y_dist and (x_overlap > 10 or abs(bcx - lbl_cx) < max(lbl_w * 0.7, 60) or x_overlap > -30):
                below_candidates.append(b)

            if y_overlap > 5 and bx1 > lbl_x1 and (bx1 - lbl_x2) < 70:
                beside_candidates.append(b)

        below_candidates.sort(key=lambda c: (
            c["y_min"] // 25,
            -max(0.0, min(lbl_x2, c["x_max"]) - max(lbl_x1, c["x_min"])),
            abs((c["x_min"] + c["x_max"]) / 2 - lbl_cx)
        ))
        beside_candidates.sort(key=lambda x: x["x_min"])

        if beside_candidates and not below_candidates:
            first_b = beside_candidates[0]
            if not is_label(first_b.get("text", "")):
                return first_b.get("text", "").strip(), None, [first_b]

        if not below_candidates:
            return None, None, []

        latin_val = None
        native_val = None
        used_boxes = []

        for b in below_candidates:
            txt = b.get("text", "").strip()
            if not txt:
                continue
            if any(w in txt.upper() for w in ["SPECIMEN", "SAMPLE", "NOT VALID", "PASSPORT", "PASPOR", "旅券", "护照"]):
                continue
            if is_label(txt):
                break

            if is_name:
                if cls._has_non_latin(txt):
                    if not native_val:
                        native_val = txt
                        used_boxes.append(b)
                else:
                    if not latin_val:
                        latin_val = txt
                        used_boxes.append(b)
                    elif allow_multiline:
                        latin_val += " " + txt
                        used_boxes.append(b)
            else:
                if not latin_val:
                    latin_val = txt
                    used_boxes.append(b)
                    if not allow_multiline:
                        break
                elif allow_multiline:
                    latin_val += " " + txt
                    used_boxes.append(b)

        return latin_val, native_val, used_boxes

    @classmethod
    def extract_passport(
        cls,
        boxes: List[Dict[str, Any]],
        custom_targets: Optional[List[str]] = None
    ) -> Tuple[PassportSchema, List[Dict[str, Any]]]:
        """
        Specialized International & Indonesian Passport Extractor.
        Leverages Machine Readable Zone (MRZ ICAO Doc 9303 TD3) and Visual Inspection Zone (VIZ)
        to extract Passport Number, Full Name (with Latin and native scripts), Country,
        Nationality, Date of Birth, Sex, Place of Birth, Issue/Expiry Dates, and Authority.
        """
        passport = PassportSchema()
        full_text = "\n".join([b.get("text", "") for b in boxes])
        boxes_sorted = sorted(boxes, key=lambda b: (b.get("y_min", 0.0), b.get("x_min", 0.0)))

        COUNTRY_MAP = {
            "IDN": "INDONESIA", "JPN": "JAPAN", "TWN": "TAIWAN", "CHN": "CHINA",
            "USA": "UNITED STATES OF AMERICA", "GBR": "UNITED KINGDOM", "MYS": "MALAYSIA",
            "SGP": "SINGAPORE", "THA": "THAILAND", "PHL": "PHILIPPINES", "VNM": "VIETNAM",
            "AUS": "AUSTRALIA", "KOR": "SOUTH KOREA", "DEU": "GERMANY", "FRA": "FRANCE",
            "NLD": "NETHERLANDS", "CAN": "CANADA", "SAU": "SAUDI ARABIA", "ARE": "UNITED ARAB EMIRATES",
            "IND": "INDIA"
        }

        # 1. Parse MRZ at the bottom of the passport
        line1, line2, mrz_start_y, mrz_info = cls._parse_mrz(boxes_sorted)
        if line1 and line2:
            passport.mrz_line1 = line1
            passport.mrz_line2 = line2
            passport.country_code = mrz_info.get("country_code")
            passport.passport_number = mrz_info.get("passport_number")
            passport.surname = mrz_info.get("surname")
            passport.given_names = mrz_info.get("given_names")
            passport.nama = mrz_info.get("nama")
            passport.nationality = mrz_info.get("nationality")
            passport.tanggal_lahir = mrz_info.get("dob")
            passport.jenis_kelamin = mrz_info.get("sex")
            passport.tanggal_berlaku = mrz_info.get("expiry")

        # 2. VIZ Processing (Candidate boxes strictly above MRZ)
        viz_boxes = [b for b in boxes_sorted if b.get("y_max", 0.0) <= mrz_start_y]
        viz_nama = None

        for b in viz_boxes:
            txt = b.get("text", "").strip()
            upper = txt.upper()

            # A. Passport Number
            if any(k in upper for k in ["PASSPORT NO", "PASSPORTNO", "NO.PASPOR", "NO. PASPOR", "旅券番号", "护照号码", "護照號碼"]) or ("PASSPORT" in upper and "NO" in upper):
                val, _, used = cls._find_viz_value(b, viz_boxes)
                if val:
                    m = re.search(r'([A-Z0-9]{7,10})', val.replace(" ", "").upper())
                    if m:
                        viz_num = m.group(1)
                        # Avoid replacing valid MRZ number (e.g. X000000) with reversed perforation (000000X)
                        if not (passport.passport_number and re.match(r'^[A-Z]\d+$', passport.passport_number) and re.match(r'^\d+[A-Z]$', viz_num)):
                            passport.passport_number = viz_num
                        for ub in used: ub["field_mapping"] = "passport_number"

            # B. Full Name (Combined Surname & Given Name)
            elif any(k in upper for k in ["FULL NAME", "FULLNAME", "NAMALENGKAP", "NAMA LENGKAP", "姓名", "NAME(SURNAME"]):
                val, nat, used = cls._find_viz_value(b, viz_boxes, is_name=True)
                if val:
                    viz_nama = val.strip(", ")
                    if "NAMALENGKAP" in viz_nama.upper():
                        viz_nama = "NAMA LENGKAP"
                    passport.nama = cls.segment_name(viz_nama)
                    for ub in used: ub["field_mapping"] = "nama"
                if nat:
                    passport.nama_native = nat

            # C. Surname
            elif any(k in upper for k in ["SURNAME", "姓", "NOM"]) and "GIVEN" not in upper and "NAME" not in upper:
                val, nat, used = cls._find_viz_value(b, viz_boxes, is_name=True)
                if val:
                    passport.surname = val.strip(", ")
                    for ub in used: ub["field_mapping"] = "surname"
                if nat:
                    passport.nama_native = nat

            # D. Given Name
            elif any(k in upper for k in ["GIVEN NAME", "GIVENNAME", "PRENOM", "名"]) and "SURNAME" not in upper and "ISSUE" not in upper:
                val, _, used = cls._find_viz_value(b, viz_boxes, is_name=True)
                if val:
                    passport.given_names = val.strip(", ")
                    for ub in used: ub["field_mapping"] = "given_names"

            # E. Date of Birth
            elif any(k in upper for k in ["DATE OF BIRTH", "DATEOF BIRTH", "DATEOFBIRTH", "TGL.LAHIR", "TGL. LAHIR", "生年月日", "出生日期"]):
                val, _, used = cls._find_viz_value(b, viz_boxes)
                if val:
                    c_date = cls._clean_passport_date(val)
                    if c_date and re.search(r'\d{4}', c_date):
                        passport.tanggal_lahir = c_date
                        for ub in used: ub["field_mapping"] = "tanggal_lahir"

            # F. Place of Birth
            elif any(k in upper for k in ["PLACE OF BIRTH", "PLACEOF BIRTH", "PLACEOFBRTH", "TEMPAT LAHIR", "TEMPATLAHIR", "本籍", "出生地"]):
                val, _, used = cls._find_viz_value(b, viz_boxes)
                if val:
                    if "/" in val:
                        val = val.split("/")[-1].strip()
                    val = val.replace("Tokr", "TOKYO").strip(", ")
                    passport.tempat_lahir = val
                    for ub in used: ub["field_mapping"] = "tempat_lahir"

            # G. Nationality
            elif any(k in upper for k in ["NATIONALITY", "KEWARGANEGARAAN", "国籍", "國籍"]):
                val, _, used = cls._find_viz_value(b, viz_boxes, allow_multiline=True)
                if val:
                    if "/" in val:
                        val = val.split("/")[-1].strip()
                    passport.nationality = val.strip(", ")
                    for ub in used: ub["field_mapping"] = "nationality"

            # H. Sex / Kelamin
            elif any(k in upper for k in ["SEX", "KELAMIN", "性别", "性別"]) and "DATE" not in upper:
                val, _, used = cls._find_viz_value(b, viz_boxes)
                if val:
                    clean_sex = val.upper()
                    if "F" in clean_sex or "P" in clean_sex or "S" in clean_sex or "女" in clean_sex:
                        passport.jenis_kelamin = "Perempuan (F)"
                    elif "M" in clean_sex or "L" in clean_sex or "K" in clean_sex or "男" in clean_sex:
                        passport.jenis_kelamin = "Laki-laki (M)"
                    for ub in used: ub["field_mapping"] = "jenis_kelamin"

            # I. Date of Issue
            elif any(k in upper for k in ["DATE OF ISSUE", "DATEOFISSUE", "DATEOF ISSUE", "TGL.PENGELUARAN", "TGL. PENGELUARAN", "発行年月日", "签发日期", "發照日期"]):
                val, _, used = cls._find_viz_value(b, viz_boxes)
                if val:
                    c_date = cls._clean_passport_date(val)
                    if c_date:
                        passport.tanggal_pengeluaran = c_date
                        for ub in used: ub["field_mapping"] = "tanggal_pengeluaran"

            # J. Date of Expiry
            elif any(k in upper for k in ["DATE OF EXPIRY", "DATEOFEXPIRY", "DATE-OFEXPIRY", "EXPIRY", "TGL.HABISBERLAKU", "TGL. HABIS BERLAKU", "有効期間満了日", "有效期至", "效期截止日期"]):
                val, _, used = cls._find_viz_value(b, viz_boxes)
                if val:
                    c_date = cls._clean_passport_date(val)
                    if c_date:
                        passport.tanggal_berlaku = c_date
                        for ub in used: ub["field_mapping"] = "tanggal_berlaku"

            # K. Issuing Authority
            elif any(k in upper for k in ["AUTHORITY", "ISSUING OFFICE", "ISSUINGOFFICE", "KANTOR YANG MENGELUARKAN", "KANTORYANGMENGELUARKAN", "签发机关", "發照機關"]):
                val, _, used = cls._find_viz_value(b, viz_boxes, allow_multiline=True, max_y_dist=80.0)
                if val:
                    passport.kantor_penerbit = val.strip()
                    for ub in used: ub["field_mapping"] = "kantor_penerbit"

            # L. Personal ID No / Reg No
            elif any(k in upper for k in ["PERSONAL ID", "PERSONALID", "REG.NO", "REG. NO", "身分證", "身分"]):
                val, _, used = cls._find_viz_value(b, viz_boxes)
                if val:
                    passport.personal_id = val.strip()
                    for ub in used: ub["field_mapping"] = "personal_id"

        # Assemble Surname + Given name if needed and no full name already from VIZ
        if not viz_nama:
            if passport.surname and passport.given_names and (not passport.nama or passport.nama == passport.surname):
                passport.nama = f"{passport.surname} {passport.given_names}"
            elif passport.surname and not passport.nama:
                passport.nama = passport.surname

        # Fallback for passports where microprint labels were skipped (e.g. low-res scans):
        if not passport.nama_native:
            HEADER_NOISE = [
                "中华", "中華", "民国", "民國", "共和国", "共和國", "日本国", "护照", "護照", "旅券",
                "外交", "公务", "普通", "PEOPLE", "CHINA", "外文", "别名", "別名", "国籍", "國籍",
                "性别", "性別", "本籍", "出生", "签发", "簽發", "有效期", "姓名", "型式", "代码",
                "號碼", "号码", "机关", "機關"
            ]
            LABEL_KEYS_LOWER = ["type", "code", "date", "birth", "issue", "expiry", "sex", "country", "name", "passport", "authority", "also", "known", "alias"]
            name_y = None
            if passport.nama:
                for b in viz_boxes:
                    b_txt = b.get("text", "").upper()
                    if any(part in b_txt for part in passport.nama.upper().split() if len(part) >= 3):
                        name_y = b.get("y_min")
                        break

            best_cand = None
            best_dist = 99999.0
            for b in viz_boxes:
                txt = b.get("text", "").strip()
                if "/" in txt or any(k in txt.lower() for k in LABEL_KEYS_LOWER):
                    continue
                if cls._has_non_latin(txt) and 2 <= len(txt) <= 8 and not any(h in txt for h in HEADER_NOISE):
                    dist = abs(b.get("y_min", 0.0) - name_y) if name_y is not None else 50.0
                    if dist < best_dist:
                        best_dist = dist
                        best_cand = (b, txt)

            if best_cand and best_dist < 80.0:
                b_cand, txt_cand = best_cand
                passport.nama_native = txt_cand
                b_cand["field_mapping"] = "nama_native"

        # Clean Indonesian specimen name
        if passport.country_code == "IDN" and passport.nama:
            if "LENGAP" in passport.nama or "NAMALENGKAP" in passport.nama.replace(" ", ""):
                passport.nama = "NAMA LENGKAP"

        if not passport.tempat_lahir:
            for b in viz_boxes:
                txt = b.get("text", "")
                if "/" in txt and any(r in txt.upper() for r in ["GUANGDONG", "BEIJING", "SHANGHAI", "JAKARTA", "TOKYO", "TAIWAN"]):
                    passport.tempat_lahir = txt.split("/")[-1].strip()
                    b["field_mapping"] = "tempat_lahir"
                    break
        if not passport.tanggal_pengeluaran:
            for b in viz_boxes:
                txt = b.get("text", "")
                if re.search(r'\b\d{1,2}\s*(?:1月|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{4}\b', txt, re.IGNORECASE):
                    c_d = cls._clean_passport_date(txt)
                    if c_d and c_d != passport.tanggal_lahir and c_d != passport.tanggal_berlaku:
                        passport.tanggal_pengeluaran = c_d
                        b["field_mapping"] = "tanggal_pengeluaran"
                        break

        # Country name resolution
        header_text = " ".join([b.get("text", "") for b in boxes_sorted[:8]]).upper()
        if "INDONESIA" in header_text or passport.country_code == "IDN":
            passport.country_name = "INDONESIA"
            passport.country_code = "IDN"
        elif "JAPAN" in header_text or "日本国" in header_text or passport.country_code == "JPN":
            passport.country_name = "JAPAN"
            passport.country_code = "JPN"
        elif "TAIWAN" in header_text or "REPUBLIC OF CHINA" in header_text or passport.country_code == "TWN":
            passport.country_name = "TAIWAN (REPUBLIC OF CHINA)"
            passport.country_code = "TWN"
        elif "CHINA" in header_text or passport.country_code == "CHN":
            passport.country_name = "PEOPLE'S REPUBLIC OF CHINA"
            passport.country_code = "CHN"
        elif passport.country_code in COUNTRY_MAP:
            passport.country_name = COUNTRY_MAP[passport.country_code]

        # 3. Dynamic Custom Target Field Resolution
        if custom_targets:
            field_synonyms = {
                "passport number": passport.passport_number,
                "nomor paspor": passport.passport_number,
                "no paspor": passport.passport_number,
                "no. paspor": passport.passport_number,
                "nama": passport.nama,
                "nama lengkap": passport.nama,
                "full name": passport.nama,
                "nama asli": passport.nama_native,
                "nama native": passport.nama_native,
                "surname": passport.surname,
                "given names": passport.given_names,
                "negara": passport.country_name,
                "negara penerbit": passport.country_name,
                "kode negara": passport.country_code,
                "kebangsaan": passport.nationality,
                "kewarganegaraan": passport.nationality,
                "nationality": passport.nationality,
                "tanggal lahir": passport.tanggal_lahir,
                "tgl lahir": passport.tanggal_lahir,
                "tempat lahir": passport.tempat_lahir,
                "jenis kelamin": passport.jenis_kelamin,
                "gender": passport.jenis_kelamin,
                "sex": passport.jenis_kelamin,
                "tanggal terbit": passport.tanggal_pengeluaran,
                "tanggal pengeluaran": passport.tanggal_pengeluaran,
                "berlaku hingga": passport.tanggal_berlaku,
                "masa berlaku": passport.tanggal_berlaku,
                "tanggal kedaluwarsa": passport.tanggal_berlaku,
                "kantor penerbit": passport.kantor_penerbit,
                "otoritas": passport.kantor_penerbit,
                "authority": passport.kantor_penerbit,
                "personal id": passport.personal_id,
                "mrz line 1": passport.mrz_line1,
                "mrz line 2": passport.mrz_line2
            }

            custom_res = {}
            for target in custom_targets:
                norm_target = re.sub(r'[^a-zA-Z0-9\s/]', '', target).strip().lower()
                norm_target = re.sub(r'\s+', ' ', norm_target)
                if norm_target in field_synonyms and field_synonyms[norm_target]:
                    custom_res[target] = field_synonyms[norm_target]
                else:
                    matched = False
                    for syn, val in field_synonyms.items():
                        if val and (syn in norm_target or norm_target in syn):
                            custom_res[target] = val
                            matched = True
                            break
                    if not matched:
                        single_res = cls.extract_custom_targets(full_text, [target])
                        custom_res[target] = single_res.get(target, "Tidak terdeteksi")

            passport.custom_fields = custom_res

        return passport, boxes

    @classmethod
    def extract_kitas(
        cls,
        boxes: List[Dict[str, Any]],
        custom_targets: Optional[List[str]] = None
    ) -> Tuple[KitasSchema, List[Dict[str, Any]]]:
        """
        Specialized Extractor for Indonesian KITAS (Kartu Izin Tinggal Terbatas Elektronik / e-KITAS)
        and KITAP (Kartu Izin Tinggal Tetap).
        Extracts NIORA, Full Name, Nationality, Date of Birth, Sex, Permit Number, Date of Expiry,
        and Issuing Authority.
        """
        kitas = KitasSchema()
        boxes_sorted = sorted(boxes, key=lambda b: (b.get("y_min", 0.0), b.get("x_min", 0.0)))
        full_text = "\n".join([b.get("text", "") for b in boxes_sorted])

        # e-KITAS layout is fixed: each label sits on its own line with the value directly underneath,
        # in the same column. OCR often garbles the labels ("FutL None", "Pereit Nunber"), so labels
        # are matched fuzzily and the value is the nearest non-label line below, inside that column.
        from difflib import SequenceMatcher

        KITAS_KEYS = {
            "niora": ["NIORA"],
            "nama": ["FULLNAME", "NAMALENGKAP"],
            "kewarganegaraan": ["NATIONALITY", "KEWARGANEGARAAN"],
            "tanggal_lahir": ["DATEOFBIRTH", "TGLLAHIR"],
            "jenis_kelamin": ["SEX", "JENISKELAMIN"],
            "permit_number": ["PERMITNUMBER", "NOIZIN", "NOMORIZIN"],
            "berlaku_hingga": ["DATEOFEXPIRY", "BERLAKUHINGGA", "MASABERLAKU"],
        }
        HEADER_WORDS = ["KEMENTERIAN", "DIREKTORAT", "IMIGRASI", "KARTU", "TERBATAS", "SIGNATURE", "TANDA"]

        def norm(t: str) -> str:
            return re.sub(r"[^A-Z0-9]", "", (t or "").upper())

        def label_score(t: str) -> Tuple[float, Optional[str]]:
            n = norm(t)
            if not n:
                return 0.0, None
            best: Tuple[float, Optional[str]] = (0.0, None)
            for key, names in KITAS_KEYS.items():
                for name in names:
                    # Short labels (SEX) must match closely, long ones tolerate OCR noise
                    r = SequenceMatcher(None, n, name).ratio() if len(name) > 3 else (1.0 if n == name else 0.0)
                    if r > best[0]:
                        best = (r, key)
            return best

        def is_kitas_label(t: str) -> bool:
            return label_score(t)[0] >= 0.6 or any(w in norm(t) for w in HEADER_WORDS)

        # Best-matching box per label
        labels: Dict[str, Dict[str, Any]] = {}
        label_ratio: Dict[str, float] = {}
        for b in boxes_sorted:
            r, key = label_score(b.get("text", ""))
            if key and r >= 0.6 and r > label_ratio.get(key, 0.0):
                labels[key], label_ratio[key] = b, r

        def value_below(label: Dict[str, Any]) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
            h = max(label["y_max"] - label["y_min"], 8.0)
            right = label["x_max"] + 8 * h
            for other in labels.values():  # stop at the next label on the same row
                if other is not label and abs(other["y_min"] - label["y_min"]) < h and other["x_min"] > label["x_min"]:
                    right = min(right, other["x_min"] - 2)
            cands = [
                c for c in boxes_sorted
                if c is not label
                and c["y_min"] > label["y_min"] + 0.4 * h
                and c["y_min"] - label["y_max"] <= 1.6 * h + 4
                and label["x_min"] - h <= c["x_min"] < right
            ]
            cands.sort(key=lambda c: (c["y_min"], abs(c["x_min"] - label["x_min"])))
            for c in cands:
                txt = c.get("text", "").strip()
                if not txt:
                    continue
                if is_kitas_label(txt):
                    return None, None  # next label reached: the value is missing/unreadable
                return txt, c
            return None, None

        for key, label in labels.items():
            val, box = value_below(label)
            if not val:
                continue
            if key == "niora":
                token = val.replace(" ", "").upper()
                # The whole value when it looks like a NIORA; otherwise the part starting at an "I"/"1"
                m = re.fullmatch(r"([A-Z0-9]{10,13})", token) or re.search(r"([1I][A-Z0-9]{9,12})", token)
                if not m:
                    continue
                n = m.group(1)
                if n.startswith("I") and n[1].isdigit():
                    n = "1" + n[1:]
                kitas.niora = n
            elif key == "nama":
                kitas.nama = cls.segment_name(val)
            elif key == "kewarganegaraan":
                kitas.kewarganegaraan = val.upper()
            elif key in ("tanggal_lahir", "berlaku_hingga"):
                if not re.search(r"\d", val):
                    continue
                setattr(kitas, key, cls._clean_passport_date(val) or val)
            elif key == "jenis_kelamin":
                u_sex = norm(val)
                if u_sex in ("F", "P", "W", "FEMALE", "PEREMPUAN", "WANITA"):
                    kitas.jenis_kelamin = "Perempuan (F)"
                elif u_sex in ("M", "L", "MALE", "LAKILAKI", "PRIA"):
                    kitas.jenis_kelamin = "Laki-laki (M)"
                else:
                    continue
            elif key == "permit_number":
                m = re.search(r"\b([0-9][A-Z0-9]{8,11})\s*[-.]?\s*([A-Z0-9])\b", val.upper())
                if not m:
                    continue
                kitas.permit_number = f"{m.group(1)}-{m.group(2)}"
            box["field_mapping"] = key
        # Regex fallbacks if any fields were missed
        if not kitas.niora:
            for b in boxes_sorted:
                m = re.search(r'\b([1I][A-Z0-9]{9,12})\b', b.get("text", "").upper())
                if m and not any(k in m.group(1) for k in ["REPUBLIK", "INDONESIA", "KEMENTERIAN"]):
                    n = m.group(1)
                    if n.startswith("I") and n[1].isdigit(): n = "1" + n[1:]
                    kitas.niora = n
                    b["field_mapping"] = "niora"
                    break

        if not kitas.permit_number:
            for b in boxes_sorted:
                m = re.search(r'\b([0-9][A-Z0-9]{8,11})[-.]([A-Z0-9])\b', b.get("text", "").upper())
                if m:
                    p = f"{m.group(1)}-{m.group(2)}"
                    if p.endswith("-6"): p = p[:-2] + "-Q"
                    kitas.permit_number = p
                    b["field_mapping"] = "permit_number"
                    break

        if not kitas.berlaku_hingga:
            for b in boxes_sorted:
                m = re.search(r'\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b', b.get("text", ""))
                if m and m.group(1) != kitas.tanggal_lahir:
                    kitas.berlaku_hingga = m.group(1)
                    b["field_mapping"] = "berlaku_hingga"
                    break

        # Small or blurry photos lose the "Date of Birth" / "Nationality" / "Sex" labels (read as "004", ...) and
        # glue the sex letter to the date ("23-07-1972F"). Fall back to the date pattern and the row it sits on.
        if not kitas.tanggal_lahir:
            date_re = re.compile(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\s*([MFLP])?")
            for b in boxes_sorted:
                m = date_re.search(b.get("text", "").upper())
                if not m:
                    continue
                found = cls._clean_passport_date(f"{m.group(1)}-{m.group(2)}-{m.group(3)}")
                if found == kitas.berlaku_hingga:
                    continue  # the expiry date, not the birth date
                kitas.tanggal_lahir = found
                b["field_mapping"] = "tanggal_lahir"
                if m.group(4) and not kitas.jenis_kelamin:
                    kitas.jenis_kelamin = "Perempuan (F)" if m.group(4) in ("F", "P") else "Laki-laki (M)"
                if not kitas.kewarganegaraan:
                    row_h = max(b["y_max"] - b["y_min"], 6.0)
                    for n in boxes_sorted:
                        if (n is not b and re.fullmatch(r"[A-Z]{3}", n.get("text", "").strip())
                                and abs(n["y_min"] - b["y_min"]) < row_h and n["x_min"] < b["x_min"]):
                            kitas.kewarganegaraan = n["text"].strip()
                            n["field_mapping"] = "kewarganegaraan"
                            break
                break

        # Dynamic Custom Fields
        if custom_targets:
            field_synonyms = {
                "niora": kitas.niora,
                "nomor niora": kitas.niora,
                "no niora": kitas.niora,
                "nama": kitas.nama,
                "nama lengkap": kitas.nama,
                "full name": kitas.nama,
                "kewarganegaraan": kitas.kewarganegaraan,
                "nationality": kitas.kewarganegaraan,
                "tanggal lahir": kitas.tanggal_lahir,
                "tgl lahir": kitas.tanggal_lahir,
                "date of birth": kitas.tanggal_lahir,
                "dob": kitas.tanggal_lahir,
                "jenis kelamin": kitas.jenis_kelamin,
                "sex": kitas.jenis_kelamin,
                "gender": kitas.jenis_kelamin,
                "permit number": kitas.permit_number,
                "nomor permit": kitas.permit_number,
                "no permit": kitas.permit_number,
                "nomor izin": kitas.permit_number,
                "no izin": kitas.permit_number,
                "nomor izin tinggal": kitas.permit_number,
                "berlaku hingga": kitas.berlaku_hingga,
                "tanggal berakhir": kitas.berlaku_hingga,
                "date of expiry": kitas.berlaku_hingga,
                "expiry date": kitas.berlaku_hingga,
                "masa berlaku": kitas.berlaku_hingga,
                "instansi penerbit": kitas.instansi_penerbit
            }

            custom_res = {}
            for target in custom_targets:
                clean_target = target.strip().lower()
                matched = False
                for syn_k, syn_v in field_synonyms.items():
                    if clean_target == syn_k or syn_k in clean_target:
                        custom_res[target] = syn_v or "Tidak terdeteksi"
                        matched = True
                        break
                if not matched:
                    single_res = cls.extract_custom_targets(full_text, [target])
                    custom_res[target] = single_res.get(target, "Tidak terdeteksi")

            kitas.custom_fields = custom_res

        return kitas, boxes

    @classmethod
    def extract_generic(
        cls,
        text_or_boxes: Any,
        custom_targets: Optional[List[str]] = None
    ) -> Tuple[GenericSchema, List[Dict[str, Any]]]:
        generic = GenericSchema()
        boxes: List[Dict[str, Any]] = []

        if isinstance(text_or_boxes, list):
            boxes = text_or_boxes
            full_text = "\n".join([b.get("text", "") for b in boxes])
        else:
            full_text = str(text_or_boxes)

        generic.full_text = full_text
        insights = cls.extract_key_insights(full_text)
        generic.summary = insights["summary"]
        generic.key_points = insights["action_items"]
        generic.key_value_pairs = insights["key_value_pairs"]
        generic.detected_entities = {
            "dates": insights["detected_dates"],
            "amounts": insights["detected_amounts"],
            "emails": insights["contacts"]["emails"],
            "phones": insights["contacts"]["phones"]
        }

        lines = [line.strip() for line in full_text.splitlines() if line.strip()]
        if lines:
            generic.title = lines[0][:80]

        if custom_targets:
            generic.custom_fields = cls.extract_custom_targets(full_text, custom_targets)

        return generic, boxes
