/** Repeating row collection: grid on large screens, one-row-at-a-time carousel on compact ones. */
import {Fields} from '@/shared/ui/Fields';
import {blank, type Field} from '@liugong/shared';
import {ChevronLeft, ChevronRight, Plus, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';

export function Repeater({
  title,
  description,
  fields,
  rows,
  onChange,
  disabled = false,
  carousel = false,
  section,
  onFieldFocus,
  onFieldSync,
  activeFieldKey,
  /** Row the FAP preview points at (clicking a row in the sheet turns the carousel to it). */
  targetRowIndex,
  /** Called when the carousel turns, so the preview can highlight the same row. */
  onRowChange,
}: {
  title: string;
  description?: string;
  fields: Field[];
  rows: any[];
  onChange: (rows: any[]) => void;
  disabled?: boolean;
  carousel?: boolean;
  section?: string;
  onFieldFocus?: (k: string, section?: string) => void;
  onFieldSync?: (k: string, section?: string) => void;
  activeFieldKey?: string | null;
  /** Row the FAP preview points at (clicking a row in the sheet turns the carousel to it). */
  targetRowIndex?: number;
  /** Called when the carousel turns, so the preview can highlight the same row. */
  onRowChange?: (idx: number) => void;
}) {
  const singularTitle = title.replace(/ies$/i, 'y').replace(/s$/i, '');
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, Math.max(rows.length - 1, 0));
  // With row sync the field section carries the row index ("banks-2"); without it the plain section name.
  const rowSync = targetRowIndex !== undefined || onRowChange !== undefined;
  const rowSection = (idx: number) =>
    rowSync ? `${section || title.toLowerCase()}-${idx}` : section || title.toLowerCase();

  useEffect(() => {
    if (targetRowIndex !== undefined && targetRowIndex >= 0 && targetRowIndex < rows.length)
      setActiveIndex(targetRowIndex);
  }, [targetRowIndex, rows.length]);

  const focusRow = (idx: number) => {
    if (rowSync && onFieldFocus && fields.length > 0) onFieldFocus(fields[0].key, rowSection(idx));
  };
  const changeCarouselPage = (newIdx: number) => {
    const validIdx = Math.max(0, Math.min(newIdx, rows.length - 1));
    setActiveIndex(validIdx);
    onRowChange?.(validIdx);
    focusRow(validIdx);
  };
  const addRow = () => {
    onChange([...rows, blank(fields)]);
    if (carousel) {
      const nextIdx = rows.length;
      setActiveIndex(nextIdx);
      onRowChange?.(nextIdx);
      focusRow(nextIdx);
    }
  };
  const removeRow = (index: number) => {
    const nextRows = rows.filter((_, j) => j !== index);
    onChange(nextRows);
    if (carousel) {
      const nextIdx = Math.min(currentIndex, Math.max(nextRows.length - 1, 0));
      setActiveIndex(nextIdx);
      onRowChange?.(nextIdx);
      focusRow(nextIdx);
    }
  };
  const updateRow = (index: number, val: any) => {
    onChange(rows.map((r, j) => (j === index ? val : r)));
  };

  return (
    <div className="repeater">
      <div className="repeater-head">
        <div>
          <h4>{title}</h4>
          {description && <p>{description}</p>}
        </div>
        {!disabled && (
          <button type="button" className="button small secondary" onClick={addRow}>
            <Plus size={14} /> Add row
          </button>
        )}
      </div>
      {carousel ? (
        rows.length === 0 ? (
          <div className="repeater-empty">
            <p>No {title.toLowerCase()} added yet.</p>
            {!disabled && (
              <button type="button" className="button small primary" onClick={addRow}>
                <Plus size={14} /> Add first {singularTitle.toLowerCase()}
              </button>
            )}
          </div>
        ) : (
          <div className="repeater-carousel">
            <div className="carousel-nav">
              <button
                type="button"
                className="button small secondary carousel-nav-btn"
                disabled={currentIndex === 0}
                onClick={() => changeCarouselPage(currentIndex - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="carousel-indicator">
                <span className="carousel-title-label">
                  {singularTitle} #{currentIndex + 1}
                </span>
                {rows.length > 1 && (
                  <div className="carousel-dots">
                    {rows.map((_, i) => (
                      <span
                        key={i}
                        className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
                        onClick={() => changeCarouselPage(i)}
                        title={`Jump to row ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
                <span className="carousel-counter">
                  ({currentIndex + 1} of {rows.length})
                </span>
              </div>
              <button
                type="button"
                className="button small secondary carousel-nav-btn"
                disabled={currentIndex === rows.length - 1}
                onClick={() => changeCarouselPage(currentIndex + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
            <div className="repeat carousel-item active">
              <div className="repeat-head">
                <span className="row-number">
                  {singularTitle} #{currentIndex + 1}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => removeRow(currentIndex)}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <Fields
                fields={fields}
                value={rows[currentIndex]}
                disabled={disabled}
                onChange={val => updateRow(currentIndex, val)}
                section={rowSection(currentIndex)}
                onFieldFocus={onFieldFocus}
                activeFieldKey={activeFieldKey}
              />
            </div>
          </div>
        )
      ) : (
        <div className="repeater-rows">
          {rows.map((row, i) => (
            <div key={i} className="repeat">
              <div className="repeat-head">
                <span className="row-number">#{i + 1}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => removeRow(i)}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <Fields
                fields={fields}
                value={row}
                disabled={disabled}
                onChange={val => updateRow(i, val)}
                section={rowSection(i)}
                onFieldFocus={onFieldFocus}
                activeFieldKey={activeFieldKey}
              />
            </div>
          ))}
          {rows.length === 0 && <p className="muted">No {title.toLowerCase()} added yet.</p>}
        </div>
      )}
    </div>
  );
}
