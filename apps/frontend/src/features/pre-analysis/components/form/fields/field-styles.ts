/** Styles shared by the text fields of the Pre-Analysis form (kept as written so the rendered markup stays the same). */
import type {CSSProperties} from 'react';

/** Label above a field. */
export const LABEL_PLAIN: CSSProperties = {fontSize: '0.75rem', fontWeight: 600, color: '#475569'};
export const LABEL_BLOCK: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
  display: 'block',
  marginBottom: '4px',
};
export const LABEL_INLINE_FLEX: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
  display: 'inline-flex',
  alignItems: 'center',
  marginBottom: '4px',
};
export const LABEL_SMALL: CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 600,
  color: '#64748b',
  display: 'block',
  marginBottom: '2px',
};
export const LABEL_COMPACT: CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#475569',
  display: 'block',
  marginBottom: '3px',
};

/** The input itself. */
export const INPUT_BASE: CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: '0.8rem',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
};
export const INPUT_BASE_WHITE: CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: '0.8rem',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#1e293b',
};
export const INPUT_COMPACT: CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  fontSize: '0.75rem',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
};
