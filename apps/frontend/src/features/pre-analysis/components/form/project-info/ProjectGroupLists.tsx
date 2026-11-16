/** Current projects, history projects and investment project plans, grouped by head project. */
import {ProjectGroupListEditor} from '@/features/pre-analysis/components/form/project-info/ProjectGroupListEditor';
import {ensureProjectGroups} from '@/features/pre-analysis/lib/projects';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function ProjectGroupLists() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* CURRENT PROJECT */}
      <ProjectGroupListEditor
        title="Current Project"
        dataField="currentProjects"
        subtitle="Currently active ongoing projects"
        groups={ensureProjectGroups(data.currentProjects)}
        onChange={newGroups => updateField('currentProjects', newGroups)}
        onFocus={() => scrollToPreviewElement('preana-preview-cell-currentProjects')}
      />

      {/* HISTORY PROJECT */}
      <ProjectGroupListEditor
        title="History Project"
        dataField="historyProjects"
        subtitle="Historical completed projects"
        groups={ensureProjectGroups(data.historyProjects)}
        onChange={newGroups => updateField('historyProjects', newGroups)}
        onFocus={() => scrollToPreviewElement('preana-preview-cell-historyProjects')}
      />

      {/* INVESTMENT PROJECT PLAN */}
      <ProjectGroupListEditor
        title="Investment Project Plan"
        dataField="investmentProjectPlans"
        subtitle="Future project pipeline & investment plans"
        groups={ensureProjectGroups(data.investmentProjectPlans)}
        onChange={newGroups => updateField('investmentProjectPlans', newGroups)}
        onFocus={() => scrollToPreviewElement('preana-preview-cell-investmentProjectPlans')}
      />
    </>
  );
}
