import {Minus, Plus} from 'lucide-react';

/** A small − 1 + control for an order number (the same order runs together). */
export function Stepper({value, onChange, disabled, label}: {value: number; onChange: (v: number) => void; disabled: boolean; label: string}) {
  return (
    <span className="wf-stepper" title={label}>
      <button type="button" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} aria-label="Earlier">
        <Minus size={16} />
      </button>
      <b>{value}</b>
      <button type="button" disabled={disabled} onClick={() => onChange(value + 1)} aria-label="Later">
        <Plus size={16} />
      </button>
    </span>
  );
}
