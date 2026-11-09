/** Small pills used in the mandatory-rules table: stage, section and mandatory status. */
import {sectionBadgeStyle} from '../../lib/mandatory-rules';

const STAGE_PILL = {
  pre: {
    color: '#92400e',
    background: '#fef3c7',
    border: '#fde68a',
    shadow: 'rgba(180, 83, 9, 0.06)',
    dot: '#d97706',
  },
  fap: {
    color: '#1d4ed8',
    background: '#eff6ff',
    border: '#bfdbfe',
    shadow: 'rgba(29, 78, 216, 0.06)',
    dot: '#2563eb',
  },
};

export function StageBadge({isPre}: {isPre: boolean}) {
  const c = isPre ? STAGE_PILL.pre : STAGE_PILL.fap;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10.5,
        fontWeight: 700,
        color: c.color,
        background: c.background,
        border: `1px solid ${c.border}`,
        padding: '3px 8px',
        borderRadius: 9999,
        letterSpacing: '0.02em',
        boxShadow: `0 1px 2px ${c.shadow}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: c.dot,
          display: 'inline-block',
        }}
      />
      {isPre ? 'PRE-AN' : 'FAP'}
    </span>
  );
}

export function SectionBadge({section, stage}: {section: string; stage: string}) {
  const st = sectionBadgeStyle(section, stage);
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1.35,
        color: st.color,
        background: st.bg,
        border: `1px solid ${st.border}`,
        padding: '4px 9px',
        borderRadius: 5,
        display: 'inline-block',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        maxWidth: 250,
      }}
    >
      {section}
    </span>
  );
}

export function MandatoryStatusBadge({mandatory}: {mandatory: boolean}) {
  return mandatory ? (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        color: '#b91c1c',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        padding: '3px 9px',
        borderRadius: 9999,
      }}
    >
      * Mandatory (1)
    </span>
  ) : (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        color: '#64748b',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        padding: '3px 9px',
        borderRadius: 9999,
      }}
    >
      Optional (0)
    </span>
  );
}
