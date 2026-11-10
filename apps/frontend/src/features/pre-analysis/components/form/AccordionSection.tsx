import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import {ChevronDown} from 'lucide-react';
import type {CSSProperties, ReactNode} from 'react';

/**
 * One numbered, collapsible card of the Pre-Analysis form. Its content is only rendered while the card is open.
 * `highlight` is the darker variant used by the last section (the conclusion).
 */
export function AccordionSection({
  id,
  step,
  title,
  highlight = false,
  contentStyle,
  children,
}: {
  id: string;
  step: string;
  title: string;
  highlight?: boolean;
  contentStyle: CSSProperties;
  children: ReactNode;
}) {
  const {openSections, toggleSection} = usePreAnalysisContext();
  const open = openSections[id];
  return (
    <div
      id={`acc-${id}`}
      className="fap-accordion-card"
      style={{
        background: '#ffffff',
        border: highlight ? '2px solid #1e3a8a' : '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        className="fap-accordion-header"
        onClick={() => toggleSection(id)}
        style={{
          padding: '10px 14px',
          background: highlight ? '#eff6ff' : '#f8fafc',
          borderBottom: open ? `1px solid ${highlight ? '#bfdbfe' : '#e2e8f0'}` : 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span
            className="badge-chip"
            style={{
              background: highlight ? '#1e3a8a' : '#dbeafe',
              color: highlight ? '#ffffff' : '#1e40af',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {step}
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>{title}</span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${open ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {open && (
        <div className="fap-accordion-content" style={contentStyle}>
          {children}
        </div>
      )}
    </div>
  );
}
