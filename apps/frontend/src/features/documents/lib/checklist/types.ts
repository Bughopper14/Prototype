/** Shapes shared by the document checklist. */
import type {MasterDocDef} from '@/features/documents/lib/checklist/definitions';

export type SourceType = 'SYSTEM_LINKED' | 'MANUAL' | 'NONE';

/** What is worked out per document: where it comes from, whether it is there, and whether it can be deleted here. */
export interface RowState {
  isAvailable: boolean;
  sourceType: SourceType;
  sourceLabel: string;
  sourceDetails: string;
  canDelete: boolean;
  isMandatory: boolean;
  previewUrl: string;
}

export interface ResolverContext {
  a: any;
  draft: any;
  files: any[];
  allStakeholders: any[];
  row: RowState;
}

export type ChecklistRow = MasterDocDef &
  RowState & {
    chkId?: string;
    status: string;
    files: any[];
  };

export interface PreviewState {
  title: string;
  url: string;
  fileName: string;
  isPdf: boolean;
  source: string;
  fileSize?: number;
  uploadedAt?: string;
}

export type StatusFilter = 'ALL' | 'AVAILABLE' | 'PENDING';
