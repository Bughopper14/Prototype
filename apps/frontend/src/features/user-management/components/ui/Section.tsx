/** Titled card used by each user-management tab. */
import {type ReactNode} from 'react';

export function Section({title, action, children}: {title: string; action?: ReactNode; children: ReactNode}) {
  return (
    <section className="pt-panel">
      <div className="pt-panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="pt-table-wrap">{children}</div>
    </section>
  );
}
