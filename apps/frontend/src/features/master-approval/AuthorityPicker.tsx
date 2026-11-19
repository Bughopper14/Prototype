/**
 * Choose ONE authority: a field that opens a list under it with a search box (type a part of the name or of the description). The list has
 * its own scroll and a limited height, so it never takes the whole screen like a native select with 70 options. There is no "choose..."
 * entry in the list: the empty state is the placeholder of the field.
 */
import {Check, ChevronDown, Search} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {AuthorityChoice} from './api';

export function AuthorityPicker({value, options, taken, onChange}: {value: string; options: AuthorityChoice[]; /** names that cannot be chosen again here (already in the same step) */ taken: string[]; onChange: (name: string) => void}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const list = useMemo(() => {
    const text = q.trim().toLowerCase();
    return options.filter(o => !taken.includes(o.name) || o.name === value).filter(o => !text || `${o.name} ${o.description}`.toLowerCase().includes(text));
  }, [options, taken, value, q]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="ma-picker" ref={box}>
      <button type="button" className={`ma-picker-field ${value ? '' : 'empty'}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{value || 'Choose who approves…'}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="ma-picker-panel">
          <label className="ma-picker-search">
            <Search size={15} />
            <input ref={search} value={q} onChange={e => setQ(e.target.value)} placeholder="Type to search, for example BS, DEED, ICLF" aria-label="Search authorities" />
          </label>
          <ul role="listbox" className="ma-picker-list">
            {list.map(o => (
              <li key={o.name}>
                <button type="button" role="option" aria-selected={o.name === value} className={o.name === value ? 'on' : ''} onClick={() => pick(o.name)}>
                  <span>
                    <b>{o.name}</b>
                    {o.description && <small>{o.description}</small>}
                  </span>
                  {o.name === value && <Check size={15} />}
                </button>
              </li>
            ))}
            {!list.length && <li className="ma-picker-none">Nothing matches "{q}".</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
