/** Right half: editable fields read from the NIB. */
import {NibIssueDateField} from '@/features/ocr/components/nib-modal/fields/NibIssueDateField';
import {NibContactFields} from '@/features/ocr/components/nib-modal/fields/NibContactFields';
import {NibRegionFields} from '@/features/ocr/components/nib-modal/fields/NibRegionFields';
import {NibAddressField} from '@/features/ocr/components/nib-modal/fields/NibAddressField';
import {NibCompanyNameField} from '@/features/ocr/components/nib-modal/fields/NibCompanyNameField';
import {NibNumberField} from '@/features/ocr/components/nib-modal/fields/NibNumberField';

export function NibExtractedFields() {
  return (
    <div
      style={{
        flex: '1 1 0',
        overflowY: 'auto',
        paddingRight: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
      }}
    >
      {/* FIELD 1: NIB NUMBER */}
      <NibNumberField />

      {/* FIELD 2: COMPANY NAME */}
      <NibCompanyNameField />

      {/* FIELD 3: DOMICILE ADDRESS */}
      <NibAddressField />

      {/* ADMINISTRATIVE REGIONS (ALL IN ENGLISH, CLEAN 2-COLUMN GRID) */}
      <NibRegionFields />

      {/* FIELD: EMAIL & PHONE NUMBER */}
      <NibContactFields />

      {/* FIELD: TANGGAL TERBIT NIB */}
      <NibIssueDateField />
    </div>
  );
}
