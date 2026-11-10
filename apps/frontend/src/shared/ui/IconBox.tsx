/** Square icon holder used in cards and headings. */
import {type ReactNode} from 'react';

export function IconBox({children}: {children: ReactNode}) {
  return <span className="iconbox">{children}</span>;
}
