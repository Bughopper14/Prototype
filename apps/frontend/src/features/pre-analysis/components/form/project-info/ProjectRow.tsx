/** One project (name, location, scope) under a head project. */
import {Trash2} from 'lucide-react';
import type {PreAnalysisProjectItem} from '@/features/pre-analysis/lib/types';

export function ProjectRow({
  item,
  pIdx,
  projects,
  handleRemoveProject,
  handleUpdateProject,
  onFocus,
  gIdx,
}: {
  item: PreAnalysisProjectItem;
  pIdx: number;
  projects: PreAnalysisProjectItem[];
  handleRemoveProject: (gIdx: number, pIdx: number) => void;
  handleUpdateProject: (gIdx: number, pIdx: number, key: keyof PreAnalysisProjectItem, val: string) => void;
  onFocus: (() => void) | undefined;
  gIdx: number;
}) {
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: '0.7rem', fontWeight: 700, color: '#475569'}}>#{pIdx + 1}</span>
        {projects.length > 1 && (
          <button
            type="button"
            onClick={() => handleRemoveProject(gIdx, pIdx)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.68rem',
            }}
            title="Delete this project item"
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        )}
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
        <div>
          <label
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#64748b',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Project Name
          </label>
          <input
            type="text"
            value={item.projectName || ''}
            onChange={e => handleUpdateProject(gIdx, pIdx, 'projectName', e.target.value)}
            onFocus={onFocus}
            onClick={onFocus}
            style={{
              width: '100%',
              padding: '5px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#64748b',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Location
          </label>
          <input
            type="text"
            value={item.location || ''}
            onChange={e => handleUpdateProject(gIdx, pIdx, 'location', e.target.value)}
            onFocus={onFocus}
            onClick={onFocus}
            style={{
              width: '100%',
              padding: '5px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
            }}
          />
        </div>
      </div>

      <div>
        <label
          style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            color: '#64748b',
            display: 'block',
            marginBottom: '2px',
          }}
        >
          Scope
        </label>
        <input
          type="text"
          value={item.scope || ''}
          onChange={e => handleUpdateProject(gIdx, pIdx, 'scope', e.target.value)}
          onFocus={onFocus}
          onClick={onFocus}
          style={{
            width: '100%',
            padding: '5px 8px',
            fontSize: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
          }}
        />
      </div>
    </div>
  );
}
