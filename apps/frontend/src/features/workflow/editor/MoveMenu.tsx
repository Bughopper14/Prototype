/** "When does this run?": one button that says it in words (together with X / its own step) and opens a small panel to change it. */
import {ChevronDown, Zap} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {placementOptions, type Placement} from '../definition-ops';

type Item = {key: string; order: number; name: string};

export function MoveMenu({items, itemKey, noun, onPlace}: {items: Item[]; itemKey: string; noun: 'group' | 'stage'; onPlace: (to: Placement) => void}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const options = placementOptions(items, itemKey);
  if (!options.length) return null;
  const me = items.find(i => i.key === itemKey);
  const mates = items.filter(i => me && i.order === me.order && i.key !== itemKey);
  const stepNo = me ? [...new Set(items.map(i => i.order))].sort((a, b) => a - b).indexOf(me.order) + 1 : 0;
  const together = options.filter(o => o.group === 'together');
  const alone = options.filter(o => o.group === 'alone');
  const pick = (o: (typeof options)[number]) => {
    setOpen(false);
    onPlace(o.to);
  };

  return (
    <div className="wf-when" ref={box}>
      <button type="button" className={`wf-when-btn ${mates.length ? 'together' : ''}`} aria-haspopup="menu" aria-expanded={open} aria-label={`When this ${noun} runs`} onClick={() => setOpen(v => !v)}>
        {mates.length ? (
          <>
            <Zap size={14} />
            <span>Together with {mates.map(m => m.name).join(' + ')}</span>
          </>
        ) : (
          <span>
            Step {stepNo} · on its own
          </span>
        )}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="wf-when-pop" role="menu">
          {together.length > 0 && <div className="wf-when-title">Run at the same time as</div>}
          {together.map(o => (
            <button key={o.label} type="button" role="menuitem" className="wf-when-item" onClick={() => pick(o)}>
              <Zap size={13} /> {o.label}
            </button>
          ))}
          {alone.length > 0 && <div className="wf-when-title">Run on its own</div>}
          {alone.map(o => (
            <button key={o.label} type="button" role="menuitem" className="wf-when-item" onClick={() => pick(o)}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
