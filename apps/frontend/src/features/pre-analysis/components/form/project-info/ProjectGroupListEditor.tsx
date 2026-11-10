/** Editor of projects grouped by head project (current, history and investment plans). */
import React from 'react';
import {ProjectGroupCard} from '@/features/pre-analysis/components/form/project-info/ProjectGroupCard';
import {Plus} from 'lucide-react';
import type {PreAnalysisProjectGroup, PreAnalysisProjectItem} from '@/features/pre-analysis/lib/types';

export const ProjectGroupListEditor: React.FC<{
  title: string;
  subtitle?: string;
  dataField?: string;
  defaultHeadName?: string;
  groups: PreAnalysisProjectGroup[];
  onChange: (groups: PreAnalysisProjectGroup[]) => void;
  onFocus?: () => void;
}> = ({title, subtitle, dataField, defaultHeadName, groups, onChange, onFocus}) => {
  const currentGroups =
    groups && groups.length > 0
      ? groups
      : [{headName: defaultHeadName || '', projects: [{projectName: '', location: '', scope: ''}]}];

  const handleUpdateHeadName = (gIdx: number, val: string) => {
    const updated = [...currentGroups];
    updated[gIdx] = {...updated[gIdx], headName: val};
    onChange(updated);
  };

  const handleUpdateProject = (
    gIdx: number,
    pIdx: number,
    key: keyof PreAnalysisProjectItem,
    val: string,
  ) => {
    const updated = [...currentGroups];
    const projects = [...(updated[gIdx].projects || [])];
    projects[pIdx] = {...projects[pIdx], [key]: val};
    updated[gIdx] = {...updated[gIdx], projects};
    onChange(updated);
  };

  const handleAddProject = (gIdx: number) => {
    const updated = [...currentGroups];
    const projects = [...(updated[gIdx].projects || []), {projectName: '', location: '', scope: ''}];
    updated[gIdx] = {...updated[gIdx], projects};
    onChange(updated);
  };

  const handleRemoveProject = (gIdx: number, pIdx: number) => {
    const updated = [...currentGroups];
    const projects = (updated[gIdx].projects || []).filter((_, i) => i !== pIdx);
    updated[gIdx] = {
      ...updated[gIdx],
      projects: projects.length > 0 ? projects : [{projectName: '', location: '', scope: ''}],
    };
    onChange(updated);
  };

  const handleAddGroup = () => {
    onChange([...currentGroups, {headName: '', projects: [{projectName: '', location: '', scope: ''}]}]);
  };

  const handleRemoveGroup = (gIdx: number) => {
    if (currentGroups.length <= 1) {
      onChange([{headName: '', projects: [{projectName: '', location: '', scope: ''}]}]);
    } else {
      onChange(currentGroups.filter((_, i) => i !== gIdx));
    }
  };

  return (
    <div
      id={dataField ? `preana-form-${dataField}` : undefined}
      data-field={dataField}
      tabIndex={-1}
      className="preana-project-list-editor"
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.25s ease',
      }}
    >
      {/* CARD TOP HEADER: Title, Badge, and Add Head Project button next to Project Type Title */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
          <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a'}}>{title}</span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#475569',
              background: '#e2e8f0',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {currentGroups.length} Head Project{currentGroups.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={handleAddGroup}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: '4px',
            }}
            title="Add a new Head Project group"
          >
            <Plus size={13} />
            <span>Add Head Project ({String.fromCharCode(65 + currentGroups.length)})</span>
          </button>
        </div>
      </div>
      {subtitle && <p style={{margin: '-6px 0 0', fontSize: '0.7rem', color: '#64748b'}}>{subtitle}</p>}

      <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
        {currentGroups.map((group, gIdx) => (
          <ProjectGroupCard
            key={group.id || gIdx}
            group={group}
            gIdx={gIdx}
            handleAddProject={handleAddProject}
            currentGroups={currentGroups}
            handleRemoveGroup={handleRemoveGroup}
            handleUpdateHeadName={handleUpdateHeadName}
            onFocus={onFocus}
            handleRemoveProject={handleRemoveProject}
            handleUpdateProject={handleUpdateProject}
          />
        ))}
      </div>
    </div>
  );
};
