/** Row action menu of a deed (edit, review, stakeholders, delete…). */
import {Eye, Pencil, Trash2} from 'lucide-react';
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
                // Only offer what this user can do now: a locked deed can only be viewed, and an approved one is never deleted.
                const canEdit = !locked(target);
                const canDelete = canEdit && !target.approvedSnapshot;
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
                      {canEdit ? <Pencil size={15} /> : <Eye size={15} />}
                      {canEdit ? 'Edit' : 'View details'}
                    </button>
                    {canDelete && (
                      <button
                        role="menuitem"
                        className="legal-delete-button"
                        onClick={() => {
                          setDeleting(target);
                          setActionMenu(null);
                        }}
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    )}
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
