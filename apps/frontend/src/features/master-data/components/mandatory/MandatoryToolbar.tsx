/** Search box plus stage, section and status filters for the mandatory-rules table. */
import {MANDATORY_SECTIONS_FAP, MANDATORY_SECTIONS_PRE, resolveRuleSection} from '@/shared/master-data';
import {Search} from 'lucide-react';
import type {MandatoryFilters, StageFilter, StatusFilter} from '../../lib/mandatory-rules';

type Rule = Record<string, any>;

export function MandatoryToolbar({
  filters,
  onChange,
  rules,
  fapRules,
  preRules,
}: {
  filters: MandatoryFilters;
  onChange: (patch: Partial<MandatoryFilters>) => void;
  rules: Rule[];
  fapRules: Rule[];
  preRules: Rule[];
}) {
  const sectionOptions = (
    sections: readonly string[],
    list: Rule[],
    key: (sec: string) => string,
    label: (sec: string) => string,
  ) =>
    sections.map(sec => {
      const count = list.filter(r => resolveRuleSection(r) === sec).length;
      return (
        <option key={key(sec)} value={sec}>
          {label(sec)} ({count})
        </option>
      );
    });

  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14}}>
      <div className="search" style={{margin: 0, flex: '1 1 240px', maxWidth: 360}}>
        <Search size={16} />
        <input
          placeholder="Search label, field key, section, stage..."
          value={filters.search}
          onChange={e => onChange({search: e.target.value})}
        />
      </div>

      {/* Stage Filter */}
      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
        <select
          value={filters.stage}
          onChange={e => onChange({stage: e.target.value as StageFilter, section: 'ALL'})}
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '7px 12px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: '#ffffff',
            color: '#002060',
            cursor: 'pointer',
          }}
          aria-label="Filter Stage"
        >
          <option value="ALL">ALL STAGES ({rules.length})</option>
          <option value="FAP">FAP ({fapRules.length})</option>
          <option value="PRE-AN">PRE-AN ({preRules.length})</option>
        </select>
      </div>

      {/* Section Filter */}
      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
        <select
          value={filters.section}
          onChange={e => onChange({section: e.target.value})}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '7px 14px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: '#ffffff',
            color: '#0f172a',
            cursor: 'pointer',
            minWidth: 280,
          }}
          aria-label="Filter Section"
        >
          {filters.stage === 'FAP' ? (
            <>
              <option value="ALL">All FAP Sections ({fapRules.length})</option>
              {sectionOptions(
                MANDATORY_SECTIONS_FAP,
                fapRules,
                sec => sec,
                sec => sec,
              )}
            </>
          ) : filters.stage === 'PRE-AN' ? (
            <>
              <option value="ALL">All PRE-AN Sections ({preRules.length})</option>
              {sectionOptions(
                MANDATORY_SECTIONS_PRE,
                preRules,
                sec => sec,
                sec => sec,
              )}
            </>
          ) : (
            <>
              <option value="ALL">All Sections ({rules.length})</option>
              <optgroup label="FAP">
                {sectionOptions(
                  MANDATORY_SECTIONS_FAP,
                  fapRules,
                  sec => `fap-${sec}`,
                  sec => `FAP · ${sec}`,
                )}
              </optgroup>
              <optgroup label="PRE-AN">
                {sectionOptions(
                  MANDATORY_SECTIONS_PRE,
                  preRules,
                  sec => `pre-${sec}`,
                  sec => `PRE · ${sec}`,
                )}
              </optgroup>
            </>
          )}
        </select>
      </div>

      {/* Status Filter */}
      <div style={{marginLeft: 'auto', display: 'flex', gap: 6}}>
        <select
          value={filters.status}
          onChange={e => onChange({status: e.target.value as StatusFilter})}
          style={{
            fontSize: 11,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: '#fff',
          }}
          aria-label="Filter Status Mandatory"
        >
          <option value="ALL">All Status</option>
          <option value="1">Mandatory Only (1)</option>
          <option value="0">Optional Only (0)</option>
        </select>
      </div>
    </div>
  );
}
