/** The primary "add" button of a section head. */
export const AddButton = ({label, onClick}: {label: string; onClick: () => void}) => (
  <button type="button" className="um-btn primary" onClick={onClick}>
    <i className="fas fa-plus" /> {label}
  </button>
);
