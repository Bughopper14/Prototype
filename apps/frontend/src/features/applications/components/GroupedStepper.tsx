/** The stages of a workflow as a chevron stepper, with the name of each group above its stages (stages of a group sit side by side). */
import type {ReactNode} from 'react';

export type StageGroup = {code: string; name: string; stageCodes: string[]};

export function GroupedStepper({
  stages,
  groups,
  step,
}: {
  stages: {value: string; name: string}[];
  groups?: StageGroup[];
  /** One chevron; `first` is true for the very first stage. */
  step: (stage: {value: string; name: string}, first: boolean) => ReactNode;
}) {
  const known = new Set((groups || []).flatMap(g => g.stageCodes));
  const blocks = (groups || [])
    .map(g => ({code: g.code, name: g.name, items: stages.filter(s => g.stageCodes.includes(s.value))}))
    .filter(b => b.items.length);
  const loose = stages.filter(s => !known.has(s.value));
  if (loose.length) blocks.push({code: '', name: '', items: loose});
  let index = 0;
  return (
    <div className="stage-groups">
      {blocks.map(b => (
        <div key={b.code || 'other'} className="stage-group" style={{flex: b.items.length}}>
          <div className="stage-group-label">
            <span>{b.name}</span>
          </div>
          <div className="chevron-stepper">{b.items.map(s => step(s, index++ === 0))}</div>
        </div>
      ))}
    </div>
  );
}
