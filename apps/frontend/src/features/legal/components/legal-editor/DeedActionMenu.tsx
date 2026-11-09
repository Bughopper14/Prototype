/** Row action menu of a deed (edit, review, stakeholders, delete…). */
import {Pencil, Trash2} from 'lucide-react';
import {createPortal} from 'react-dom';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function DeedActionMenu() {
  const {actionMenu, setActionMenu, setEditing, setDeleting, deeds, locked, rowsFor} =
    useLegalEditorContext();
  return (
    <>
      {actionMenu &&
        createPortal(
          <div
            className="legal-menu-layer"
            onClick={() => setActionMenu(null)}
            onKeyDown={e => {
              if (e.key === 'Escape') setActionMenu(null);
            }}
          >
            <div
              className="legal-action-menu"
              role="menu"
              aria-label="Deed action"
              style={{left: actionMenu.left, top: actionMenu.top}}
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const target = deeds.find(x => x.id === actionMenu.id);
                if (!target) return null;
                return (
                  <>
                    <button
                      role="menuitem"
                      autoFocus
                      onClick={() => {
                        setEditing({...structuredClone(target), stakeholders: rowsFor(target)});
                        setActionMenu(null);
                      }}
                    >
                      <Pencil size={15} />
                      {locked(target) ? 'View details' : 'Edit'}
                    </button>
                    <button
                      role="menuitem"
                      className="legal-delete-button"
                      disabled={locked(target) || !!target.approvedSnapshot}
                      title={target.approvedSnapshot ? 'Approved deeds cannot be deleted' : undefined}
                      onClick={() => {
                        setDeleting(target);
                        setActionMenu(null);
                      }}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
