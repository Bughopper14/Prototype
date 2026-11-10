/** List of Fields blocks with add / remove / paging (directors, shareholders, PICs…). */
import {blank, toTitleCase, type Field} from '@liugong/shared';
import {ChevronLeft, ChevronRight, Plus, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';
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
  targetRowIndex,
  onRowChange,
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
  /** Row the FAP preview points at (clicking a row in the sheet turns the carousel to it). */
  targetRowIndex?: number;
  /** Called when the carousel turns, so the preview can highlight the same row. */
  onRowChange?: (idx: number) => void;
}) {
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
    setActiveIndex(rows.length);
    onRowChange?.(rows.length);
    focusRow(rows.length);
  };
  const removeRow = (index: number) => {
    onChange(rows.filter((_, j) => j !== index));
    const nextIdx = Math.min(currentIndex, Math.max(rows.length - 2, 0));
    setActiveIndex(nextIdx);
    onRowChange?.(nextIdx);
  };
  return (
    <>
      <div className="section-title">
        <div>
          <h3>{toTitleCase(title)}</h3>
          {description && <p className="muted repeater-description">{description}</p>}
        </div>
        {!disabled && (
          <button type="button" className="button small" onClick={addRow}>
            <Plus size={15} />
            Add {title.toLowerCase() === 'equipment units' ? 'unit' : 'row'}
          </button>
        )}
      </div>
      {carousel && rows.length > 0 && (
        <div className="repeater-carousel-controls">
          <button
            type="button"
            className="button small"
            disabled={currentIndex === 0}
            onClick={() => changeCarouselPage(currentIndex - 1)}
          >
            <ChevronLeft size={15} />
            Previous
          </button>
          <span>
            {currentIndex + 1} of {rows.length}
          </span>
          <button
            type="button"
            className="button small"
            disabled={currentIndex >= rows.length - 1}
            onClick={() => changeCarouselPage(currentIndex + 1)}
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      )}
      {rows.length === 0 && <div className="empty-small">No entries yet.</div>}
      {(carousel ? rows.slice(currentIndex, currentIndex + 1) : rows).map((r, i) => {
        const rowIndex = carousel ? currentIndex : i;
        const secCtx = rowSection(rowIndex);
        return (
          <div className="repeat" key={rowIndex} data-section={secCtx} onClick={() => focusRow(rowIndex)}>
            <div className="repeat-top">
              <span>
                {toTitleCase(title)} / {String(rowIndex + 1).padStart(2, '0')}
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label="Remove row"
                  onClick={e => {
                    e.stopPropagation();
                    removeRow(rowIndex);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <Fields
              fields={fields}
              value={r}
              disabled={disabled}
              section={secCtx}
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
