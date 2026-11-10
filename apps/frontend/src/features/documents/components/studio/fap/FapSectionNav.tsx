/** FAP view: section navigation bar shared by both panes. */
import {Files} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function FapSectionNav() {
  const {fapNavFilter, scrollToFapSection} = useDocumentsStudioContext();
  return (
    <div className="fap-unified-section-nav">
      <div className="fap-nav-left">
        <span className="fap-nav-label">
          <Files size={14} color="#002060" /> Form Navigation:
        </span>
        <button
          type="button"
          className={fapNavFilter === 'all' ? 'active' : ''}
          onClick={() => scrollToFapSection('all')}
        >
          All Sections
        </button>
        <button
          type="button"
          className={fapNavFilter === 'fap-preview-sec-header' ? 'active' : ''}
          onClick={() => scrollToFapSection('fap-preview-sec-header')}
        >
          1. Identity
        </button>
        <button
          type="button"
          className={fapNavFilter === 'fap-preview-sec-company' ? 'active' : ''}
          onClick={() => scrollToFapSection('fap-preview-sec-company')}
        >
          2. Domicile
        </button>
        <button
          type="button"
          className={fapNavFilter === 'fap-preview-sec-business' ? 'active' : ''}
          onClick={() => scrollToFapSection('fap-preview-sec-business')}
        >
          3. Profile
        </button>
        <button
          type="button"
          className={fapNavFilter === 'fap-preview-sec-pic' ? 'active' : ''}
          onClick={() => scrollToFapSection('fap-preview-sec-pic')}
        >
          4. PIC
        </button>
        {[
          ['fap-preview-sec-purpose-assets', '5. Purpose & Assets'],
          ['fap-preview-sec-projects', '6. Projects'],
          ['fap-preview-sec-banks', '7. References'],
          ['fap-preview-sec-proposal', '8. Financing Proposal'],
          ['fap-preview-sec-financial', '9. Financial Statements'],
        ].map(([id, title]) => (
          <button
            key={id}
            type="button"
            className={fapNavFilter === id ? 'active' : ''}
            onClick={() => scrollToFapSection(id)}
          >
            {title}
          </button>
        ))}
      </div>
    </div>
  );
}
