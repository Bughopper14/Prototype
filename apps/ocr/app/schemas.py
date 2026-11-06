"""Result containers filled in by app.services.extractor.

Every model accepts extra attributes, so the extractor can attach additional keys without breaking.
Declared fields default to None / empty so `model_dump()` always returns a stable shape.
"""
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DocumentType(str, Enum):
    INVOICE = "invoice"
    KTP = "ktp"
    NPWP = "npwp"
    PASSPORT = "passport"
    KITAS = "kitas"
    RECEIPT = "receipt"
    CONTRACT = "contract"
    PRESENTATION = "presentation"
    GENERIC = "generic"


class _Base(BaseModel):
    model_config = ConfigDict(extra="allow")
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class KTPSchema(_Base):
    nik: Optional[str] = None
    nama: Optional[str] = None
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    tempat_tanggal_lahir: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    golongan_darah: Optional[str] = None
    alamat: Optional[str] = None
    rt_rw: Optional[str] = None
    kel_desa: Optional[str] = None
    kecamatan: Optional[str] = None
    agama: Optional[str] = None
    status_perkawinan: Optional[str] = None
    pekerjaan: Optional[str] = None
    kewarganegaraan: Optional[str] = None
    berlaku_hingga: Optional[str] = None


class NPWPSchema(_Base):
    npwp_number: Optional[str] = None
    raw_npwp: Optional[str] = None
    nama: Optional[str] = None
    nik: Optional[str] = None
    alamat: Optional[str] = None
    kelurahan_kecamatan: Optional[str] = None
    kota_provinsi: Optional[str] = None
    kpp: Optional[str] = None
    tanggal_terdaftar: Optional[str] = None


class PassportSchema(_Base):
    passport_number: Optional[str] = None
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    nama: Optional[str] = None
    nama_native: Optional[str] = None
    surname: Optional[str] = None
    given_names: Optional[str] = None
    nationality: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    tempat_lahir: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    tanggal_pengeluaran: Optional[str] = None
    tanggal_berlaku: Optional[str] = None
    kantor_penerbit: Optional[str] = None
    personal_id: Optional[str] = None


class KitasSchema(_Base):
    niora: Optional[str] = None
    permit_number: Optional[str] = None
    nama: Optional[str] = None
    kewarganegaraan: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    berlaku_hingga: Optional[str] = None
    instansi_penerbit: Optional[str] = None
    alamat: Optional[str] = None


class InvoiceItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    description: Optional[str] = None
    quantity: Optional[Any] = None
    unit_price: Optional[Any] = None
    total_price: Optional[Any] = None
    confidence: Optional[float] = None


class InvoiceSchema(_Base):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    recipient_name: Optional[str] = None
    items: List[InvoiceItem] = Field(default_factory=list)
    subtotal: Optional[Any] = None
    tax_rate: Optional[Any] = None
    tax_amount: Optional[Any] = None
    grand_total: Optional[Any] = None
    payment_info: Optional[str] = None


class ReceiptSchema(_Base):
    pass


class ContractSchema(_Base):
    title: Optional[str] = None
    contract_number: Optional[str] = None
    first_party: Optional[str] = None
    second_party: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    contract_value: Optional[Any] = None
    summary: Optional[str] = None
    key_clauses: List[Any] = Field(default_factory=list)


class PresentationSchema(_Base):
    title: Optional[str] = None
    total_slides: Optional[int] = None
    slide_titles: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    key_takeaways: List[Any] = Field(default_factory=list)
    action_items: List[Any] = Field(default_factory=list)


class GenericSchema(_Base):
    title: Optional[str] = None
    full_text: Optional[str] = None
    summary: Optional[str] = None
    key_points: List[Any] = Field(default_factory=list)
    key_value_pairs: Any = Field(default_factory=dict)
    detected_entities: Any = Field(default_factory=dict)
