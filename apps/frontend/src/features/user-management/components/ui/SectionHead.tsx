/** Heading of a section of the admin console, with an optional extra and action. */
import type {ReactNode} from 'react';

export function SectionHead({
  icon,
  color,
  title,
  extra,
  action,
}: {
  icon: string;
  color: string;
  title: string;
  extra?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="um-section-head">
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <h5>
          <i className={`fas ${icon}`} style={{color}} />
          {title}
        </h5>
        {extra}
      </div>
      {action}
    </div>
  );
}
