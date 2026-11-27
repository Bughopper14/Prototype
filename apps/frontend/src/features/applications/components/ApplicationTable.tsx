import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Minus,
  Search,
  Users,
  X,
} from 'lucide-react';
import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import * as XLSX from 'xlsx';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {api} from '@/shared/lib/api';
import {useMasterData} from '@/shared/master-data';
import {Modal} from '@/shared/ui/Modal';
import './ApplicationTable.css';

export interface ApplicationTableHandle {
  exportCsv: () => void;
}

export interface ApplicationTableProps {
  rows: any[];
  open: (id: string, tab?: number) => void;
  compact?: boolean;
  documentMode?: boolean;
  highlightId?: string | null;
  onViewAll?: () => void;
}

export type StageDocItem = {
  code?: string;
  name: string;
  status: 'Uploaded' | 'Missing' | 'Rejected' | 'Optional';
  isUploaded?: boolean;
  isMandatory?: boolean;
};

export type StageItem = {
  code: string;
  name: string;
  fullName?: string;
  status: 'APPROVED' | 'WAITING_APPROVAL' | 'NEEDS_CHANGES' | 'IN_PROGRESS' | 'NOT_STARTED';
  owner?: string;
  approval?: string;
  firstApprover?: string;
  canStart?: string;
  returnedBy?: string;
  returnAction?: string;
  approvedBy?: string;
  approvalSummary?: string;
  approvedOn?: string;
  mandatoryDocs?: StageDocItem[];
  requiredCount?: number;
  uploadedCount?: number;
};

export const STAGE_OPTIONS = [
  { key: 'FAP', label: 'FAP' },
  { key: 'Pre-analysis', label: 'Pre-analysis' },
  { key: 'ICLF', label: 'ICLF' },
];

export const STATUS_OPTIONS: {
  key: StageItem['status'];
  label: string;
}[] = [
  { key: 'NOT_STARTED', label: 'Not started' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'WAITING_APPROVAL', label: 'Waiting for approval' },
  { key: 'NEEDS_CHANGES', label: 'Needs changes' },
  { key: 'APPROVED', label: 'Approved' },
];

function HalfCircleIcon({
  size = 11,
  color,
  strokeWidth = 2,
  style,
  className = '',
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const iconColor = color || (style?.color as string) || 'currentColor';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style}}
    >
      <circle cx="12" cy="12" r="10" stroke={iconColor} strokeWidth={strokeWidth} />
      <path d="M12 2 A 10 10 0 0 0 12 22 Z" fill={iconColor} stroke="none" />
    </svg>
  );
}

export const QUICK_RANGES = [
  { key: 'TODAY', label: 'Today' },
  { key: 'YESTERDAY', label: 'Yesterday' },
  { key: '7D', label: 'Last 7 days' },
  { key: '30D', label: 'Last 30 days' },
  { key: 'THIS_MONTH', label: 'This month' },
  { key: 'LAST_MONTH', label: 'Last month' },
  { key: 'CUSTOM', label: 'Custom range' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function formatInputDate(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateInput(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split(/[/.-]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 0 && m <= 11) {
      const date = new Date(y, m, d);
      if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
        return date;
      }
    }
  }
  return null;
}

function isSameDay(d1: Date | null, d2: Date | null): boolean {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isBetween(target: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t > s && t < e;
}

function getMonthCalendarDays(year: number, month: number) {
  const firstDayDate = new Date(year, month, 1);
  const startDayOfWeek = (firstDayDate.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ date: Date; day: number } | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, month, d),
      day: d,
    });
  }
  return cells;
}

function formatDisplayDate(val: any): string {
  if (!val) return '–';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '–';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatAmount(val: any): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID');
}

