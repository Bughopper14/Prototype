/** Form dialog shell (title, fields, save / cancel). */
import {type FormEvent, type ReactNode} from 'react';

export function Dialog({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
  children: ReactNode;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };
  return (
    <div className="pt-modal-backdrop" onClick={onClose}>
      <form className="pt-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="pt-modal-bar" />
        <div className="pt-modal-head">
          <div className="pt-modal-title">
            <h5>{title}</h5>
          </div>
          <button type="button" className="pt-modal-close" aria-label="Close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="pt-modal-body">{children}</div>
        <div className="pt-modal-foot">
          <button type="button" className="pt-btn-light" onClick={onClose}>
            Batal
          </button>
          <button className="pt-btn-primary">Simpan</button>
        </div>
      </form>
    </div>
  );
}
