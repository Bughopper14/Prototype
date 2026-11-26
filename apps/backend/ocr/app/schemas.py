"""Result schemas for document extractors (NPWP, Passport, KITAS, Generic).

Every model accepts extra attributes, so extractors can attach additional keys without breaking.
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


class GenericSchema(_Base):
    title: Optional[str] = None
    full_text: Optional[str] = None
    summary: Optional[str] = None
    key_points: List[Any] = Field(default_factory=list)
    key_value_pairs: Any = Field(default_factory=dict)
    detected_entities: Any = Field(default_factory=dict)
