/** Head-project groups for current projects, history and investment plans. */
import type {PreAnalysisProjectGroup} from '@/features/pre-analysis/lib/types';

export function ensureProjectGroups(
  list: any,
  defaultGroups?: PreAnalysisProjectGroup[],
  defaultHeadName: string = '',
): PreAnalysisProjectGroup[] {
  if (!list || !Array.isArray(list) || list.length === 0) {
    if (defaultGroups && defaultGroups.length > 0) return defaultGroups;
    return [{headName: defaultHeadName, projects: [{projectName: '', location: '', scope: ''}]}];
  }

  // Check if elements are already groups (has 'projects' or 'headName')
  if (list[0] && ('projects' in list[0] || 'headName' in list[0])) {
    return list.map((g: any, i: number) => ({
      id: g.id || `group-${i}`,
      headName: g.headName || (i === 0 && defaultHeadName ? defaultHeadName : ''),
      projects:
        Array.isArray(g.projects) && g.projects.length > 0
          ? g.projects.map((p: any) => ({
              id: p.id,
              projectName: p.projectName || '',
              location: p.location || '',
              scope: p.scope || '',
            }))
          : [{projectName: '', location: '', scope: ''}],
    }));
  }

  // Legacy flat array of PreAnalysisProjectItem -> wrap into Head Group A
  return [
    {
      headName: defaultHeadName,
      projects: list.map((p: any) => ({
        id: p.id,
        projectName: p.projectName || '',
        location: p.location || '',
        scope: p.scope || '',
      })),
    },
  ];
}
