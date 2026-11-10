/** KTP / passport / NPWP / KITAS tabs of the document pane. */

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function DocTypeTabs() {
  const {docType, allowedDocTypes, handleSelectDocTypeTab, docAssets} = useStakeholderModalContext();
  return (
    <div className="doc-type-tabs">
      {allowedDocTypes.map(t => {
        const hasDoc = Boolean(docAssets[t].url);
        return (
          <button
            type="button"
            key={t}
            className={`doc-type-tab ${docType === t ? 'active' : ''}`}
            onClick={() => handleSelectDocTypeTab(t)}
          >
            {hasDoc && <span className="doc-type-tab-indicator" title="File uploaded" />}
            {t === 'KTP' ? 'e-KTP' : t === 'PASSPORT' ? 'Passport' : t === 'NPWP' ? 'NPWP' : 'KITAS'}
          </button>
        );
      })}
    </div>
  );
}