function getInitials(name?: string | null, id?: any): string {
  if (!name && !id) return '–';
  if (!name) return `U${id}`;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStageTargetTab(stage: StageItem): number {
  const norm = (stage.code || stage.name || '').toUpperCase().replace(/[-_ ]/g, '');
  if (norm.includes('PRE')) {
    return 8; // Pre Analysis form
  }
  if (norm.includes('ICLF') || norm.includes('APPROVAL')) {
    return 10; // Approvals
  }
  return 0; // FAP Form
}

function StageHoverCard({
  stage,
  row,
  anchorRect,
  onCardMouseEnter,
  onCardMouseLeave,
  onOpen,
}: {
  stage: StageItem;
  row?: any;
  anchorRect: DOMRect;
  onCardMouseEnter: () => void;
  onCardMouseLeave: () => void;
  onOpen?: (row: any, stage: StageItem) => void;
}) {
  const cardWidth = 330;
  let left = anchorRect.left;

  if (left + cardWidth > window.innerWidth - 16) {
    left = window.innerWidth - cardWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }

  const spaceBelow = window.innerHeight - anchorRect.bottom - 16;
  const spaceAbove = anchorRect.top - 16;

  const status = stage.status || 'NOT_STARTED';
  const statusLabels: Record<StageItem['status'], string> = {
    NOT_STARTED: 'Not started',
    IN_PROGRESS: 'In progress',
    WAITING_APPROVAL: 'Waiting for approval',
    NEEDS_CHANGES: 'Needs changes',
    APPROVED: 'Approved',
  };

  const isNeedsChanges = status === 'NEEDS_CHANGES';
  const isProgress = status === 'IN_PROGRESS';
  const isApproved = status === 'APPROVED';

  const calloutMessages: Record<StageItem['status'], string> = {
    NOT_STARTED: 'This stage has not been filled yet.',
    IN_PROGRESS: 'Form is being filled — not sent for approval yet.',
    WAITING_APPROVAL: 'Waiting for approval from approvers.',
    NEEDS_CHANGES: 'Revise the form, then resubmit for approval.',
    APPROVED: 'This stage is complete.',
  };

  const picDept = row?.mkt_pic_dept_name;
  const picDeptCode = row?.mkt_pic_dept_code;
  const owner = stage.owner || (picDept ? (picDeptCode ? `${picDept} (${picDeptCode})` : picDept) : 'Marketing (MKT)');
  const approval = stage.approval || 'Business Support, then CA & Legal';
  const canStart = stage.canStart || 'Anytime — stages run in parallel';
  const firstApprover =
    stage.firstApprover ||
    (stage.name.toUpperCase().includes('PRE')
      ? 'Credit Analyst (CA)'
      : stage.name.toUpperCase().includes('ICLF')
        ? 'Credit Committee'
        : 'Business Support (BS)');
  const lastUpdateDate = formatDisplayDate(row?.updated_at || row?.created_at || row?.application_date);

  let docs = stage.mandatoryDocs || [];
  if (docs.length === 0) {
    if (isApproved) {
      docs = [
        { name: 'Formulir Aplikasi Pembiayaan', status: 'Uploaded', isUploaded: true, isMandatory: true },
        { name: 'Nomor Induk Berusaha (NIB)', status: 'Uploaded', isUploaded: true, isMandatory: true },
        { name: 'NPWP Badan Usaha', status: 'Uploaded', isUploaded: true, isMandatory: true },
        { name: 'KTP Pengurus / Direksi & Komisaris', status: 'Uploaded', isUploaded: true, isMandatory: true },
        { name: 'Akta Pendirian & Perubahan Terakhir', status: 'Optional', isUploaded: false, isMandatory: false },
      ];
    } else if (isNeedsChanges) {
      docs = [
        { name: 'Formulir Aplikasi Pembiayaan', status: 'Uploaded', isUploaded: true, isMandatory: true },
        { name: 'Nomor Induk Berusaha (NIB)', status: 'Uploaded', isUploaded: true, isMandatory: true },
        { name: 'NPWP Badan Usaha', status: 'Missing', isUploaded: false, isMandatory: true },
        { name: 'KTP Pengurus / Direksi & Komisaris', status: 'Missing', isUploaded: false, isMandatory: true },
        { name: 'Akta Pendirian & Perubahan Terakhir', status: 'Optional', isUploaded: false, isMandatory: false },
      ];
    } else if (stage.code.includes('PRE') || stage.name.toUpperCase().includes('PRE')) {
      docs = [{ name: 'Lembar Dokumen Pra-Analisis Kredit', status: 'Missing', isMandatory: true }];
    } else if (stage.code.includes('FAP') || stage.name.toUpperCase().includes('FAP')) {
      docs = [
        { name: 'Formulir Aplikasi Pembiayaan', status: 'Missing', isMandatory: true },
        { name: 'Nomor Induk Berusaha (NIB)', status: 'Missing', isMandatory: true },
        { name: 'NPWP Badan Usaha', status: 'Missing', isMandatory: true },
        { name: 'KTP Pengurus / Direksi & Komisaris', status: 'Missing', isMandatory: true },
        { name: 'Akta Pendirian & Perubahan Terakhir', status: 'Optional', isMandatory: false },
      ];
    }
  } else if (isApproved) {
    docs = docs.map(d => ({
      ...d,
      status: d.isMandatory === false || d.status === 'Optional' ? 'Optional' : 'Uploaded',
      isUploaded: d.isMandatory !== false && d.status !== 'Optional',
    }));
  }

  // Estimated full card height with documents
  const estimatedCardHeight = docs.length > 2 ? 420 : (docs.length > 0 ? 360 : 280);

  // If space below cannot comfortably fit full card and there's room above, or if above has more room, flip to top
  const isAbove =
    (spaceBelow < estimatedCardHeight && spaceAbove >= 180) ||
    (spaceBelow < 320 && spaceAbove > spaceBelow) ||
    spaceBelow < 240;

  const caretLeft = Math.max(16, Math.min(cardWidth - 16, anchorRect.left + anchorRect.width / 2 - left));

  const mandatoryOnly = docs.filter(d => d.isMandatory !== false && d.status !== 'Optional');
  const requiredCount = stage.requiredCount ?? (mandatoryOnly.length || docs.length);
  const uploadedCount = isApproved ? requiredCount : (stage.uploadedCount ?? mandatoryOnly.filter(d => d.status === 'Uploaded' || d.isUploaded).length);
  const pct = requiredCount > 0 ? Math.min(100, Math.round((uploadedCount / requiredCount) * 100)) : 0;
  const allUploaded = isApproved || (requiredCount > 0 && uploadedCount >= requiredCount);

  const progressColor = allUploaded
    ? '#10b981'
    : (uploadedCount > 0 || isNeedsChanges)
      ? '#f59e0b'
      : '#f87171';
  const countColor = allUploaded
    ? '#10b981'
    : (uploadedCount > 0 || isNeedsChanges)
      ? '#d97706'
      : '#ef4444';

  return createPortal(
    <div
      className={`app-stage-hover-card ${isAbove ? 'placement-top' : 'placement-bottom'}`}
      style={{
        position: 'fixed',
        left: `${left}px`,
        width: `${cardWidth}px`,
        zIndex: 99999,
        ['--caret-left' as any]: `${caretLeft}px`,
        ...(isAbove
          ? {
              bottom: `${Math.max(10, window.innerHeight - anchorRect.top + 8)}px`,
              top: 'auto',
              maxHeight: `${Math.max(260, spaceAbove - 12)}px`,
            }
          : {
              top: `${anchorRect.bottom + 8}px`,
              bottom: 'auto',
              maxHeight: `${Math.max(260, spaceBelow - 12)}px`,
            }),
      }}
      onMouseEnter={onCardMouseEnter}
      onMouseLeave={onCardMouseLeave}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="app-stage-hover-header">
        <span className="app-stage-hover-title">{stage.name}</span>
        <span className={`app-stage-hover-status app-stage-hover-status--${status.toLowerCase().replace(/_/g, '-')}`}>
          <span className="app-stage-hover-status-dot" />
          <span>{statusLabels[status] || status}</span>
        </span>
      </div>

      {/* Meta: Approval for Approved; Returned by & Action for Needs changes; Filled by / Submitted / Next for In progress; or Owner / Approval / Can start */}
      {isApproved ? (
        <div className="app-stage-hover-meta">
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Approval</span>
            <span className="app-stage-hover-meta-value">{stage.approvalSummary || 'All 2 levels completed'}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Approved by</span>
            <span className="app-stage-hover-meta-value">{stage.approvedBy || (stage.approval?.replace(/Business Support \(BS\)/, 'BS') || 'BS, then CA & Legal')}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Approved on</span>
            <span className="app-stage-hover-meta-value">{stage.approvedOn || lastUpdateDate}</span>
          </div>
        </div>
      ) : isNeedsChanges ? (
        <div className="app-stage-hover-meta">
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Returned by</span>
            <span className="app-stage-hover-meta-value">{stage.returnedBy || 'Business Support (BS) · level 1'}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Action</span>
            <span className="app-stage-hover-meta-value">{stage.returnAction || `${owner} revises & resubmits`}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Last update</span>
            <span className="app-stage-hover-meta-value">{lastUpdateDate}</span>
          </div>
        </div>
      ) : isProgress ? (
        <div className="app-stage-hover-meta">
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Filled by</span>
            <span className="app-stage-hover-meta-value">{owner}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Submitted</span>
            <span className="app-stage-hover-meta-value">Not yet</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Next</span>
            <span className="app-stage-hover-meta-value">Submit → {firstApprover}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Last update</span>
            <span className="app-stage-hover-meta-value">{lastUpdateDate}</span>
          </div>
        </div>
      ) : (
        <div className="app-stage-hover-meta">
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Owner</span>
            <span className="app-stage-hover-meta-value">{owner}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Approval</span>
            <span className="app-stage-hover-meta-value">{approval}</span>
          </div>
          <div className="app-stage-hover-meta-row">
            <span className="app-stage-hover-meta-label">Can start</span>
            <span className="app-stage-hover-meta-value">{canStart}</span>
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="app-stage-hover-docs-section">
        <div className="app-stage-hover-docs-header">
          <span className="app-stage-hover-docs-title">DOCUMENTS</span>
          <div className="app-stage-hover-docs-progress">
            <div className="app-stage-hover-progress-bar">
              <div
                className="app-stage-hover-progress-fill"
                style={{
                  width: `${pct}%`,
                  backgroundColor: progressColor,
                }}
              />
            </div>
            <span
              className="app-stage-hover-docs-count"
              style={{color: countColor}}
            >
              {uploadedCount} of {requiredCount} required
            </span>
          </div>
        </div>

        <div className="app-stage-hover-docs-list">
          {docs.length > 0 ? (
            docs.map(doc => {
              const isUp = doc.status === 'Uploaded' || doc.isUploaded;
              const isRejected = doc.status === 'Rejected';
              const isOpt = doc.status === 'Optional' || doc.isMandatory === false;
              return (
                <div key={doc.code || doc.name} className="app-stage-hover-doc-item">
                  <div className="app-stage-hover-doc-name-wrap">
                    {isUp ? (
                      <span className="app-stage-hover-doc-circle is-uploaded">
                        <Check size={8} strokeWidth={3.5} color="#ffffff" />
                      </span>
                    ) : isRejected ? (
                      <span className="app-stage-hover-doc-circle is-rejected" />
                    ) : (
                      <span className="app-stage-hover-doc-circle is-missing" />
                    )}
                    <span className="app-stage-hover-doc-name" title={doc.name}>
                      {doc.name}
                    </span>
                  </div>
                  <span className={`app-stage-hover-doc-status ${isUp ? 'is-uploaded' : isRejected ? 'is-rejected' : isOpt ? 'is-optional' : 'is-missing'}`}>
                    {isUp ? 'Uploaded' : isRejected ? 'Rejected' : isOpt ? 'Optional' : 'Missing'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="app-stage-hover-doc-empty">
              No mandatory documents required
            </div>
          )}
        </div>
      </div>

      {/* Info Callout */}
      <div className={`app-stage-hover-callout ${isProgress ? 'is-in-progress' : isNeedsChanges ? 'is-needs-changes' : isApproved ? 'is-approved' : ''}`}>
        <HelpCircle size={14} className={`app-stage-hover-callout-icon ${isProgress ? 'is-in-progress' : isNeedsChanges ? 'is-needs-changes' : isApproved ? 'is-approved' : ''}`} />
        <span>{calloutMessages[status] || 'Stage details and requirements.'}</span>
      </div>

      {/* Footer Action */}
      <div className="app-stage-hover-footer">
        <button
          type="button"
          className="app-stage-hover-action-btn"
          onClick={e => {
            e.stopPropagation();
            onCardMouseLeave();
            onOpen?.(row, stage);
          }}
        >
          <span>
            {status === 'NOT_STARTED'
              ? `Start ${stage.name}`
              : status === 'IN_PROGRESS'
                ? `Continue ${stage.name}`
                : `Open ${stage.name}`}
          </span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>,
    document.body
  );
}

function StagePill({
  stage,
  row,
  onOpen,
}: {
  stage: StageItem;
  row?: any;
  onOpen?: (row: any, stage: StageItem) => void;
}) {
  const status = stage.status || 'NOT_STARTED';
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<any>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pillRef.current) {
      setAnchorRect(pillRef.current.getBoundingClientRect());
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setHovered(false);
    }, 150);
  };

  const handleCardMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleCardMouseLeave = () => {
    setHovered(false);
  };

  return (
    <>
      <span
        ref={pillRef}
        className={`app-stage-pill app-stage-pill--${status.toLowerCase().replace(/_/g, '-')}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={e => {
          e.stopPropagation();
          onOpen?.(row, stage);
        }}
        style={{cursor: 'pointer'}}
      >
        {status === 'APPROVED' && <CircleCheck size={11} fill="#16a34a" color="#ffffff" strokeWidth={2.5} />}
        {status === 'WAITING_APPROVAL' && <Clock size={11} strokeWidth={2.5} />}
        {status === 'NEEDS_CHANGES' && <CircleAlert size={11} fill="#dc2626" color="#ffffff" strokeWidth={2.5} />}
        {status === 'IN_PROGRESS' && <HalfCircleIcon size={11} strokeWidth={2} />}
        {status === 'NOT_STARTED' && <Circle size={11} strokeWidth={1.8} strokeDasharray="2 2" />}
        <span>{stage.name}</span>
      </span>

      {hovered && anchorRect && (
        <StageHoverCard
          stage={stage}
          row={row}
          anchorRect={anchorRect}
          onCardMouseEnter={handleCardMouseEnter}
          onCardMouseLeave={handleCardMouseLeave}
          onOpen={onOpen}
        />
      )}
    </>
  );
}

function QuickViewPanel({
  app,
  onClose,
  onOpen,
}: {
  app: any;
  onClose: () => void;
  onOpen: (id: string, tab?: number) => void;
}) {
  const appNumber = app.application_number || app.fap_number || app.id;
  const companyName = app.company_name || '–';
  const branch = app.branch_code || '–';
  const segment = app.industry_segment || app.customer_category || 'Corporate';
  const picName = app.mkt_pic_name || (app.mkt_pic_id ? `User #${app.mkt_pic_id}` : '–');

  // Overall Status
  const rawStatus = (app.status || '').toUpperCase();
  let statusBadge = {
    label: 'Not started',
    colorClass: 'is-not-started',
    dotColor: '#94a3b8',
  };
  if (rawStatus === 'APPROVED') {
    statusBadge = {
      label: 'Approved',
      colorClass: 'is-approved',
      dotColor: '#16a34a',
    };
  } else if (rawStatus === 'IN_APPROVAL' || rawStatus === 'WAITING' || rawStatus === 'WAITING_APPROVAL') {
    statusBadge = {
      label: 'Waiting for approval',
      colorClass: 'is-waiting',
      dotColor: '#f59e0b',
    };
  } else if (rawStatus === 'NEEDS_CHANGES' || rawStatus === 'REJECTED') {
    statusBadge = {
      label: 'Needs changes',
      colorClass: 'is-needs-changes',
      dotColor: '#ef4444',
    };
  } else if (rawStatus === 'IN_PROGRESS') {
    statusBadge = {
      label: 'In progress',
      colorClass: 'is-in-progress',
      dotColor: '#3b82f6',
    };
  }

  // Stages
  const stages: StageItem[] = Array.isArray(app.stages) && app.stages.length
    ? app.stages
    : [
        {
          code: 'FAP-STAGE',
          name: 'FAP',
          status: app.status === 'APPROVED' ? 'APPROVED' : 'IN_PROGRESS',
        },
        {
          code: 'PRE-ANALYSIS',
          name: 'Pre-analysis',
          status: app.status === 'APPROVED' ? 'APPROVED' : 'NOT_STARTED',
        },
        {
          code: 'ICLF',
          name: 'ICLF',
          status: app.status === 'APPROVED' ? 'APPROVED' : 'NOT_STARTED',
        },
      ];

  return (
    <aside className="app-quick-view-drawer" aria-label={`Quick view for ${companyName}`}>
      {/* Top Header */}
      <div className="app-quick-header">
        <div className="app-quick-top-line">
          <span className="app-quick-app-num">{appNumber}</span>
          <button
            type="button"
            className="app-quick-close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>
        <h2 className="app-quick-company-name">{companyName}</h2>
        <div className="app-quick-subtitle-row">
          <span className={`app-quick-status-pill ${statusBadge.colorClass}`}>
            <span className="app-quick-status-dot" style={{ backgroundColor: statusBadge.dotColor }} />
            {statusBadge.label}
          </span>
          <span className="app-quick-meta-text">
            {segment} · {branch}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="app-quick-actions">
        <button
          type="button"
          className="app-quick-btn-primary"
          onClick={() => onOpen(app.application_number || app.id)}
        >
          <ExternalLink size={14} />
          <span>Open application</span>
        </button>
        <button
          type="button"
          className="app-quick-btn-secondary"
          onClick={() => onOpen(app.application_number || app.id, 9)}
        >
          <FileCheck size={14} />
          <span>Documents</span>
        </button>
      </div>

      {/* Summary Section */}
      <div className="app-quick-section">
        <div className="app-quick-section-header">SUMMARY</div>
        <div className="app-quick-summary-grid">
          <div className="app-quick-summary-item">
            <span className="app-quick-summary-label">Branch</span>
            <span className="app-quick-summary-value">{branch}</span>
          </div>
          <div className="app-quick-summary-item">
            <span className="app-quick-summary-label">Segment</span>
            <span className="app-quick-summary-value">{segment}</span>
          </div>
          <div className="app-quick-summary-item">
            <span className="app-quick-summary-label">PIC marketing</span>
            <span className="app-quick-summary-value">{picName}</span>
          </div>
          <div className="app-quick-summary-item">
            <span className="app-quick-summary-label">Financing amount</span>
            <span className="app-quick-summary-value">
              {app.financing_value ? `Rp ${Number(app.financing_value).toLocaleString('id-ID')}` : 'Rp 0'}
            </span>
          </div>
          <div className="app-quick-summary-item">
            <span className="app-quick-summary-label">Applied</span>
            <span className="app-quick-summary-value">{formatDisplayDate(app.created_at || app.application_date)}</span>
          </div>
          <div className="app-quick-summary-item">
            <span className="app-quick-summary-label">Updated</span>
            <span className="app-quick-summary-value">{formatDisplayDate(app.updated_at || app.created_at || app.application_date)}</span>
          </div>
        </div>
      </div>

      {/* Stages Section */}
      <div className="app-quick-section">
        <div className="app-quick-section-header-row">
          <span className="app-quick-section-header" style={{ marginBottom: 0 }}>STAGES</span>
          <span className="app-quick-section-hint">Run in parallel</span>
        </div>
        <div className="app-quick-stages-list">
          {stages.map((st: StageItem) => {
            const status = st.status || 'NOT_STARTED';
            let cardClass = 'is-not-started';
            let statusText = 'Not started';
            let statusColor = '#94a3b8';
            let subtitle = 'Can be started anytime';
            let StatusIcon: any = Circle;
            let statusIconProps: any = { size: 14, strokeWidth: 1.8, strokeDasharray: '2 2', style: { color: '#94a3b8' } };

            if (status === 'APPROVED') {
              cardClass = 'is-approved';
              statusText = 'Approved';
              statusColor = '#16a34a';
              subtitle = st.approvalSummary || 'All approval levels completed';
              StatusIcon = CircleCheck;
              statusIconProps = { size: 14, fill: '#16a34a', color: '#ffffff', strokeWidth: 2.5 };
            } else if (status === 'WAITING_APPROVAL') {
              cardClass = 'is-waiting';
              statusText = 'Waiting for approval';
              statusColor = '#d97706';
              subtitle = `Waiting on ${st.firstApprover || 'Credit Analyst (CA)'} · level 1 of 2`;
              StatusIcon = Clock;
              statusIconProps = { size: 14, strokeWidth: 2.5, style: { color: '#d97706' } };
            } else if (status === 'NEEDS_CHANGES') {
              cardClass = 'is-needs-changes';
              statusText = 'Needs changes';
              statusColor = '#dc2626';
              subtitle = st.returnedBy ? `Changes requested by ${st.returnedBy}` : 'Revise the form, then resubmit for approval.';
              StatusIcon = CircleAlert;
              statusIconProps = { size: 14, fill: '#dc2626', color: '#ffffff', strokeWidth: 2.5 };
            } else if (status === 'IN_PROGRESS') {
              cardClass = 'is-in-progress';
              statusText = 'In progress';
              statusColor = '#2563eb';
              subtitle = 'Form is being filled — not submitted yet';
              StatusIcon = HalfCircleIcon;
              statusIconProps = { size: 14, strokeWidth: 2, color: '#2563eb' };
            }

            // Documents info
            const reqCount = st.requiredCount ?? (st.mandatoryDocs ? st.mandatoryDocs.filter((d: any) => d.isMandatory).length : 0);
            const upCount = st.uploadedCount ?? (st.mandatoryDocs ? st.mandatoryDocs.filter((d: any) => d.isUploaded).length : 0);
            let docsText = '';
            if (reqCount > 0) {
              docsText = `Documents ${upCount} of ${reqCount} required`;
            } else if (st.mandatoryDocs && st.mandatoryDocs.length > 0) {
              docsText = `Documents ${upCount} of ${st.mandatoryDocs.length} optional`;
            } else {
              docsText = 'Documents 0 optional';
            }

            return (
              <div key={st.code} className={`app-quick-stage-card ${cardClass}`}>
                <div className="app-quick-stage-card-top">
                  <div className="app-quick-stage-card-title-group">
                    <span className={`app-quick-stage-icon-wrap ${cardClass}`}>
                      <StatusIcon {...statusIconProps} />
                    </span>
                    <span className="app-quick-stage-name">{st.name}</span>
                  </div>
                  <span className="app-quick-stage-status-label" style={{ color: statusColor }}>
                    {statusText}
                  </span>
                </div>
                <div className="app-quick-stage-desc">{subtitle}</div>
                <div className="app-quick-stage-card-bottom">
                  <div className="app-quick-stage-docs-info">
                    <FileText size={13} className="app-quick-stage-docs-icon" />
                    <span>{docsText}</span>
                  </div>
                  <button
                    type="button"
                    className="app-quick-stage-open-btn"
                    onClick={e => {
                      e.stopPropagation();
                      const targetTab = getStageTargetTab(st);
                      onOpen(app.application_number || app.id, targetTab);
                    }}
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export const ApplicationTable = forwardRef<ApplicationTableHandle, ApplicationTableProps>(
  function ApplicationTable(
    {
      rows,
      open,
      compact = false,
      documentMode = false,
      highlightId,
      onViewAll,
    },
    ref
  ) {
  const master = useMasterData();
  const {reload} = useCrm();
  const [search, setSearch] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [tempBranches, setTempBranches] = useState<Set<string>>(new Set());
  const [branchSearch, setBranchSearch] = useState('');
  const branchPopoverRef = useRef<HTMLDivElement>(null);

  // Stage & Status Filter
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false);
  const [tempStage, setTempStage] = useState<string>('Pre-analysis');
  const [tempStatuses, setTempStatuses] = useState<Set<string>>(new Set());
  const stagePopoverRef = useRef<HTMLDivElement>(null);

  // User & Team Filter
  const [usersData, setUsersData] = useState<{
    users: { id: number; username: string; fullName: string | null; deptId: number | null; departmentName: string | null; departmentCode: string | null; roleName?: string | null }[];
    departments: { id: number; code: string; name: string }[];
  }>({ users: [], departments: [] });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [tempUserIds, setTempUserIds] = useState<Set<number>>(new Set());
  const [userSearch, setUserSearch] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const userPopoverRef = useRef<HTMLDivElement>(null);

  // Date Range Filter
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [dateQuickRange, setDateQuickRange] = useState<string>('ALL');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
  const [tempQuickRange, setTempQuickRange] = useState<string>('CUSTOM');
  const [tempFromInput, setTempFromInput] = useState<string>('');
  const [tempToInput, setTempToInput] = useState<string>('');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());
  const datePopoverRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(compact ? 5 : 8);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickViewApp, setQuickViewApp] = useState<any | null>(null);
  const [changePicOpen, setChangePicOpen] = useState(false);
  const [mktPicOptions, setMktPicOptions] = useState<{id: number; name: string; username: string}[]>([]);
  const [mktPicLoading, setMktPicLoading] = useState(false);
  const [selectedNewPicId, setSelectedNewPicId] = useState<number | ''>('');
  const [picSearch, setPicSearch] = useState('');
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [sortField, setSortField] = useState<'company' | 'applied' | 'updated' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const currentQuickViewApp = quickViewApp ? rows.find(r => r.id === quickViewApp.id) || quickViewApp : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && quickViewApp) {
        setQuickViewApp(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewApp]);

  // Load users & departments from backend
  useEffect(() => {
    api('/users-and-departments')
      .then(res => {
        if (res && Array.isArray(res.users)) {
          setUsersData(res);
        }
      })
      .catch(() => {
        api('/marketing-pics')
          .then(data => {
            if (Array.isArray(data)) {
              setUsersData({
                users: data.map((u: any) => ({
                  id: u.id,
                  username: u.username,
                  fullName: u.fullName || null,
                  deptId: null,
                  departmentName: u.departmentName || null,
                  departmentCode: u.departmentCode || null,
                })),
                departments: [],
              });
            }
          })
          .catch(() => {});
      });
  }, []);

  // Collect distinct branches from database master branch catalog + any branches from rows
  const branchList = useMemo(() => {
    const set = new Set<string>();
    // 1. From database master branch catalog (crm_master_branches)
    if (Array.isArray(master.branchCode)) {
      for (const b of master.branchCode) {
        if (b.value) set.add(b.value);
        else if (b.name) set.add(b.name);
      }
    }
    // 2. Combine with rows if any
    for (const r of rows) {
      if (r.branch_code) set.add(r.branch_code);
    }
    return Array.from(set).sort();
  }, [master.branchCode, rows]);

  // Click outside to close branch popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchPopoverRef.current && !branchPopoverRef.current.contains(event.target as Node)) {
        setBranchPopoverOpen(false);
      }
    }
    if (branchPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [branchPopoverOpen]);

  const openBranchPopover = () => {
    setTempBranches(new Set(selectedBranches));
    setBranchSearch('');
    setBranchPopoverOpen(prev => !prev);
  };

  const displayedBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branchList;
    return branchList.filter(b => b.toLowerCase().includes(q));
  }, [branchList, branchSearch]);

  const toggleTempBranch = (code: string) => {
    setTempBranches(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      setSelectedBranches(Array.from(next));
      return next;
    });
  };

  const handleSelectAllBranches = () => {
    setTempBranches(new Set(branchList));
    setSelectedBranches(branchList);
  };

  const handleClearBranches = () => {
    setTempBranches(new Set());
    setSelectedBranches([]);
  };

  const handleApplyBranches = () => {
    setSelectedBranches(Array.from(tempBranches));
    setBranchPopoverOpen(false);
  };

  const branchButtonLabel = useMemo(() => {
    if (selectedBranches.length === 0) return 'Branch: All';
    if (selectedBranches.length === 1) return `Branch: ${selectedBranches[0]}`;
    return `Branch: ${selectedBranches.length} selected`;
  }, [selectedBranches]);

  // Stage & Status Filter handlers
  const openStagePopover = () => {
    setTempStage(selectedStage || 'Pre-analysis');
    setTempStatuses(new Set(selectedStatuses));
    setStagePopoverOpen(prev => !prev);
  };

  const handleSelectStage = (stageKey: string) => {
    setTempStage(stageKey);
    if (tempStatuses.size > 0) {
      setSelectedStage(stageKey);
      setSelectedStatuses(Array.from(tempStatuses));
    }
  };

  const toggleTempStatus = (key: string) => {
    setTempStatuses(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);

      const stage = tempStage || selectedStage || 'Pre-analysis';
      if (next.size === 0) {
        setSelectedStage(null);
        setSelectedStatuses([]);
      } else {
        setSelectedStage(stage);
        setSelectedStatuses(Array.from(next));
      }

      return next;
    });
  };

  const handleSelectAllStatuses = () => {
    let next: Set<string>;
    if (tempStatuses.size === STATUS_OPTIONS.length) {
      next = new Set();
    } else {
      next = new Set(STATUS_OPTIONS.map(s => s.key));
    }
    setTempStatuses(next);

    const stage = tempStage || selectedStage || 'Pre-analysis';
    if (next.size === 0) {
      setSelectedStage(null);
      setSelectedStatuses([]);
    } else {
      setSelectedStage(stage);
      setSelectedStatuses(Array.from(next));
    }
  };

  const handleClearStageFilter = () => {
    setTempStatuses(new Set());
    setSelectedStage(null);
    setSelectedStatuses([]);
  };

  const handleApplyStageFilter = () => {
    if (tempStatuses.size === 0) {
      setSelectedStage(null);
      setSelectedStatuses([]);
    } else {
      setSelectedStage(tempStage || 'Pre-analysis');
      setSelectedStatuses(Array.from(tempStatuses));
    }
    setStagePopoverOpen(false);
  };

  const stageButtonLabel = useMemo(() => {
    if (!selectedStage || selectedStatuses.length === 0) {
      if (selectedStage) return `Stage: ${selectedStage}`;
      return 'Stage: All';
    }
    if (selectedStatuses.length === STATUS_OPTIONS.length) {
      return `Stage: ${selectedStage} · All`;
    }
    if (selectedStatuses.length === 1) {
      const s = selectedStatuses[0];
      const statusShortMap: Record<string, string> = {
        WAITING_APPROVAL: 'Waiting',
        APPROVED: 'Approved',
        NEEDS_CHANGES: 'Changes',
        IN_PROGRESS: 'In prog.',
        NOT_STARTED: 'Not started',
      };
      return `Stage: ${selectedStage} · ${statusShortMap[s] || s}`;
    }
    return `Stage: ${selectedStage} · ${selectedStatuses.length} selected`;
  }, [selectedStage, selectedStatuses]);

  // Click outside to close stage popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stagePopoverRef.current && !stagePopoverRef.current.contains(event.target as Node)) {
        setStagePopoverOpen(false);
      }
    }
    if (stagePopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [stagePopoverOpen]);

  // Click outside to close user popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userPopoverRef.current && !userPopoverRef.current.contains(event.target as Node)) {
        setUserPopoverOpen(false);
      }
    }
    if (userPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userPopoverOpen]);

  // Types for User & Team Filter
  type UserFilterItem = {
    id: number;
    name: string;
    username: string;
    initials: string;
    roleTag: string;
  };

  type SubTeamGroup = {
    code: string;
    name: string;
    badgeClass: string;
    users: UserFilterItem[];
  };

  type TeamGroup = {
    code: string;
    badgeCode?: string;
    name: string;
    badgeClass: string;
    users: UserFilterItem[];
    subTeams?: SubTeamGroup[];
  };

  // Build teams list containing only users who have created applications
  const teamsList = useMemo<TeamGroup[]>(() => {
    // 1. Gather all marketing PIC users who have created at least one application
    const activePicMap = new Map<number, {
      id: number;
      name: string;
      username: string;
      initials: string;
      roleTag: string;
      deptId: number | null;
      departmentCode: string;
      departmentName: string;
    }>();

    for (const r of rows) {
      const picId = Number(r.mkt_pic_id || r.mktPicId);
      if (!picId || isNaN(picId) || activePicMap.has(picId)) continue;

      const u = usersData.users.find(user => user.id === picId);
      const displayName = u?.fullName || r.mkt_pic_name || u?.username || r.mkt_pic_username || `User #${picId}`;
      const username = u?.username || r.mkt_pic_username || `user${picId}`;
      const deptCode = (u?.departmentCode || r.mkt_pic_dept_code || 'OTHER').toUpperCase();
      const deptName = u?.departmentName || r.mkt_pic_dept_name || deptCode;
      const roleTag = (u as any)?.roleName || (deptCode === 'MARKETING' || deptCode === 'MKT' ? 'PIC marketing' : deptName);

      activePicMap.set(picId, {
        id: picId,
        name: displayName,
        username,
        initials: getInitials(displayName, picId),
        roleTag,
        deptId: u?.deptId ?? (r.mkt_pic_dept_id ? Number(r.mkt_pic_dept_id) : null),
        departmentCode: deptCode,
        departmentName: deptName,
      });
    }

    // 2. Group the active PICs by their department
    const deptMap = new Map<string, {
      code: string;
      badgeCode: string;
      name: string;
      badgeClass: string;
      users: UserFilterItem[];
    }>();

    for (const user of activePicMap.values()) {
      const code = user.departmentCode || 'OTHER';
      const officialDept = usersData.departments?.find(
        d => (d.code || '').toUpperCase() === code || (user.deptId && d.id === user.deptId)
      );
      const name = officialDept?.name || user.departmentName || code;

      let badgeClass = 'other';
      const c = code.toUpperCase();
      if (c === 'MKT' || c === 'MARKETING') badgeClass = 'mkt';
      else if (c === 'BS' || c === 'BP' || c.includes('SUPPORT') || c.includes('PARTNER')) badgeClass = 'bs';
      else if (c === 'CA' || c.includes('ANALYST')) badgeClass = 'ca';
      else if (c.startsWith('LEGAL')) badgeClass = 'legal';
      else if (c === 'MGT' || c === 'RISK_MGT' || c.includes('MANAGEMENT') || c.includes('DIR')) badgeClass = 'mgt';

      const badgeCode = (c === 'MARKETING' || c === 'MKT') ? 'MKT' : (officialDept?.code || code);

      if (!deptMap.has(code)) {
        deptMap.set(code, {
          code: officialDept?.code || user.departmentCode,
          badgeCode,
          name,
          badgeClass,
          users: [],
        });
      }

      deptMap.get(code)!.users.push({
        id: user.id,
        name: user.name,
        username: user.username,
        initials: user.initials,
        roleTag: user.roleTag,
      });
    }

    // 3. Sort departments: MARKETING first, then BP/BS, CA, DS, etc., or alphabetically
    const deptOrder: Record<string, number> = {
      MARKETING: 1,
      MKT: 1,
      BP: 2,
      BS: 2,
      CA: 3,
      DS: 4,
    };

    const result: TeamGroup[] = Array.from(deptMap.values())
      .sort((a, b) => {
        const orderA = deptOrder[a.code.toUpperCase()] ?? 99;
        const orderB = deptOrder[b.code.toUpperCase()] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      })
      .map(dept => ({
        code: dept.code,
        badgeCode: dept.badgeCode,
        name: dept.name,
        badgeClass: dept.badgeClass,
        users: dept.users.sort((u1, u2) => u1.name.localeCompare(u2.name)),
      }));

    return result;
  }, [usersData.users, usersData.departments, rows]);

  const displayedTeams = useMemo<TeamGroup[]>(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return teamsList;
    return teamsList
      .map(team => {
        const teamMatches = team.name.toLowerCase().includes(q) || team.code.toLowerCase().includes(q);

        if (team.subTeams && team.subTeams.length > 0) {
          if (teamMatches) return team;
          const filteredSubTeams = team.subTeams
            .map(sub => {
              const subMatches = sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q);
              const filteredUsers = sub.users.filter(
                u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
              );
              if (subMatches) return sub;
              if (filteredUsers.length > 0) {
                return { ...sub, users: filteredUsers };
              }
              return null;
            })
            .filter((s): s is SubTeamGroup => Boolean(s));

          if (filteredSubTeams.length > 0) {
            return {
              ...team,
              subTeams: filteredSubTeams,
              users: filteredSubTeams.flatMap(s => s.users),
            };
          }
          return null;
        }

        const filteredUsers = team.users.filter(
          u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
        );
        if (teamMatches) return team;
        if (filteredUsers.length > 0) {
          return { ...team, users: filteredUsers };
        }
        return null;
      })
      .filter((t): t is TeamGroup => Boolean(t));
  }, [teamsList, userSearch]);

  useEffect(() => {
    if (userSearch.trim()) {
      const keysToExpand = new Set<string>();
      for (const t of displayedTeams) {
        keysToExpand.add(t.code);
        if (t.subTeams) {
          for (const s of t.subTeams) {
            keysToExpand.add(`${t.code}:${s.code}`);
          }
        }
      }
      setExpandedTeams(keysToExpand);
    }
  }, [userSearch, displayedTeams]);

  // User Filter Handlers
  const openUserPopover = () => {
    setTempUserIds(new Set(selectedUserIds));
    setUserSearch('');
    setExpandedTeams(new Set());
    setUserPopoverOpen(prev => !prev);
  };

  const toggleExpandTeam = (teamCode: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamCode)) next.delete(teamCode);
      else next.add(teamCode);
      return next;
    });
  };

  const toggleTeamUsers = (teamCode: string) => {
    const team = teamsList.find(t => t.code === teamCode);
    if (!team || !team.users.length) return;
    const teamIds = team.users.map(u => u.id);
    const allChecked = teamIds.every(id => tempUserIds.has(id));

    setTempUserIds(prev => {
      const next = new Set(prev);
      if (allChecked) {
        for (const id of teamIds) next.delete(id);
      } else {
        for (const id of teamIds) next.add(id);
      }
      setSelectedUserIds(Array.from(next));
      return next;
    });
  };

  const toggleSubTeamUsers = (users: { id: number }[]) => {
    if (!users.length) return;
    const subIds = users.map(u => u.id);
    const allChecked = subIds.every(id => tempUserIds.has(id));

    setTempUserIds(prev => {
      const next = new Set(prev);
      if (allChecked) {
        for (const id of subIds) next.delete(id);
      } else {
        for (const id of subIds) next.add(id);
      }
      setSelectedUserIds(Array.from(next));
      return next;
    });
  };

  const toggleTempUser = (userId: number) => {
    setTempUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      setSelectedUserIds(Array.from(next));
      return next;
    });
  };

  const handleClearUserFilter = () => {
    setTempUserIds(new Set());
    setSelectedUserIds([]);
  };

  const handleApplyUserFilter = () => {
    setSelectedUserIds(Array.from(tempUserIds));
    setUserPopoverOpen(false);
  };

  // Click outside to close date popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target as Node)) {
        setDatePopoverOpen(false);
      }
    }
    if (datePopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [datePopoverOpen]);

  const openDatePopover = () => {
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setTempQuickRange(dateQuickRange === 'ALL' ? 'CUSTOM' : dateQuickRange);
    setTempFromInput(dateFrom ? formatInputDate(dateFrom) : '');
    setTempToInput(dateTo ? formatInputDate(dateTo) : '');
    if (dateTo) {
      setCalendarViewDate(new Date(dateTo.getFullYear(), dateTo.getMonth(), 1));
    } else if (dateFrom) {
      setCalendarViewDate(new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1));
    } else {
      const now = new Date();
      setCalendarViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setDatePopoverOpen(prev => !prev);
  };

  const handleSelectQuickRange = (rangeKey: string) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    if (rangeKey === 'TODAY') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (rangeKey === 'YESTERDAY') {
      const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      from = yest;
      to = yest;
    } else if (rangeKey === '7D') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (rangeKey === '30D') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (rangeKey === 'THIS_MONTH') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (rangeKey === 'LAST_MONTH') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (rangeKey === 'CUSTOM') {
      setTempQuickRange('CUSTOM');
      return;
    }

    setTempQuickRange(rangeKey);
    setTempDateFrom(from);
    setTempDateTo(to);
    setTempFromInput(formatInputDate(from));
    setTempToInput(formatInputDate(to));
    if (to) {
      setCalendarViewDate(new Date(to.getFullYear(), to.getMonth(), 1));
    }
    setDateFrom(from);
    setDateTo(to);
    setDateQuickRange(rangeKey);
  };

  const handleDayClick = (clickedDate: Date) => {
    setTempQuickRange('CUSTOM');
    if (!tempDateFrom || (tempDateFrom && tempDateTo)) {
      setTempDateFrom(clickedDate);
      setTempDateTo(null);
      setTempFromInput(formatInputDate(clickedDate));
      setTempToInput('');
    } else {
      if (clickedDate.getTime() < tempDateFrom.getTime()) {
        setTempDateTo(tempDateFrom);
        setTempDateFrom(clickedDate);
        setTempFromInput(formatInputDate(clickedDate));
        setTempToInput(formatInputDate(tempDateFrom));
      } else {
        setTempDateTo(clickedDate);
        setTempToInput(formatInputDate(clickedDate));
      }
    }
  };

  const handleFromInputChange = (val: string) => {
    setTempFromInput(val);
    const parsed = parseDateInput(val);
    if (parsed) {
      setTempDateFrom(parsed);
      setTempQuickRange('CUSTOM');
      setCalendarViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  };

  const handleToInputChange = (val: string) => {
    setTempToInput(val);
    const parsed = parseDateInput(val);
    if (parsed) {
      setTempDateTo(parsed);
      setTempQuickRange('CUSTOM');
      setCalendarViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  };

  const handleApplyDateFilter = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setDateQuickRange(tempQuickRange);
    setDatePopoverOpen(false);
  };

  const handleCancelDateFilter = () => {
    setDatePopoverOpen(false);
  };

  const selectedDaysCount = useMemo(() => {
    if (!tempDateFrom) return 0;
    if (!tempDateTo) return 1;
    const diffTime = Math.abs(tempDateTo.getTime() - tempDateFrom.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [tempDateFrom, tempDateTo]);

  const rightMonthDate = useMemo(() => {
    return new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
  }, [calendarViewDate]);

  const leftMonthDate = useMemo(() => {
    return new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
  }, [calendarViewDate]);

  const leftMonthDays = useMemo(() => {
    return getMonthCalendarDays(leftMonthDate.getFullYear(), leftMonthDate.getMonth());
  }, [leftMonthDate]);

  const rightMonthDays = useMemo(() => {
    return getMonthCalendarDays(rightMonthDate.getFullYear(), rightMonthDate.getMonth());
  }, [rightMonthDate]);

  const dateButtonLabel = useMemo(() => {
    if (!dateFrom && !dateTo) {
      return 'Date: Any time';
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (dateFrom && dateTo) {
      if (isSameDay(dateFrom, dateTo)) {
        return `Date: ${dateFrom.getDate()} ${months[dateFrom.getMonth()]} ${dateFrom.getFullYear()}`;
      }
      if (dateFrom.getMonth() === dateTo.getMonth() && dateFrom.getFullYear() === dateTo.getFullYear()) {
        return `Date: ${dateFrom.getDate()} – ${dateTo.getDate()} ${months[dateTo.getMonth()]} ${dateTo.getFullYear()}`;
      }
      if (dateFrom.getFullYear() === dateTo.getFullYear()) {
        return `Date: ${dateFrom.getDate()} ${months[dateFrom.getMonth()]} – ${dateTo.getDate()} ${months[dateTo.getMonth()]} ${dateTo.getFullYear()}`;
      }
      return `Date: ${dateFrom.getDate()} ${months[dateFrom.getMonth()]} ${dateFrom.getFullYear()} – ${dateTo.getDate()} ${months[dateTo.getMonth()]} ${dateTo.getFullYear()}`;
    }
    if (dateFrom) {
      return `Date: From ${dateFrom.getDate()} ${months[dateFrom.getMonth()]} ${dateFrom.getFullYear()}`;
    }
    if (dateTo) {
      return `Date: Up to ${dateTo.getDate()} ${months[dateTo.getMonth()]} ${dateTo.getFullYear()}`;
    }
    return 'Date: Any time';
  }, [dateFrom, dateTo]);

  const userButtonLabel = useMemo(() => {
    if (selectedUserIds.length === 0) return 'User: All';
    if (selectedUserIds.length === 1) {
      const id = selectedUserIds[0];
      for (const team of teamsList) {
        const u = team.users.find(x => x.id === id);
        if (u) return `User: ${u.name}`;
      }
      return `User: #${id}`;
    }
    for (const team of teamsList) {
      const teamIds = team.users.map(u => u.id);
      if (
        teamIds.length > 0 &&
        teamIds.length === selectedUserIds.length &&
        teamIds.every(id => selectedUserIds.includes(id))
      ) {
        return `User: ${team.name}`;
      }
    }
    return `User: ${selectedUserIds.length} selected`;
  }, [selectedUserIds, teamsList]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedBranches.length > 0 ||
      selectedStage !== null ||
      selectedStatuses.length > 0 ||
      selectedUserIds.length > 0 ||
      dateFrom !== null ||
      dateTo !== null
  );

  const clearAllFilters = () => {
    setSearch('');
    setSelectedBranches([]);
    setSelectedStage(null);
    setSelectedStatuses([]);
    setSelectedUserIds([]);
    setDateFrom(null);
    setDateTo(null);
    setDateQuickRange('ALL');
  };

  // Collect distinct stages
  const stageList = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (Array.isArray(r.stages)) {
        for (const s of r.stages) {
          if (s.name && !map.has(s.code)) map.set(s.code, s.name);
        }
      }
    }
    if (!map.size) {
      map.set('FAP-STAGE', 'FAP');
      map.set('PRE-ANALYSIS', 'Pre-analysis');
      map.set('ICLF', 'ICLF');
    }
    return Array.from(map.entries()).map(([code, name]) => ({code, name}));
  }, [rows]);

  // Collect distinct users (PIC Marketing)
  const userList = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const u = r.mkt_pic_name || (r.mkt_pic_id ? `User #${r.mkt_pic_id}` : null);
      if (u) set.add(u);
    }
    return Array.from(set).sort();
  }, [rows]);

  // Filter rows
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter(r => {
      // Search / Free-text Name Filter
      if (q) {
        const text = [
          r.company_name,
          r.customer_name,
          r.applicant_name,
          r.application_number,
          r.fap_number,
          r.branch_code,
          r.mkt_pic_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!text.includes(q)) return false;
      }

      // Branch (Multi-select)
      if (selectedBranches.length > 0) {
        if (!r.branch_code || !selectedBranches.includes(r.branch_code)) {
          return false;
        }
      }

      // Stage & Status
      if (selectedStage) {
        const stages: StageItem[] = r.stages || [];
        const targetStage = stages.find(
          s =>
            s.name.toLowerCase() === selectedStage.toLowerCase() ||
            s.code.toLowerCase().replace(/[-_ ]/g, '') === selectedStage.toLowerCase().replace(/[-_ ]/g, '') ||
            (selectedStage === 'Pre-analysis' && s.code.toUpperCase().includes('PRE')) ||
            (selectedStage === 'FAP' && s.code.toUpperCase().includes('FAP')) ||
            (selectedStage === 'ICLF' && (s.code.toUpperCase().includes('ICLF') || s.code.toUpperCase().includes('NEW-STAGE')))
        );
        if (!targetStage) return false;
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(targetStage.status)) {
          return false;
        }
      }

      // User
      if (selectedUserIds.length > 0) {
        const picId = r.mkt_pic_id ? Number(r.mkt_pic_id) : null;
        const picName = r.mkt_pic_name || (r.mkt_pic_id ? `User #${r.mkt_pic_id}` : '');
        const matches = selectedUserIds.some(id => {
          if (picId === id) return true;
          if (picName === `User #${id}`) return true;
          return false;
        });
        if (!matches) return false;
      }

      // Date Range Filter
      if (dateFrom || dateTo) {
        const appliedDate = new Date(r.created_at || r.application_date);
        if (!isNaN(appliedDate.getTime())) {
          if (dateFrom) {
            const start = new Date(dateFrom);
            start.setHours(0, 0, 0, 0);
            if (appliedDate < start) return false;
          }
          if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            if (appliedDate > end) return false;
          }
        } else {
          return false;
        }
      }

      return true;
    });
  }, [rows, search, selectedBranches, selectedStage, selectedStatuses, selectedUserIds, dateFrom, dateTo]);

  // Sort rows
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      if (sortField === 'company') {
        const cmp = String(a.company_name || '').localeCompare(String(b.company_name || ''));
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'applied') {
        const da = new Date(a.created_at || a.application_date).getTime() || 0;
        const db = new Date(b.created_at || b.application_date).getTime() || 0;
        return sortOrder === 'asc' ? da - db : db - da;
      }
      if (sortField === 'updated') {
        const da = new Date(a.updated_at || a.created_at || a.application_date).getTime() || 0;
        const db = new Date(b.updated_at || b.created_at || b.application_date).getTime() || 0;
        return sortOrder === 'asc' ? da - db : db - da;
      }
      return 0;
    });
  }, [filtered, sortField, sortOrder]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [search, selectedBranches, selectedStage, selectedStatuses, selectedUserIds, dateFrom, dateTo, sortField, sortOrder, pageSize]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = useMemo(() => {
    return sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [sorted, currentPage, pageSize]);

  // Checkbox select all
  const allVisibleSelected = visible.length > 0 && visible.every(r => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0 && !allVisibleSelected;
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map(r => r.id)));
    }
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(sorted.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedRows = useMemo(() => {
    const inSorted = sorted.filter(r => selectedIds.has(r.id));
    if (inSorted.length === selectedIds.size) return inSorted;
    const seen = new Set(inSorted.map(r => r.id));
    const extra = rows.filter(r => selectedIds.has(r.id) && !seen.has(r.id));
    return [...inSorted, ...extra];
  }, [sorted, rows, selectedIds]);

  const STAGE_STATUS_EXPORT_LABEL: Record<string, string> = {
    APPROVED: 'Approved',
    WAITING_APPROVAL: 'Waiting for approval',
    NEEDS_CHANGES: 'Needs changes',
    IN_PROGRESS: 'In progress',
    NOT_STARTED: 'Not started',
  };

  function exportSelectedExcel() {
    if (!selectedRows.length) return;
    const data = selectedRows.map(r => {
      const stages: StageItem[] = Array.isArray(r.stages) ? r.stages : [];
      const stageLabel = (code: string, fallbackName: string) => {
        const found = stages.find(
          s => s.code === code || s.name.toLowerCase() === fallbackName.toLowerCase(),
        );
        return found ? STAGE_STATUS_EXPORT_LABEL[found.status] || found.status : 'Not started';
      };
      return {
        Application: r.application_number || r.fap_number || '',
        Company: r.company_name || '',
        Branch: r.branch_code || '',
        'PIC Marketing': r.mkt_pic_name || (r.mkt_pic_id ? `User #${r.mkt_pic_id}` : ''),
        'Amount (IDR)': Number(r.financing_value || 0),
        FAP: stageLabel('FAP-STAGE', 'FAP'),
        'Pre-analysis': stageLabel('PRE-ANALYSIS', 'Pre-analysis'),
        ICLF: stageLabel('ICLF', 'ICLF'),
        Applied: formatDisplayDate(r.created_at || r.application_date),
        Updated: formatDisplayDate(r.updated_at || r.created_at || r.application_date),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      {wch: 18},
      {wch: 36},
      {wch: 10},
      {wch: 22},
      {wch: 18},
      {wch: 20},
      {wch: 20},
      {wch: 20},
      {wch: 14},
      {wch: 14},
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');
    XLSX.writeFile(workbook, 'applications-selected.xlsx');
  }

  async function openChangePicModal() {
    setBulkFeedback(null);
    setPicSearch('');
    setSelectedNewPicId('');
    setChangePicOpen(true);
    setMktPicLoading(true);
    try {
      const list = await api('/applications/mkt-pics');
      if (Array.isArray(list)) {
        setMktPicOptions(list);
      }
    } catch {
      // Fallback to usersData.users if mkt-pics endpoint is restricted
      if (usersData.users.length) {
        setMktPicOptions(
          usersData.users.map(u => ({
            id: u.id,
            name: u.fullName || u.username,
            username: u.username,
          })),
        );
      }
    } finally {
      setMktPicLoading(false);
    }
  }

  async function handleConfirmChangePic() {
    if (!selectedNewPicId || !selectedIds.size) return;
    setBulkBusy(true);
    setBulkFeedback(null);
    try {
      const res = await api('/applications/bulk/change-pic', 'POST', {
        applicationIds: Array.from(selectedIds),
        mktPicId: Number(selectedNewPicId),
      });
      await reload();
      setChangePicOpen(false);
      setSelectedIds(new Set());
      setBulkFeedback({
        type: 'success',
        message: `Marketing PIC updated to ${res?.mktPicName || 'selected user'} for ${res?.updatedCount ?? selectedIds.size} application(s).`,
      });
    } catch (err: any) {
      setBulkFeedback({
        type: 'error',
        message: err?.message || 'Failed to update Marketing PIC.',
      });
    } finally {
      setBulkBusy(false);
    }
  }

  function openReminderModal() {
    setBulkFeedback(null);
    setReminderNote('');
    setReminderOpen(true);
  }

  async function handleConfirmReminder() {
    if (!selectedIds.size) return;
    setBulkBusy(true);
    setBulkFeedback(null);
    try {
      const res = await api('/applications/bulk/document-reminder', 'POST', {
        applicationIds: Array.from(selectedIds),
        note: reminderNote.trim() || undefined,
      });
      setReminderOpen(false);
      setSelectedIds(new Set());
      const skippedText = res?.skippedCount ? ` (${res.skippedCount} skipped without Marketing PIC)` : '';
      setBulkFeedback({
        type: 'success',
        message: `Document reminder sent to ${res?.recipientCount ?? 0} user(s) for ${res?.sentCount ?? 0} application(s)${skippedText}.`,
      });
    } catch (err: any) {
      setBulkFeedback({
        type: 'error',
        message: err?.message || 'Failed to send document reminder.',
      });
    } finally {
      setBulkBusy(false);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: 'company' | 'applied' | 'updated') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'company' ? 'asc' : 'desc');
    }
  };

  function exportCsv() {
    const lines = [
      ['Application', 'Company', 'Branch', 'PIC Marketing', 'Amount (IDR)', 'Applied Date', 'Updated Date'],
      ...filtered.map(r => [
        r.application_number || r.fap_number || '',
        r.company_name || '',
        r.branch_code || '',
        r.mkt_pic_name || (r.mkt_pic_id ? `User #${r.mkt_pic_id}` : ''),
        r.financing_value || 0,
        formatDisplayDate(r.created_at || r.application_date),
        formatDisplayDate(r.updated_at || r.created_at || r.application_date),
      ]),
    ];
    const csv = lines
      .map(r =>
        r
          .map(
            v =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "' $&")
                .replaceAll('"', '""') +
              '"'
          )
          .join(',')
      )
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applications-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  useImperativeHandle(ref, () => ({
    exportCsv,
  }));

  return (
    <>
    <section className="app-table-panel">
      {bulkFeedback && (
        <div className={`app-bulk-feedback app-bulk-feedback--${bulkFeedback.type}`}>
          <span>{bulkFeedback.message}</span>
          <button
            type="button"
            className="app-bulk-feedback-close"
            onClick={() => setBulkFeedback(null)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {selectedIds.size > 0 ? (
        <div className="app-bulk-toolbar">
          <div className="app-bulk-left">
            <button
              type="button"
              className="app-bulk-check-btn"
              onClick={clearSelection}
              title="Clear selection"
              aria-label="Clear selection"
            >
              {allVisibleSelected && selectedIds.size >= sorted.length ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                <Minus size={12} strokeWidth={3} />
              )}
            </button>
            <span className="app-bulk-count">{selectedIds.size} selected</span>
            <span className="app-bulk-divider" />
            {selectedIds.size < sorted.length ? (
              <button
                type="button"
                className="app-bulk-select-all-link"
                onClick={selectAllFiltered}
              >
                Select all {sorted.length} applications
              </button>
            ) : (
              <span className="app-bulk-all-selected-label">
                All {sorted.length} applications selected
              </span>
            )}
          </div>

          <div className="app-bulk-actions">
            <button
              type="button"
              className="app-bulk-btn"
              onClick={exportSelectedExcel}
            >
              <Download size={14} />
              <span>Export selected</span>
            </button>
            <button
              type="button"
              className="app-bulk-btn"
              onClick={openChangePicModal}
              disabled={bulkBusy}
            >
              <Users size={14} />
              <span>Change PIC</span>
            </button>
            <button
              type="button"
              className="app-bulk-btn"
              onClick={openReminderModal}
              disabled={bulkBusy}
            >
              <Bell size={14} />
              <span>Send document reminder</span>
            </button>
            <span className="app-bulk-divider" />
            <button
              type="button"
              className="app-bulk-btn app-bulk-btn--clear"
              onClick={clearSelection}
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : (
      /* Table Toolbar */
      <div className="app-table-toolbar">
        {/* Search Name Input (First on the left, matching Image 2) */}
        <div className="app-table-search">
          <Search size={15} className="app-table-search-icon" />
          <input
            type="text"
            placeholder="Search company or FAP number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="app-table-search-clear"
              onClick={() => setSearch('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Branch Filter (Multi-select from database master branch) */}
        <div className="app-table-select-wrapper" ref={branchPopoverRef}>
            <button
              type="button"
              className={`app-table-filter-select ${selectedBranches.length > 0 ? 'is-active' : ''}`}
              onClick={openBranchPopover}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textAlign: 'left',
              }}
            >
              <span>{branchButtonLabel}</span>
            </button>

            {branchPopoverOpen && (
              <div className="app-branch-dropdown-popover">
                {/* Search branch */}
                <div className="app-branch-search">
                  <Search size={13} className="app-branch-search-icon" />
                  <input
                    type="text"
                    placeholder="Search branch..."
                    value={branchSearch}
                    onChange={e => setBranchSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Header */}
                <div className="app-branch-popover-header">
                  <span className="app-branch-header-title">SELECT BRANCHES</span>
                  <button
                    type="button"
                    className="app-branch-header-select-all"
                    onClick={handleSelectAllBranches}
                  >
                    Select all
                  </button>
                </div>

                {/* List with checkboxes */}
                <div className="app-branch-list">
                  {displayedBranches.map(code => {
                    const isChecked = tempBranches.has(code);
                    return (
                      <div
                        key={code}
                        className={`app-branch-item ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleTempBranch(code)}
                      >
                        <input
                          type="checkbox"
                          className="app-table-checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{margin: 0}}
                        />
                        <span>{code}</span>
                      </div>
                    );
                  })}
                  {!displayedBranches.length && (
                    <div style={{fontSize: '11px', color: '#94a3b8', padding: '8px 0', textAlign: 'center'}}>
                      No branches found
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="app-branch-popover-footer">
                  <span className="app-branch-count">
                    {tempBranches.size === 1 ? '1 branch selected' : `${tempBranches.size} branches selected`}
                  </span>
                  <div className="app-branch-actions">
                    <button
                      type="button"
                      className="app-branch-clear-btn"
                      onClick={handleClearBranches}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="app-branch-apply-btn"
                      onClick={handleApplyBranches}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stage Filter (Stage segmented control + Status checkboxes) */}
          <div className="app-table-select-wrapper" ref={stagePopoverRef}>
            <button
              type="button"
              className={`app-table-filter-select ${selectedStage ? 'is-active' : ''}`}
              onClick={openStagePopover}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textAlign: 'left',
              }}
            >
              <span>{stageButtonLabel}</span>
            </button>

            {stagePopoverOpen && (
              <div className="app-stage-dropdown-popover">
                {/* Section 1: STAGE */}
                <div className="app-stage-popover-section">
                  <span className="app-stage-header-title">STAGE</span>
                  <div className="app-stage-segmented-control">
                    {STAGE_OPTIONS.map(st => (
                      <button
                        key={st.key}
                        type="button"
                        className={`app-stage-segment-btn ${tempStage === st.key ? 'active' : ''}`}
                        onClick={() => handleSelectStage(st.key)}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: STATUS */}
                <div className="app-stage-popover-section" style={{marginBottom: '8px'}}>
                  <div className="app-stage-status-header">
                    <span className="app-stage-header-title" style={{margin: 0}}>STATUS</span>
                    <button
                      type="button"
                      className="app-stage-select-all-btn"
                      onClick={handleSelectAllStatuses}
                    >
                      Select all
                    </button>
                  </div>

                  {/* Status List with Icons */}
                  <div className="app-stage-status-list">
                    {STATUS_OPTIONS.map(st => {
                      const isChecked = tempStatuses.has(st.key);
                      return (
                        <div
                          key={st.key}
                          className={`app-stage-status-item ${isChecked ? 'checked' : ''}`}
                          onClick={() => toggleTempStatus(st.key)}
                        >
                          <input
                            type="checkbox"
                            className="app-table-checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{margin: 0}}
                          />
                          <span className="app-stage-status-icon">
                            {st.key === 'NOT_STARTED' && (
                              <Circle size={13} strokeWidth={1.8} strokeDasharray="2 2" color="#94a3b8" />
                            )}
                            {st.key === 'IN_PROGRESS' && (
                              <HalfCircleIcon size={13} strokeWidth={2} color="#2563eb" />
                            )}
                            {st.key === 'WAITING_APPROVAL' && (
                              <Clock size={13} strokeWidth={2.5} color="#d97706" />
                            )}
                            {st.key === 'NEEDS_CHANGES' && (
                              <CircleAlert size={13} fill="#dc2626" color="#ffffff" strokeWidth={2.5} />
                            )}
                            {st.key === 'APPROVED' && (
                              <CircleCheck size={13} fill="#16a34a" color="#ffffff" strokeWidth={2.5} />
                            )}
                          </span>
                          <span>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="app-stage-popover-footer">
                  <span className="app-stage-count">
                    {tempStatuses.size === 1
                      ? '1 status selected'
                      : `${tempStatuses.size} statuses selected`}
                  </span>
                  <div className="app-stage-actions">
                    <button
                      type="button"
                      className="app-stage-clear-btn"
                      onClick={handleClearStageFilter}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="app-stage-apply-btn"
                      onClick={handleApplyStageFilter}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Filter (Department & User hierarchy) */}
          <div className="app-table-select-wrapper" ref={userPopoverRef}>
            <button
              type="button"
              className={`app-table-filter-select ${selectedUserIds.length > 0 ? 'is-active' : ''}`}
              onClick={openUserPopover}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textAlign: 'left',
              }}
            >
              <span>{userButtonLabel}</span>
            </button>

            {userPopoverOpen && (
              <div className="app-user-dropdown-popover">
                {/* Search */}
                <div className="app-user-search">
                  <Search size={13} className="app-user-search-icon" />
                  <input
                    type="text"
                    placeholder="Search user or team..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Subheader */}
                <div className="app-user-popover-subheader">
                  <span className="app-user-header-title">TEAMS</span>
                  <span className="app-user-header-hint">PIC or current approver</span>
                </div>

                {/* Teams & Users Tree */}
                <div className="app-user-teams-tree">
                  {displayedTeams.map(team => {
                    const isExpanded = expandedTeams.has(team.code);
                    const teamUserIds = team.users.map(u => u.id);
                    const checkedCount = teamUserIds.filter(id => tempUserIds.has(id)).length;
                    const isAllChecked = teamUserIds.length > 0 && checkedCount === teamUserIds.length;
                    const isSomeChecked = checkedCount > 0 && checkedCount < teamUserIds.length;
                    const hasSubTeams = Boolean(team.subTeams && team.subTeams.length > 0);

                    return (
                      <div key={team.code} className="app-team-group">
                        <div
                          className="app-team-row"
                          onClick={() => toggleExpandTeam(team.code)}
                        >
                          <span
                            className="app-team-chevron"
                            onClick={e => {
                              e.stopPropagation();
                              toggleExpandTeam(team.code);
                            }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                          <input
                            type="checkbox"
                            className="app-table-checkbox"
                            checked={isAllChecked}
                            ref={el => {
                              if (el) el.indeterminate = isSomeChecked;
                            }}
                            onChange={() => toggleTeamUsers(team.code)}
                            onClick={e => e.stopPropagation()}
                            style={{margin: 0}}
                          />
                          <span className={`app-team-badge app-team-badge--${team.badgeClass}`}>
                            {team.badgeCode || team.code}
                          </span>
                          <span className="app-team-name">{team.name}</span>
                        </div>

                        {/* Indented children */}
                        {isExpanded && (
                          hasSubTeams ? (
                            <div className="app-subteams-list">
                              {team.subTeams!.map(subTeam => {
                                const subKey = `${team.code}:${subTeam.code}`;
                                const isSubExpanded = expandedTeams.has(subKey);
                                const subUserIds = subTeam.users.map(u => u.id);
                                const subCheckedCount = subUserIds.filter(id => tempUserIds.has(id)).length;
                                const isAllSubChecked = subUserIds.length > 0 && subCheckedCount === subUserIds.length;
                                const isSomeSubChecked = subCheckedCount > 0 && subCheckedCount < subUserIds.length;

                                return (
                                  <div key={subTeam.code} className="app-subteam-group">
                                    <div
                                      className="app-subteam-row"
                                      onClick={() => toggleExpandTeam(subKey)}
                                    >
                                      <span
                                        className="app-team-chevron"
                                        onClick={e => {
                                          e.stopPropagation();
                                          toggleExpandTeam(subKey);
                                        }}
                                      >
                                        {isSubExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                      </span>
                                      <input
                                        type="checkbox"
                                        className="app-table-checkbox"
                                        checked={isAllSubChecked}
                                        ref={el => {
                                          if (el) el.indeterminate = isSomeSubChecked;
                                        }}
                                        onChange={() => toggleSubTeamUsers(subTeam.users)}
                                        onClick={e => e.stopPropagation()}
                                        style={{margin: 0}}
                                      />
                                      <span className="app-team-badge app-team-badge--other">
                                        {subTeam.code}
                                      </span>
                                      <span className="app-subteam-name">{subTeam.name}</span>
                                    </div>

                                    {/* Indented users of child department */}
                                    {isSubExpanded && (
                                      <div className="app-user-children app-subuser-children">
                                        {subTeam.users.map(u => {
                                          const isChecked = tempUserIds.has(u.id);
                                          return (
                                            <div
                                              key={u.id}
                                              className={`app-user-item app-subuser-item ${isChecked ? 'checked' : ''}`}
                                              onClick={() => toggleTempUser(u.id)}
                                            >
                                              <div className="app-user-left">
                                                <input
                                                  type="checkbox"
                                                  className="app-table-checkbox"
                                                  checked={isChecked}
                                                  onChange={() => {}}
                                                  style={{margin: 0}}
                                                />
                                                <span className="app-user-avatar">{u.initials}</span>
                                                <span className="app-user-name">{u.name}</span>
                                              </div>
                                              <span className="app-user-tag">{u.roleTag}</span>
                                            </div>
                                          );
                                        })}
                                        {!subTeam.users.length && (
                                          <div style={{fontSize: '11px', color: '#94a3b8', padding: '4px 44px'}}>
                                            No users in this department
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="app-user-children">
                              {team.users.map(u => {
                                const isChecked = tempUserIds.has(u.id);
                                return (
                                  <div
                                    key={u.id}
                                    className={`app-user-item ${isChecked ? 'checked' : ''}`}
                                    onClick={() => toggleTempUser(u.id)}
                                  >
                                    <div className="app-user-left">
                                      <input
                                        type="checkbox"
                                        className="app-table-checkbox"
                                        checked={isChecked}
                                        onChange={() => {}}
                                        style={{margin: 0}}
                                      />
                                      <span className="app-user-avatar">{u.initials}</span>
                                      <span className="app-user-name">{u.name}</span>
                                    </div>
                                    <span className="app-user-tag">{u.roleTag}</span>
                                  </div>
                                );
                              })}
                              {!team.users.length && (
                                <div style={{fontSize: '11px', color: '#94a3b8', padding: '4px 32px'}}>
                                  No users in this team
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                  {!displayedTeams.length && (
                    <div style={{fontSize: '11px', color: '#94a3b8', padding: '12px 0', textAlign: 'center'}}>
                      No users or teams found
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="app-user-popover-footer">
                  <span className="app-user-count">
                    {tempUserIds.size === 1
                      ? '1 user selected'
                      : `${tempUserIds.size} users selected`}
                  </span>
                  <div className="app-user-actions">
                    <button
                      type="button"
                      className="app-user-clear-btn"
                      onClick={handleClearUserFilter}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="app-user-apply-btn"
                      onClick={handleApplyUserFilter}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date Filter (Date Range Picker Popover) */}
          <div className="app-table-select-wrapper" ref={datePopoverRef}>
            <Calendar size={13} className="app-table-select-icon" />
            <button
              type="button"
              className={`app-table-filter-select has-left-icon ${dateFrom || dateTo ? 'is-active' : ''}`}
              onClick={openDatePopover}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                textAlign: 'left',
              }}
            >
              <span>{dateButtonLabel}</span>
            </button>

            {datePopoverOpen && (
              <div className="app-date-dropdown-popover">
                <div className="app-date-popover-body">
                  {/* Left Column: Quick Range */}
                  <div className="app-date-sidebar">
                    <span className="app-date-sidebar-header">QUICK RANGE</span>
                    <div className="app-date-quick-list">
                      {QUICK_RANGES.map(item => (
                        <button
                          key={item.key}
                          type="button"
                          className={`app-date-quick-btn ${tempQuickRange === item.key ? 'active' : ''}`}
                          onClick={() => handleSelectQuickRange(item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Inputs & Dual Calendars */}
                  <div className="app-date-main">
                    {/* Top Inputs: From & To */}
                    <div className="app-date-inputs-row">
                      <div className="app-date-input-group">
                        <label className="app-date-input-label">From</label>
                        <div className="app-date-input-wrapper">
                          <Calendar size={12} className="app-date-field-icon" />
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={tempFromInput}
                            onChange={e => handleFromInputChange(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="app-date-input-group">
                        <label className="app-date-input-label">To</label>
                        <div className="app-date-input-wrapper">
                          <Calendar size={12} className="app-date-field-icon" />
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={tempToInput}
                            onChange={e => handleToInputChange(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dual Calendars */}
                    <div className="app-date-calendars-row">
                      {/* Left Month Calendar */}
                      <div className="app-date-calendar">
                        <div className="app-date-cal-header">
                          <button
                            type="button"
                            className="app-date-nav-btn"
                            onClick={() =>
                              setCalendarViewDate(
                                prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                              )
                            }
                            title="Previous month"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="app-date-cal-title">
                            {MONTH_NAMES[leftMonthDate.getMonth()]} {leftMonthDate.getFullYear()}
                          </span>
                          <span style={{width: '20px'}} />
                        </div>

                        <div className="app-date-cal-weekdays">
                          {WEEKDAY_HEADERS.map(w => (
                            <span key={w}>{w}</span>
                          ))}
                        </div>

                        <div className="app-date-cal-days">
                          {leftMonthDays.map((cell, idx) => {
                            if (!cell) {
                              return <div key={`empty-left-${idx}`} className="app-calendar-day-cell is-empty" />;
                            }
                            const isStart = isSameDay(cell.date, tempDateFrom);
                            const isEnd = isSameDay(cell.date, tempDateTo);
                            const isInRange = isBetween(cell.date, tempDateFrom, tempDateTo);
                            const hasBoth = Boolean(tempDateFrom && tempDateTo && !isSameDay(tempDateFrom, tempDateTo));

                            let cellClass = 'app-calendar-day-cell';
                            if (isInRange) cellClass += ' in-range';
                            if (isStart && hasBoth) cellClass += ' range-start';
                            if (isEnd && hasBoth) cellClass += ' range-end';
                            if ((isStart || isEnd) && !hasBoth) cellClass += ' single-selected';

                            return (
                              <div
                                key={cell.day}
                                className={cellClass}
                                onClick={() => handleDayClick(cell.date)}
                              >
                                <button type="button" className="app-calendar-day-btn">
                                  {cell.day}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Month Calendar */}
                      <div className="app-date-calendar">
                        <div className="app-date-cal-header">
                          <span style={{width: '20px'}} />
                          <span className="app-date-cal-title">
                            {MONTH_NAMES[rightMonthDate.getMonth()]} {rightMonthDate.getFullYear()}
                          </span>
                          <button
                            type="button"
                            className="app-date-nav-btn"
                            onClick={() =>
                              setCalendarViewDate(
                                prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                              )
                            }
                            title="Next month"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>

                        <div className="app-date-cal-weekdays">
                          {WEEKDAY_HEADERS.map(w => (
                            <span key={w}>{w}</span>
                          ))}
                        </div>

                        <div className="app-date-cal-days">
                          {rightMonthDays.map((cell, idx) => {
                            if (!cell) {
                              return <div key={`empty-right-${idx}`} className="app-calendar-day-cell is-empty" />;
                            }
                            const isStart = isSameDay(cell.date, tempDateFrom);
                            const isEnd = isSameDay(cell.date, tempDateTo);
                            const isInRange = isBetween(cell.date, tempDateFrom, tempDateTo);
                            const hasBoth = Boolean(tempDateFrom && tempDateTo && !isSameDay(tempDateFrom, tempDateTo));

                            let cellClass = 'app-calendar-day-cell';
                            if (isInRange) cellClass += ' in-range';
                            if (isStart && hasBoth) cellClass += ' range-start';
                            if (isEnd && hasBoth) cellClass += ' range-end';
                            if ((isStart || isEnd) && !hasBoth) cellClass += ' single-selected';

                            return (
                              <div
                                key={cell.day}
                                className={cellClass}
                                onClick={() => handleDayClick(cell.date)}
                              >
                                <button type="button" className="app-calendar-day-btn">
                                  {cell.day}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popover Footer */}
                <div className="app-date-popover-footer">
                  <span className="app-date-footer-info">
                    {selectedDaysCount > 0
                      ? `${selectedDaysCount} day${selectedDaysCount > 1 ? 's' : ''} selected · Application date`
                      : 'Application date'}
                  </span>
                  <div className="app-date-footer-actions">
                    <button
                      type="button"
                      className="app-date-cancel-btn"
                      onClick={handleCancelDateFilter}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="app-date-apply-btn"
                      onClick={handleApplyDateFilter}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        {/* Clear all text link */}
        {hasActiveFilters && (
          <button
            type="button"
            className="app-table-clear-all"
            onClick={clearAllFilters}
          >
            Clear all
          </button>
        )}

        {compact && onViewAll && (
          <button
            type="button"
            className="text-link"
            onClick={onViewAll}
            style={{fontSize: '13px', marginLeft: 'auto'}}
          >
            View all
          </button>
        )}
      </div>
      )}

      {/* Table Content */}
      <div className="app-table-container">
        <table className="app-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  className="app-table-checkbox"
                  checked={allVisibleSelected}
                  ref={el => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
              <th>APPLICATION</th>
              <th className="sortable" onClick={() => handleSort('company')}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                  COMPANY <ArrowUpDown size={12} />
                </span>
              </th>
              <th>BRANCH</th>
              <th>PIC MARKETING</th>
              <th style={{textAlign: 'right'}}>AMOUNT (IDR)</th>
              <th className="th-stages" style={{textAlign: 'center'}}>STAGES</th>
              <th className="sortable" onClick={() => handleSort('applied')}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                  APPLIED <ArrowUpDown size={12} />
                </span>
              </th>
              <th className="sortable" onClick={() => handleSort('updated')}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                  UPDATED <ArrowUpDown size={12} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const isSelected = selectedIds.has(r.id);
              const isQuickViewActive = currentQuickViewApp?.id === r.id;
              const appNumber = r.application_number || r.fap_number || r.id;
              const picName = r.mkt_pic_name || (r.mkt_pic_id ? `User #${r.mkt_pic_id}` : '–');
              const picInitials = getInitials(r.mkt_pic_name, r.mkt_pic_id);

              // Use application stages or fallback to active stages
              const stages: StageItem[] = Array.isArray(r.stages) && r.stages.length
                ? r.stages
                : [
                    {
                      code: 'FAP-STAGE',
                      name: 'FAP',
                      status: r.status === 'APPROVED' ? 'APPROVED' : 'IN_PROGRESS',
                    },
                    {
                      code: 'PRE-ANALYSIS',
                      name: 'Pre-analysis',
                      status: r.status === 'APPROVED' ? 'APPROVED' : 'NOT_STARTED',
                    },
                    {
                      code: 'ICLF',
                      name: 'ICLF',
                      status: r.status === 'APPROVED' ? 'APPROVED' : 'NOT_STARTED',
                    },
                  ];

              return (
                <tr
                  key={r.id}
                  className={`app-table-row ${isQuickViewActive ? 'is-active-row' : ''} ${highlightId && r.id === highlightId ? 'na-row-created' : ''}`}
                  onClick={() => setQuickViewApp(r)}
                  style={isSelected ? {backgroundColor: '#f1f5f9'} : undefined}
                >
                  <td className="td-checkbox" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="app-table-checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(r.id)}
                      aria-label={`Select ${r.company_name || appNumber}`}
                    />
                  </td>
                  <td className="app-cell-application">{appNumber}</td>
                  <td className="app-cell-company">{r.company_name || '–'}</td>
                  <td>
                    <span className="app-cell-branch">{r.branch_code || '–'}</span>
                  </td>
                  <td>
                    <div className="app-cell-pic">
                      <span className="app-cell-pic-avatar">{picInitials}</span>
                      <span className="app-cell-pic-name">{picName}</span>
                    </div>
                  </td>
                  <td className="app-cell-amount">{formatAmount(r.financing_value)}</td>
                  <td className="td-stages" style={{textAlign: 'center'}}>
                    <div className="app-cell-stages">
                      {stages.map(st => (
                        <StagePill
                          key={st.code}
                          stage={st}
                          row={r}
                          onOpen={(row, stageItem) => {
                            const targetTab = getStageTargetTab(stageItem);
                            open(row.application_number || row.id, targetTab);
                          }}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="app-cell-date">{formatDisplayDate(r.created_at || r.application_date)}</td>
                  <td className="app-cell-date">
                    {formatDisplayDate(r.updated_at || r.created_at || r.application_date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!visible.length && (
          <div className="app-table-empty-state">
            <div className="app-table-empty-icon-wrap">
              <Search size={22} className="app-table-empty-search-icon" />
            </div>
            <h3 className="app-table-empty-title">
              {search.trim()
                ? `No applications match "${search.trim()}"`
                : 'No applications match the selected filters'}
            </h3>
            <p className="app-table-empty-desc">
              Check the spelling, or search by FAP number, company name or branch code.
            </p>
            <div className="app-table-empty-actions">
              {search.trim() ? (
                <button
                  type="button"
                  className="app-table-empty-btn-primary"
                  onClick={() => setSearch('')}
                >
                  Clear search
                </button>
              ) : null}
              <button
                type="button"
                className="app-table-empty-btn-secondary"
                onClick={clearAllFilters}
              >
                Reset all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Footer */}
      <div className="app-table-footer">
        <div>
          Showing{' '}
          {sorted.length ? (
            <>
              {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} of{' '}
              <strong style={{color: '#0f172a'}}>{sorted.length}</strong> applications
            </>
          ) : (
            '0 applications'
          )}
        </div>

        {/* Legend */}
        <div className="app-table-legend">
          <span className="app-table-legend-item">
            <CircleCheck size={13} fill="#16a34a" color="#ffffff" strokeWidth={2.5} />
            <span>Approved</span>
          </span>
          <span className="app-table-legend-item">
            <Clock size={13} strokeWidth={2.5} style={{color: '#d97706'}} />
            <span>Waiting for approval</span>
          </span>
          <span className="app-table-legend-item">
            <CircleAlert size={13} fill="#dc2626" color="#ffffff" strokeWidth={2.5} />
            <span>Needs changes</span>
          </span>
          <span className="app-table-legend-item">
            <HalfCircleIcon size={13} strokeWidth={2} style={{color: '#2563eb'}} />
            <span>In progress</span>
          </span>
          <span className="app-table-legend-item">
            <Circle size={13} strokeWidth={1.8} strokeDasharray="2 2" style={{color: '#94a3b8'}} />
            <span>Not started</span>
          </span>
        </div>

        {/* Rows per page & Pagination */}
        <div className="app-table-pagination">
          <div className="app-table-rows-per-page">
            <span>Rows per page</span>
            <select
              className="app-table-rows-select"
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="app-table-page-nav">
            <button
              type="button"
              className="app-table-page-btn"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({length: totalPages}, (_, i) => i)
              .filter(p => {
                if (totalPages <= 5) return true;
                if (p === 0 || p === totalPages - 1) return true;
                return Math.abs(p - currentPage) <= 1;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} style={{display: 'inline-flex', alignItems: 'center'}}>
                    {showEllipsis && <span style={{padding: '0 4px', color: '#94a3b8'}}>…</span>}
                    <button
                      type="button"
                      className={`app-table-page-btn ${p === currentPage ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p + 1}
                    </button>
                  </span>
                );
              })}

            <button
              type="button"
              className="app-table-page-btn"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {currentQuickViewApp && (
        <QuickViewPanel
          app={currentQuickViewApp}
          onClose={() => setQuickViewApp(null)}
          onOpen={open}
        />
      )}
    </section>

    {selectedIds.size > 0 && (
      <div className="app-bulk-notice">
        <HelpCircle size={14} />
        <span>Approve / reject is not available as a bulk action — credit decisions are reviewed one application at a time.</span>
      </div>
    )}

    {changePicOpen && (
      <Modal
        title={`Change Marketing PIC (${selectedIds.size} selected)`}
        onClose={() => !bulkBusy && setChangePicOpen(false)}
        className="app-bulk-modal"
      >
        <div className="app-bulk-modal-body">
          <p className="app-bulk-modal-desc">
            Select a new Marketing PIC for the {selectedIds.size} selected application{selectedIds.size > 1 ? 's' : ''}.
          </p>

          <div className="app-bulk-pic-search">
            <Search size={14} className="app-bulk-pic-search-icon" />
            <input
              type="text"
              placeholder="Search Marketing PIC..."
              value={picSearch}
              onChange={e => setPicSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="app-bulk-pic-list">
            {mktPicLoading ? (
              <div className="app-bulk-pic-empty">Loading users...</div>
            ) : (
              mktPicOptions
                .filter(u => {
                  const q = picSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    u.name.toLowerCase().includes(q) ||
                    u.username.toLowerCase().includes(q)
                  );
                })
                .map(u => {
                  const active = selectedNewPicId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className={`app-bulk-pic-option ${active ? 'is-selected' : ''}`}
                      onClick={() => setSelectedNewPicId(u.id)}
                    >
                      <span className="app-user-avatar">{getInitials(u.name, u.id)}</span>
                      <span className="app-bulk-pic-info">
                        <span className="app-bulk-pic-name">{u.name}</span>
                        <span className="app-bulk-pic-username">@{u.username}</span>
                      </span>
                      {active && <Check size={15} className="app-bulk-pic-check" />}
                    </button>
                  );
                })
            )}
            {!mktPicLoading && mktPicOptions.length === 0 && (
              <div className="app-bulk-pic-empty">No active users found.</div>
            )}
          </div>

          <div className="app-bulk-modal-footer">
            <button
              type="button"
              className="app-bulk-btn"
              onClick={() => setChangePicOpen(false)}
              disabled={bulkBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="app-bulk-btn app-bulk-btn--primary"
              onClick={handleConfirmChangePic}
              disabled={!selectedNewPicId || bulkBusy}
            >
              {bulkBusy ? 'Updating...' : 'Update PIC'}
            </button>
          </div>
        </div>
      </Modal>
    )}

    {reminderOpen && (
      <Modal
        title={`Send Document Reminder (${selectedIds.size} selected)`}
        onClose={() => !bulkBusy && setReminderOpen(false)}
        className="app-bulk-modal"
      >
        <div className="app-bulk-modal-body">
          <p className="app-bulk-modal-desc">
            This will send a notification to the Marketing PIC of each selected application reminding them to upload the required documents and send it for approval.
          </p>

          <div className="app-bulk-reminder-summary">
            {selectedRows.slice(0, 5).map(r => (
              <div key={r.id} className="app-bulk-reminder-row">
                <span className="app-bulk-reminder-num">{r.application_number || r.fap_number}</span>
                <span className="app-bulk-reminder-company">{r.company_name || '—'}</span>
                <span className="app-bulk-reminder-pic">
                  {r.mkt_pic_name || (r.mkt_pic_id ? `User #${r.mkt_pic_id}` : 'No PIC')}
                </span>
              </div>
            ))}
            {selectedRows.length > 5 && (
              <div className="app-bulk-reminder-more">
                +{selectedRows.length - 5} more application(s)
              </div>
            )}
          </div>

          <label className="app-bulk-note-label">
            <span>Additional note (optional)</span>
            <textarea
              rows={2}
              placeholder="e.g. Please complete mandatory documents before Friday..."
              value={reminderNote}
              onChange={e => setReminderNote(e.target.value)}
            />
          </label>

          <div className="app-bulk-modal-footer">
            <button
              type="button"
              className="app-bulk-btn"
              onClick={() => setReminderOpen(false)}
              disabled={bulkBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="app-bulk-btn app-bulk-btn--primary"
              onClick={handleConfirmReminder}
              disabled={bulkBusy}
            >
              {bulkBusy ? 'Sending...' : 'Send Reminder'}
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
});
