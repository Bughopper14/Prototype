/** Current projects, history projects and investment project plans, grouped by head project. */
import {ProjectGroupListEditor} from '@/features/pre-analysis/components/form/project-info/ProjectGroupListEditor';
import {ensureProjectGroups} from '@/features/pre-analysis/lib/projects';
import {defaultInitialData} from '@/features/pre-analysis/lib/defaults';
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
        defaultHeadName="PT Handalan Putramas Santosa (HPS)"
        groups={ensureProjectGroups(
          data.currentProjects,
          defaultInitialData.currentProjects as any,
          'PT Handalan Putramas Santosa (HPS)',
        )}
        onChange={newGroups => updateField('currentProjects', newGroups)}
        onFocus={() => scrollToPreviewElement('preana-preview-cell-currentProjects')}
      />

      {/* HISTORY PROJECT */}
      <ProjectGroupListEditor
        title="History Project"
        dataField="historyProjects"
        subtitle="Historical completed projects"
        defaultHeadName="PT Pangan Sejahtera Santosa (PASS)"
        groups={ensureProjectGroups(
          data.historyProjects,
          defaultInitialData.historyProjects as any,
          'PT Pangan Sejahtera Santosa (PASS)',
        )}
        onChange={newGroups => updateField('historyProjects', newGroups)}
        onFocus={() => scrollToPreviewElement('preana-preview-cell-historyProjects')}
      />

      {/* INVESTMENT PROJECT PLAN */}
      <ProjectGroupListEditor
        title="Investment Project Plan"
        dataField="investmentProjectPlans"
        subtitle="Future project pipeline & investment plans"
        defaultHeadName="PT Harta Putramas Santosa (HTPS)"
        groups={ensureProjectGroups(
          data.investmentProjectPlans,
          defaultInitialData.investmentProjectPlans as any,
          'PT Harta Putramas Santosa (HTPS)',
        )}
        onChange={newGroups => updateField('investmentProjectPlans', newGroups)}
        onFocus={() => scrollToPreviewElement('preana-preview-cell-investmentProjectPlans')}
      />
    </>
  );
}
