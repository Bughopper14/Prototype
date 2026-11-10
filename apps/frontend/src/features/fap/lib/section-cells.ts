/** Form section ↔ FAP sheet cells / scroll targets, built from one file per section (see ./section-cells). */
import {IDENTITY} from '@/features/fap/lib/section-cells/identity';
import {DOMICILE} from '@/features/fap/lib/section-cells/domicile';
import {PROFILE} from '@/features/fap/lib/section-cells/profile';
import {PIC} from '@/features/fap/lib/section-cells/pic';
import {PURPOSE_ASSETS} from '@/features/fap/lib/section-cells/purpose-assets';
import {PROJECTS} from '@/features/fap/lib/section-cells/projects';
import {PROPOSAL} from '@/features/fap/lib/section-cells/proposal';
import {REFERENCES} from '@/features/fap/lib/section-cells/references';
import {FINANCIAL} from '@/features/fap/lib/section-cells/financial';

const SECTIONS = [
  IDENTITY,
  DOMICILE,
  PROFILE,
  PIC,
  PURPOSE_ASSETS,
  PROJECTS,
  PROPOSAL,
  REFERENCES,
  FINANCIAL,
];

export const SECTION_TO_CELL_IDS_MAP: Record<string, string[]> = Object.fromEntries(
  SECTIONS.map(s => [s.section, s.cellIds]),
);

export const SECTION_TO_SCROLL_TARGET_MAP: Record<string, string> = Object.fromEntries(
  SECTIONS.map(s => [s.section, s.scrollTarget]),
);

export const SECTION_TO_CELL_ID_MAP: Record<string, string> = {
  ...SECTION_TO_SCROLL_TARGET_MAP,
};

export const CELL_ID_TO_SECTION_MAP: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap(s => s.ownCellIds.map(cell => [cell, s.section])),
);
