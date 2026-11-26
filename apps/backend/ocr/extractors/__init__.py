"""Per-document OCR extractors."""
from extractors.fap_template_align import extract_fap_aligned
from extractors.generic import detect_document_type, extract_generic
from extractors.kitas import extract_kitas
from extractors.ktp import extract_ktp
from extractors.nib import extract_nib
from extractors.npwp import extract_npwp
from extractors.passport import extract_passport
from extractors.shared import TesseractEngine

__all__ = [
    "TesseractEngine",
    "detect_document_type",
    "extract_fap_aligned",
    "extract_generic",
    "extract_kitas",
    "extract_ktp",
    "extract_nib",
    "extract_npwp",
    "extract_passport",
]
