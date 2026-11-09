/** List of Fields blocks with add / remove / paging (directors, shareholders, PICs…). */
import {blank, toTitleCase, type Field} from '@liugong/shared';
import {ChevronLeft, ChevronRight, Plus, Trash2} from 'lucide-react';
import {useState} from 'react';
import {Fields} from './Fields';

export function Repeater({
  title,
  fields,
  rows,
  onChange,
  disabled = false,
  description,
  carousel = false,
  section,
  onFieldFocus,
  onFieldSync,
  activeFieldKey,
}: {
  title: string;
  fields: Field[];
  rows: any[];
  onChange: (v: any[]) => void;
  disabled?: boolean;
  description?: string;
  carousel?: boolean;
  section?: string;
  onFieldFocus?: (k: string, section?: string) => void;
  onFieldSync?: (k: string, section?: string) => void;
  activeFieldKey?: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, Math.max(rows.length - 1, 0));
  const addRow = () => {
    onChange([...rows, blank(fields)]);
    setActiveIndex(rows.length);
  };
  const removeRow = (index: number) => {
    onChange(rows.filter((_, j) => j !== index));
    setActiveIndex(Math.min(currentIndex, Math.max(rows.length - 2, 0)));
  };
  return (
    <>
      <div className="section-title">
        <div>
          <h3>{toTitleCase(title)}</h3>
          {description && <p className="muted repeater-description">{description}</p>}
        </div>
        {!disabled && (
          <button className="button small" onClick={addRow}>
            <Plus size={15} />
            Add {title.toLowerCase() === 'equipment units' ? 'unit' : 'row'}
          </button>
        )}
      </div>
      {carousel && rows.length > 0 && (
        <div className="repeater-carousel-controls">
          <button
            className="button small"
            disabled={currentIndex === 0}
            onClick={() => setActiveIndex(i => Math.max(i - 1, 0))}
          >
            <ChevronLeft size={15} />
            Previous
          </button>
          <span>
            {currentIndex + 1} of {rows.length}
          </span>
          <button
            className="button small"
            disabled={currentIndex >= rows.length - 1}
            onClick={() => setActiveIndex(i => Math.min(i + 1, rows.length - 1))}
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      )}
      {rows.length === 0 && <div className="empty-small">No entries yet.</div>}
      {(carousel ? rows.slice(currentIndex, currentIndex + 1) : rows).map((r, i) => {
        const rowIndex = carousel ? currentIndex : i;
        return (
          <div className="repeat" key={rowIndex}>
            <div className="repeat-top">
              <span>
                {toTitleCase(title)} / {String(rowIndex + 1).padStart(2, '0')}
              </span>
              {!disabled && (
                <button
                  className="icon-button danger"
                  aria-label="Remove row"
                  onClick={() => removeRow(rowIndex)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <Fields
              fields={fields}
              value={r}
              disabled={disabled}
              section={section || title.toLowerCase()}
              onFieldFocus={onFieldFocus}
              onFieldSync={onFieldSync}
              activeFieldKey={activeFieldKey}
              onChange={v => onChange(rows.map((x, j) => (rowIndex === j ? v : x)))}
            />
          </div>
        );
      })}
    </>
  );
}
