"""Document type auto-detection and generic fallback extractor."""
import re
from typing import Any, Dict, List, Optional, Tuple
from app.schemas import DocumentType, GenericSchema
from extractors.shared import extract_custom_targets, extract_key_insights

def detect_document_type(text_or_boxes: Any, filename: str = "") -> DocumentType:
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



def extract_generic(
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
    insights = extract_key_insights(full_text)
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
        generic.custom_fields = extract_custom_targets(full_text, custom_targets)

    return generic, boxes
