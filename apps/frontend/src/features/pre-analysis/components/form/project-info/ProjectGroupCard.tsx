/** One head project: its title bar with add / delete, and the list of its projects. */
import {ProjectRow} from '@/features/pre-analysis/components/form/project-info/ProjectRow';
import {Plus, Trash2} from 'lucide-react';
import type {PreAnalysisProjectGroup, PreAnalysisProjectItem} from '@/features/pre-analysis/lib/types';

export function ProjectGroupCard({
  group,
  gIdx,
  handleAddProject,
  currentGroups,
  handleRemoveGroup,
  handleUpdateHeadName,
  onFocus,
  handleRemoveProject,
  handleUpdateProject,
}: {
  group: PreAnalysisProjectGroup;
  gIdx: number;
  handleAddProject: (gIdx: number) => void;
  currentGroups: PreAnalysisProjectGroup[];
  handleRemoveGroup: (gIdx: number) => void;
  handleUpdateHeadName: (gIdx: number, val: string) => void;
  onFocus: (() => void) | undefined;
  handleRemoveProject: (gIdx: number, pIdx: number) => void;
  handleUpdateProject: (gIdx: number, pIdx: number, key: keyof PreAnalysisProjectItem, val: string) => void;
}) {
  const letter = String.fromCharCode(65 + gIdx);

  const projects =
    group.projects && group.projects.length > 0
      ? group.projects
      : [{projectName: '', location: '', scope: ''}];

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* HEAD PROJECT HEADER: Badge, Title, Add Project Button, and Delete Button */}
      <div style={{borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px'}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#1e3a8a',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {letter}
            </span>
            <label style={{fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', margin: 0}}>
              Head Project {letter}
            </label>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <button
              type="button"
              onClick={() => handleAddProject(gIdx)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '5px',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title={`Add Project Item to Head ${letter}`}
            >
              <Plus size={12} />
              <span>Add Project to Head {letter}</span>
            </button>
            {currentGroups.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveGroup(gIdx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
                title={`Delete Head Project ${letter}`}
              >
                <Trash2 size={13} />
                <span>Delete Head Project</span>
              </button>
            )}
          </div>
        </div>

        <input
          type="text"
          value={group.headName || ''}
          onChange={e => handleUpdateHeadName(gIdx, e.target.value)}
          onFocus={onFocus}
          onClick={onFocus}
          aria-label={'Head Project ' + letter + ' Name'}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#0f172a',
            borderRadius: '6px',
            border: '1px solid #94a3b8',
            background: '#f8fafc',
          }}
        />
      </div>

      {/* PROJECT ITEMS UNDER THIS HEAD PROJECT */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '6px'}}>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Project List ({letter})
        </span>
        {projects.map((item, pIdx) => (
          <ProjectRow
            key={item.id || pIdx}
            item={item}
            pIdx={pIdx}
            projects={projects}
            handleRemoveProject={handleRemoveProject}
            handleUpdateProject={handleUpdateProject}
            onFocus={onFocus}
            gIdx={gIdx}
          />
        ))}
      </div>
    </div>
  );
}
