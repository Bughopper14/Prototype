/** Delivery status and delivery date. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';

export function DeliveryStatusFields() {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
      <TextField name="deliveryStatus" label="Delivery Status" />
      <TextField name="deliveryDate" label="Delivery Date" />
    </div>
  );
}
