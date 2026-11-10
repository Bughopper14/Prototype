/** Lead source, customer area and the dealer, LMI, LFI and customer contacts. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';
import {
  INPUT_BASE_WHITE,
  LABEL_BLOCK,
  LABEL_INLINE_FLEX,
} from '@/features/pre-analysis/components/form/fields/field-styles';

export function LeadAndContactFields() {
  return (
    <>
      <TextField
        name="leadSource"
        label="Lead Source"
        labelStyle={LABEL_BLOCK}
        required={['leadSource', 'General Information']}
      />
      <TextField
        name="customerArea"
        label="Customer Area"
        labelStyle={LABEL_BLOCK}
        inputStyle={INPUT_BASE_WHITE}
        emptyIfMissing
      />
      <TextField
        name="dealerPic"
        label="Dealer PIC"
        labelStyle={LABEL_INLINE_FLEX}
        required={['dealerPic', 'General Information']}
      />
      <TextField
        name="lmiPic"
        label="LMI PIC"
        labelStyle={LABEL_INLINE_FLEX}
        required={['lmiPic', 'General Information']}
      />
      <TextField
        name="lfiPic"
        label="LFI PIC"
        labelStyle={LABEL_INLINE_FLEX}
        required={['lfiPic', 'General Information']}
      />
      <TextField
        name="customerPic"
        label="Customer PIC"
        labelStyle={LABEL_INLINE_FLEX}
        required={['customerPic', 'General Information']}
      />
    </>
  );
}
