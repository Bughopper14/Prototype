import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {api} from '@/shared/lib/api';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
  FileText,
  Paperclip,
  Search,
  Send,
  Upload,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import './InboxPage.css';

type InboxTab = 'documents' | 'submit' | 'approvals';
type DocQuickFilter = 'ALL' | 'TO_FIX' | 'MISSING' | 'READY';

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0 && d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `Today, ${hh}:${mm}`;
  }
  if (diffDays === 1) return '1 day';
  return `${Math.max(1, diffDays)} days`;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripHtml(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function InboxPage() {
  const {reload, openApplication, refreshInboxCount} = useCrm();
  const [tab, setTab] = useState<InboxTab>('documents');
  const [data, setData] = useState<{
    documentChecklist: any[];
    submitApps: any[];
    approvalApps: any[];
    counts: {documentChecklist: number; submit: number; approvals: number; total: number};
  }>({
    documentChecklist: [],
    submitApps: [],
    approvalApps: [],
    counts: {documentChecklist: 0, submit: 0, approvals: 0, total: 0},
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
  const [docQuickFilter, setDocQuickFilter] = useState<DocQuickFilter>('ALL');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [stageChecks, setStageChecks] = useState<Record<string, {canSubmit: boolean; missing: string[]; loading: boolean}>>({});
  const [remarksByKey, setRemarksByKey] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingChecklistRef = useRef<{appId: string; checklistId: string; documentCode: string} | null>(null);

  const loadInbox = useCallback(async () => {
    try {
      const res = await api('/inbox');
      if (res) setData(res);
    } catch (e: any) {
      setBanner({type: 'error', message: e?.message || 'Failed to load inbox'});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const currentList = useMemo(() => {
    const raw =
      tab === 'documents'
        ? data.documentChecklist
        : tab === 'submit'
          ? data.submitApps
          : data.approvalApps;

    const q = search.trim().toLowerCase();
    const filtered = raw.filter(app => {
      if (q) {
        const hay = `${app.companyName || ''} ${app.applicationNumber || ''} ${app.branchCode || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (branchFilter !== 'ALL' && app.branchCode !== branchFilter) return false;
      if (stageFilter !== 'ALL') {
        if (tab === 'documents' && app.stageName !== stageFilter) return false;
        if (tab === 'submit' && !(app.stages || []).some((s: any) => s.name === stageFilter)) return false;
        if (tab === 'approvals' && !(app.steps || []).some((s: any) => s.stageCode === stageFilter || s.name.includes(stageFilter))) return false;
      }
      if (tab === 'documents') {
        if (docQuickFilter === 'TO_FIX' && app.toFixCount === 0) return false;
        if (docQuickFilter === 'MISSING' && app.missingCount === 0) return false;
        if (docQuickFilter === 'READY' && app.readyCount === 0) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sortOrder === 'oldest' ? ta - tb : tb - ta;
    });
  }, [tab, data, search, branchFilter, stageFilter, sortOrder, docQuickFilter]);

  useEffect(() => {
    if (!currentList.length) {
      setSelectedAppId(null);
      return;
    }
    if (!selectedAppId || !currentList.some(a => a.id === selectedAppId)) {
      setSelectedAppId(currentList[0].id);
    }
  }, [currentList, selectedAppId]);

  const selectedApp = useMemo(
    () => currentList.find(a => a.id === selectedAppId) || currentList[0] || null,
    [currentList, selectedAppId],
  );

  // Load stage readiness checks when viewing an app in Submit tab
  useEffect(() => {
    if (tab !== 'submit' || !selectedApp) return;
    for (const st of selectedApp.stages || []) {
      const key = `${selectedApp.id}:${st.code}`;
      setStageChecks(prev => ({...prev, [key]: {canSubmit: false, missing: [], loading: true}}));
      api(`/applications/${selectedApp.id}/stages/${encodeURIComponent(st.code)}/check`)
        .then(res => {
          setStageChecks(prev => ({
            ...prev,
            [key]: {
              canSubmit: !!res?.canSubmit,
              missing: Array.isArray(res?.missing) ? res.missing : [],
              loading: false,
            },
          }));
        })
        .catch(() => {
          setStageChecks(prev => ({...prev, [key]: {canSubmit: false, missing: [], loading: false}}));
        });
    }
  }, [tab, selectedApp]);

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const list of [data.documentChecklist, data.submitApps, data.approvalApps]) {
      for (const a of list) if (a.branchCode) set.add(a.branchCode);
    }
    return Array.from(set).sort();
  }, [data]);

  const stageOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of data.documentChecklist) if (a.stageName) set.add(a.stageName);
    for (const a of data.submitApps) for (const s of a.stages || []) if (s.name) set.add(s.name);
    return Array.from(set);
  }, [data]);

  const docSummaryCounts = useMemo(() => {
    const apps = data.documentChecklist;
    return {
      all: apps.length,
      toFix: apps.filter(a => a.toFixCount > 0).length,
      missing: apps.filter(a => a.missingCount > 0).length,
      ready: apps.filter(a => a.readyCount > 0).length,
      totalDocs: apps.reduce((acc, a) => acc + a.toFixCount + a.missingCount, 0),
    };
  }, [data.documentChecklist]);

  async function uploadDocumentFile(appId: string, checklistId: string, documentCode: string, file: File) {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setBanner({type: 'error', message: 'Only PDF, PNG, and JPEG files are supported.'});
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setBanner({type: 'error', message: 'Maximum file size is 20 MB.'});
      return;
    }

    setUploadingId(checklistId);
    setBanner(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('checklistId', checklistId);
      form.append('documentCode', documentCode);
      await api(`/applications/${appId}/documents/upload`, 'POST', form);
      await Promise.all([loadInbox(), reload(), refreshInboxCount()]);
      setBanner({type: 'success', message: `Uploaded "${file.name}" successfully.`});
    } catch (err: any) {
      setBanner({type: 'error', message: err?.message || 'Failed to upload document.'});
    } finally {
      setUploadingId(null);
    }
  }

  function triggerFilePicker(appId: string, checklistId: string, documentCode: string) {
    pendingChecklistRef.current = {appId, checklistId, documentCode};
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  async function handleViewFile(fileId: string) {
    setBanner(null);
    try {
      const res = await api(`/files/${fileId}/url`);
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setBanner({type: 'error', message: err?.message || 'Unable to open document.'});
    }
  }

  async function handleSubmitStage(appId: string, stageCode: string) {
    const key = `${appId}:${stageCode}`;
    setBusyKey(key);
    setBanner(null);
    try {
      await api(`/applications/${appId}/stages/${encodeURIComponent(stageCode)}/submit`, 'POST', {
        remarks: remarksByKey[key]?.trim() || undefined,
      });
      await Promise.all([loadInbox(), reload(), refreshInboxCount()]);
      setBanner({type: 'success', message: `Submitted ${stageCode} stage for approval.`});
    } catch (err: any) {
      setBanner({type: 'error', message: err?.message || 'Failed to submit stage.'});
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSubmitDocumentApproval(appId: string, checklistId: string, docName: string) {
    const key = `doc:${checklistId}`;
    setBusyKey(key);
    setBanner(null);
    try {
      await api(`/applications/${appId}/documents/${checklistId}/submit-approval`, 'POST', {});
      await Promise.all([loadInbox(), reload(), refreshInboxCount()]);
      setBanner({type: 'success', message: `Submitted "${docName}" for approval.`});
    } catch (err: any) {
      setBanner({type: 'error', message: err?.message || 'Failed to submit document for approval.'});
    } finally {
      setBusyKey(null);
    }
  }

  async function handleApprovalDecision(appId: string, stepId: string, decision: 'APPROVED' | 'REJECTED') {
    const key = `step:${stepId}`;
    const remarks = remarksByKey[key]?.trim() || '';
    if (decision === 'REJECTED' && !remarks) {
      setBanner({type: 'error', message: 'Please enter remarks before rejecting.'});
      return;
    }
    setBusyKey(key);
    setBanner(null);
    try {
      await api(`/applications/${appId}/approvals/${stepId}/decision`, 'POST', {
        decision,
        remarks: remarks || undefined,
      });
      await Promise.all([loadInbox(), reload(), refreshInboxCount()]);
      setBanner({
        type: 'success',
        message: decision === 'APPROVED' ? 'Approval recorded.' : 'Application returned for changes.',
      });
    } catch (err: any) {
      setBanner({type: 'error', message: err?.message || 'Failed to submit decision.'});
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <AccessGate authority="CRM_APPLICATION_VIEW" page="Inbox">
      <div className="inbox-page">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          style={{display: 'none'}}
          onChange={e => {
            const file = e.target.files?.[0];
            const target = pendingChecklistRef.current;
            if (file && target) {
              uploadDocumentFile(target.appId, target.checklistId, target.documentCode, file);
            }
          }}
        />

        <div className="inbox-header">
          <div>
            <h1 className="inbox-title">Inbox</h1>
            <p className="inbox-subtitle">
              Everything waiting for your action, across all applications. Each application still has its own tabs.
            </p>
          </div>
        </div>

        {banner && (
          <div className={`inbox-banner inbox-banner--${banner.type}`}>
            <span>{banner.message}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2}}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="inbox-tabs-card">
          <button
            type="button"
            className={`inbox-tab-btn ${tab === 'documents' ? 'is-active' : ''}`}
            onClick={() => setTab('documents')}
          >
            <span>Document checklist</span>
            <span className="inbox-tab-badge">{data.counts.documentChecklist}</span>
          </button>
          <button
            type="button"
            className={`inbox-tab-btn ${tab === 'submit' ? 'is-active' : ''}`}
            onClick={() => setTab('submit')}
          >
            <span>Submit</span>
            <span className="inbox-tab-badge">{data.counts.submit}</span>
          </button>
          <button
            type="button"
            className={`inbox-tab-btn ${tab === 'approvals' ? 'is-active' : ''}`}
            onClick={() => setTab('approvals')}
          >
            <span>Approvals</span>
            <span className="inbox-tab-badge">{data.counts.approvals}</span>
          </button>
        </div>

        <div className="inbox-filters-bar">
          <div className="inbox-search-box">
            <Search size={14} className="inbox-search-icon" />
            <input
              type="text"
              placeholder="Search application or FAP number"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="inbox-filter-select"
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
          >
            <option value="ALL">Stage: All</option>
            {stageOptions.map(st => (
              <option key={st} value={st}>
                Stage: {st}
              </option>
            ))}
          </select>

          <select
            className="inbox-filter-select"
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
          >
            <option value="ALL">Branch: All</option>
            {branchOptions.map(br => (
              <option key={br} value={br}>
                Branch: {br}
              </option>
            ))}
          </select>

          <select
            className="inbox-filter-select"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'oldest' | 'newest')}
          >
            <option value="oldest">Sort: Oldest first</option>
            <option value="newest">Sort: Newest first</option>
          </select>
        </div>

        {loading ? (
          <div className="inbox-right-panel">
            <div className="inbox-empty">Loading inbox...</div>
          </div>
        ) : (
          <div className="inbox-split-layout">
            {/* Left panel: applications list */}
            <div className="inbox-left-panel">
              <div className="inbox-left-summary">
                <strong>{currentList.length} applications</strong>
                {tab === 'documents' && <> · {docSummaryCounts.totalDocs} documents</>}
              </div>

              {tab === 'documents' && (
                <div className="inbox-quick-pills">
                  <button
                    type="button"
                    className={`inbox-quick-pill ${docQuickFilter === 'ALL' ? 'is-active' : ''}`}
                    onClick={() => setDocQuickFilter('ALL')}
                  >
                    All {docSummaryCounts.all}
                  </button>
                  <button
                    type="button"
                    className={`inbox-quick-pill ${docQuickFilter === 'TO_FIX' ? 'is-active' : ''}`}
                    onClick={() => setDocQuickFilter('TO_FIX')}
                  >
                    To fix {docSummaryCounts.toFix}
                  </button>
                  <button
                    type="button"
                    className={`inbox-quick-pill ${docQuickFilter === 'MISSING' ? 'is-active' : ''}`}
                    onClick={() => setDocQuickFilter('MISSING')}
                  >
                    Missing {docSummaryCounts.missing}
                  </button>
                  <button
                    type="button"
                    className={`inbox-quick-pill ${docQuickFilter === 'READY' ? 'is-active' : ''}`}
                    onClick={() => setDocQuickFilter('READY')}
                  >
                    Ready {docSummaryCounts.ready}
                  </button>
                </div>
              )}

              <div className="inbox-app-list">
                {currentList.map(app => {
                  const isSelected = selectedApp?.id === app.id;
                  const pct = app.totalCount ? Math.round((app.uploadedCount / app.totalCount) * 100) : 0;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      className={`inbox-app-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedAppId(app.id)}
                    >
                      <div className="inbox-app-card-top">
                        <span className="inbox-app-company">{app.companyName}</span>
                        <span className={`inbox-app-time ${app.toFixCount > 0 ? 'is-urgent' : ''}`}>
                          {formatRelativeTime(app.updatedAt)}
                        </span>
                      </div>

                      <div className="inbox-app-meta">
                        {app.applicationNumber}
                        {tab === 'documents' && app.stageName ? ` · ${app.stageName}` : ''}
                        {app.branchCode ? ` · ${app.branchCode}` : ''}
                      </div>

                      <div className="inbox-app-card-bottom">
                        <div className="inbox-app-badges">
                          {tab === 'documents' && (
                            <>
                              {app.toFixCount > 0 && (
                                <span className="inbox-mini-badge inbox-mini-badge--fix">{app.toFixCount} to fix</span>
                              )}
                              {app.missingCount > 0 && (
                                <span className="inbox-mini-badge inbox-mini-badge--missing">{app.missingCount} missing</span>
                              )}
                              {app.readyCount > 0 && (
                                <span className="inbox-mini-badge inbox-mini-badge--ready">{app.readyCount} ready</span>
                              )}
                            </>
                          )}
                          {tab === 'submit' && (
                            <span className="inbox-mini-badge inbox-mini-badge--submit">
                              {(app.stages || []).length} stage(s) open
                            </span>
                          )}
                          {tab === 'approvals' && (
                            <span className="inbox-mini-badge inbox-mini-badge--approval">
                              {(app.steps || []).length} approval(s)
                            </span>
                          )}
                        </div>

                        {tab === 'documents' && (
                          <div className="inbox-progress-wrap">
                            <span>
                              {app.uploadedCount}/{app.totalCount}
                            </span>
                            <div className="inbox-progress-bar">
                              <div className="inbox-progress-fill" style={{width: `${pct}%`}} />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {!currentList.length && (
                  <div className="inbox-empty">No applications match the selected filter.</div>
                )}
              </div>
            </div>

            {/* Right panel: action area */}
            <div className="inbox-right-panel">
              {!selectedApp ? (
                <div className="inbox-empty">Select an application on the left to view its actions.</div>
              ) : (
                <>
                  <div className="inbox-detail-header">
                    <div>
                      <div className="inbox-detail-title-row">
                        <h2 className="inbox-detail-company">{selectedApp.companyName}</h2>
                        {selectedApp.stageName && (
                          <span className="inbox-stage-pill">{selectedApp.stageName}</span>
                        )}
                      </div>
                      <p className="inbox-detail-sub">
                        {selectedApp.applicationNumber}
                        {selectedApp.branchCode ? ` · ${selectedApp.branchCode}` : ''}
                        {selectedApp.mktPicName ? ` · PIC ${selectedApp.mktPicName}` : ''}
                      </p>
                    </div>

                    <div className="inbox-detail-header-right">
                      <button
                        type="button"
                        className="inbox-open-link"
                        onClick={() => openApplication(selectedApp.id, tab === 'documents' ? 2 : 0)}
                      >
                        <span>Open application</span>
                        <ChevronRight size={14} />
                      </button>
                      {tab === 'documents' && (
                        <span className="inbox-upload-summary">
                          {selectedApp.uploadedCount} of {selectedApp.totalCount} documents uploaded
                        </span>
                      )}
                    </div>
                  </div>

                  {tab === 'documents' && (() => {
                    const docs: any[] = selectedApp.docs || [];
                    const fixDocs = docs.filter(d => d.approvalStatus === 'REJECTED');
                    const missingDocs = docs.filter(d => d.status !== 'UPLOADED' && d.approvalStatus !== 'REJECTED');
                    const uploadedDocs = docs.filter(d => d.status === 'UPLOADED' && d.approvalStatus !== 'REJECTED');

                    return (
                      <>
                        {fixDocs.length > 0 && (
                          <div>
                            <div className="inbox-section-label inbox-section-label--fix">
                              FIX FIRST · {fixDocs.length}
                            </div>
                            <div className="inbox-doc-cards">
                              {fixDocs.map(doc => (
                                <div key={doc.id} className="inbox-doc-card inbox-doc-card--fix">
                                  <div className="inbox-doc-fix-head">
                                    <div className="inbox-doc-title-wrap">
                                      <AlertCircle size={16} color="#dc2626" style={{marginTop: 2, flexShrink: 0}} />
                                      <div>
                                        <div className="inbox-doc-title">{doc.documentName}</div>
                                        <div className="inbox-doc-sub inbox-doc-sub--fix">
                                          Rejected{doc.decidedBy ? ` by ${doc.decidedBy}` : ''}
                                          {doc.decidedAt ? ` · ${formatRelativeTime(doc.decidedAt)}` : ''}
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      className="inbox-btn inbox-btn--primary"
                                      disabled={uploadingId === doc.id}
                                      onClick={() => triggerFilePicker(selectedApp.id, doc.id, doc.documentCode)}
                                    >
                                      <Upload size={14} />
                                      <span>{uploadingId === doc.id ? 'Uploading...' : 'Re-upload'}</span>
                                    </button>
                                  </div>

                                  {doc.approvalRemarks && (
                                    <div className="inbox-doc-remarks">{stripHtml(doc.approvalRemarks)}</div>
                                  )}

                                  {doc.currentFile && (
                                    <div className="inbox-doc-prev-file">
                                      <Paperclip size={12} />
                                      <span>
                                        Previous: {doc.currentFile.fileName} · {formatBytes(doc.currentFile.fileSize)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {missingDocs.length > 0 && (
                          <div>
                            <div className="inbox-section-label">
                              UPLOAD · {missingDocs.length}
                            </div>
                            <div className="inbox-doc-cards">
                              {missingDocs.map(doc => {
                                const isDrag = dragOverId === doc.id;
                                const isUploading = uploadingId === doc.id;
                                return (
                                  <div key={doc.id} className="inbox-doc-card">
                                    <div className="inbox-doc-upload-row">
                                      <div className="inbox-doc-title-wrap">
                                        <Circle
                                          size={16}
                                          strokeWidth={1.8}
                                          strokeDasharray="2 2"
                                          color="#94a3b8"
                                          style={{marginTop: 2, flexShrink: 0}}
                                        />
                                        <div>
                                          <div className="inbox-doc-title">{doc.documentName}</div>
                                          <div className="inbox-doc-sub">
                                            {doc.isMandatory ? 'Required' : 'Optional'} · {doc.assignedRole} · {doc.stageName}
                                          </div>
                                          {doc.createdAt && (
                                            <div className="inbox-doc-sub">
                                              Waiting {formatRelativeTime(doc.createdAt)}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div
                                        className={`inbox-dropzone ${isDrag ? 'is-dragover' : ''}`}
                                        onClick={() => !isUploading && triggerFilePicker(selectedApp.id, doc.id, doc.documentCode)}
                                        onDragOver={e => {
                                          e.preventDefault();
                                          setDragOverId(doc.id);
                                        }}
                                        onDragLeave={() => setDragOverId(null)}
                                        onDrop={e => {
                                          e.preventDefault();
                                          setDragOverId(null);
                                          const f = e.dataTransfer.files?.[0];
                                          if (f && !isUploading) {
                                            uploadDocumentFile(selectedApp.id, doc.id, doc.documentCode, f);
                                          }
                                        }}
                                      >
                                        <div className="inbox-dropzone-main">
                                          <Upload size={14} color="#64748b" />
                                          {isUploading ? (
                                            <span>Uploading...</span>
                                          ) : (
                                            <span>
                                              Drop files here or <span className="browse">browse</span>
                                            </span>
                                          )}
                                        </div>
                                        <div className="inbox-dropzone-hint">PDF, PNG, JPEG · max 20 MB</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {uploadedDocs.length > 0 && (
                          <div>
                            <div className="inbox-section-label">
                              UPLOADED · {uploadedDocs.length}
                            </div>
                            <div className="inbox-doc-cards">
                              {uploadedDocs.map(doc => {
                                const isInApproval =
                                  doc.approvalStatus === 'IN_APPROVAL' ||
                                  (!doc.hasOwnApproval && doc.stageStatus === 'WAITING_APPROVAL');
                                const isApproved =
                                  doc.approvalStatus === 'APPROVED' ||
                                  (!doc.hasOwnApproval && doc.stageStatus === 'APPROVED');
                                const isStageWaiting = !doc.hasOwnApproval && doc.stageStatus === 'WAITING_APPROVAL';
                                const canReplace = !isInApproval && !isStageWaiting && !doc.stageLocked;
                                const canSubmitDoc =
                                  doc.hasOwnApproval &&
                                  doc.approvalStatus === 'NOT_STARTED' &&
                                  !isInApproval &&
                                  !doc.stageLocked;
                                const progress = doc.approvalProgress;
                                const isDrag = dragOverId === doc.id;
                                const isUploading = uploadingId === doc.id;

                                return (
                                  <div
                                    key={doc.id}
                                    className={`inbox-doc-card ${isDrag && canReplace ? 'is-dragover' : ''}`}
                                    onDragOver={e => {
                                      if (!canReplace) return;
                                      e.preventDefault();
                                      setDragOverId(doc.id);
                                    }}
                                    onDragLeave={() => setDragOverId(null)}
                                    onDrop={e => {
                                      if (!canReplace) return;
                                      e.preventDefault();
                                      setDragOverId(null);
                                      const f = e.dataTransfer.files?.[0];
                                      if (f && !isUploading) {
                                        uploadDocumentFile(selectedApp.id, doc.id, doc.documentCode, f);
                                      }
                                    }}
                                  >
                                    <div className="inbox-doc-upload-row">
                                      <div className="inbox-doc-title-wrap">
                                        {isApproved ? (
                                          <CheckCircle2 size={16} color="#16a34a" style={{marginTop: 2, flexShrink: 0}} />
                                        ) : isInApproval ? (
                                          <Clock size={16} color="#d97706" style={{marginTop: 2, flexShrink: 0}} />
                                        ) : (
                                          <FileText size={16} color="#2563eb" style={{marginTop: 2, flexShrink: 0}} />
                                        )}
                                        <div>
                                          <div className="inbox-doc-title">{doc.documentName}</div>
                                          <div className="inbox-doc-sub">
                                            {doc.currentFile
                                              ? `${doc.currentFile.fileName} · ${formatBytes(doc.currentFile.fileSize)}`
                                              : 'Uploaded'}
                                            {isInApproval
                                              ? ' · Waiting for approval'
                                              : isApproved
                                                ? ' · Approved (drop file to re-upload & restart approval)'
                                                : ''}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
                                        {progress && progress.total > 0 && (
                                          <div className="inbox-approval-box">
                                            <div className="inbox-approval-box-top">
                                              <span className="inbox-approval-box-label">
                                                {progress.percent >= 100
                                                  ? 'All approved'
                                                  : isInApproval
                                                    ? `In approval (${progress.approved}/${progress.total})`
                                                    : `Approval (${progress.approved}/${progress.total})`}
                                              </span>
                                              {progress.percent >= 100 ? (
                                                <CheckCircle2 size={14} color="#16a34a" />
                                              ) : isInApproval ? (
                                                <Clock size={14} color="#d97706" />
                                              ) : (
                                                <Circle size={13} color="#94a3b8" />
                                              )}
                                            </div>
                                            <div className="inbox-approval-bar-row">
                                              <div className="inbox-approval-track">
                                                <div
                                                  className={`inbox-approval-fill ${progress.percent >= 100 ? 'is-complete' : ''}`}
                                                  style={{width: `${progress.percent}%`}}
                                                />
                                              </div>
                                              <span className="inbox-approval-pct">{progress.percent}%</span>
                                            </div>
                                          </div>
                                        )}

                                        {doc.currentFile && (
                                          <button
                                            type="button"
                                            className="inbox-btn"
                                            onClick={() => handleViewFile(doc.currentFile.id)}
                                          >
                                            <ExternalLink size={13} />
                                            <span>View</span>
                                          </button>
                                        )}
                                        {canReplace && (
                                          <button
                                            type="button"
                                            className="inbox-btn"
                                            disabled={isUploading}
                                            onClick={() => triggerFilePicker(selectedApp.id, doc.id, doc.documentCode)}
                                          >
                                            <Upload size={13} />
                                            <span>{isUploading ? 'Uploading...' : isApproved ? 'Re-upload' : 'Replace'}</span>
                                          </button>
                                        )}
                                        {canSubmitDoc && (
                                          <button
                                            type="button"
                                            className="inbox-btn inbox-btn--primary"
                                            disabled={busyKey === `doc:${doc.id}`}
                                            onClick={() => handleSubmitDocumentApproval(selectedApp.id, doc.id, doc.documentName)}
                                          >
                                            <Send size={13} />
                                            <span>{busyKey === `doc:${doc.id}` ? 'Submitting...' : 'Submit'}</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {tab === 'submit' && (
                    <div className="inbox-doc-cards">
                      {(selectedApp.stages || []).map((st: any) => {
                        const key = `${selectedApp.id}:${st.code}`;
                        const check = stageChecks[key];
                        return (
                          <div key={st.code} className="inbox-action-card">
                            <div className="inbox-action-card-head">
                              <div>
                                <div className="inbox-doc-title">Submit {st.name} Stage</div>
                                <div className="inbox-doc-sub">
                                  Status: {st.status === 'NEEDS_CHANGES' ? 'Needs changes (Resubmit)' : 'In progress'}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="inbox-btn inbox-btn--primary"
                                disabled={busyKey === key || check?.loading || (check && !check.canSubmit)}
                                onClick={() => handleSubmitStage(selectedApp.id, st.code)}
                              >
                                <Send size={14} />
                                <span>{busyKey === key ? 'Submitting...' : `Submit ${st.name}`}</span>
                              </button>
                            </div>

                            {check && !check.loading && !check.canSubmit && check.missing.length > 0 && (
                              <div className="inbox-missing-box">
                                <strong>Complete these items before submitting:</strong>
                                <ul>
                                  {check.missing.map((m, idx) => (
                                    <li key={idx}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <textarea
                              rows={2}
                              className="inbox-remarks-input"
                              placeholder="Optional notes for approver..."
                              value={remarksByKey[key] || ''}
                              onChange={e => setRemarksByKey(prev => ({...prev, [key]: e.target.value}))}
                            />
                          </div>
                        );
                      })}

                      {(selectedApp.docsReadyForApproval || []).map((doc: any) => (
                        <div key={doc.id} className="inbox-action-card">
                          <div className="inbox-action-card-head">
                            <div>
                              <div className="inbox-doc-title">{doc.documentName}</div>
                              <div className="inbox-doc-sub">
                                Document ready to submit for approval · {doc.stageName}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="inbox-btn inbox-btn--primary"
                              disabled={busyKey === `doc:${doc.id}`}
                              onClick={() => handleSubmitDocumentApproval(selectedApp.id, doc.id, doc.documentName)}
                            >
                              <Send size={14} />
                              <span>{busyKey === `doc:${doc.id}` ? 'Submitting...' : 'Submit document'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'approvals' && (
                    <div className="inbox-doc-cards">
                      {(selectedApp.steps || []).map((step: any) => {
                        const key = `step:${step.stepId}`;
                        return (
                          <div key={step.stepId} className="inbox-action-card">
                            <div className="inbox-action-card-head">
                              <div>
                                <div className="inbox-doc-title">{step.name}</div>
                                <div className="inbox-doc-sub">
                                  Scope: {step.scopeType}
                                  {step.stageCode ? ` · ${step.stageCode}` : ''}
                                  {step.startedAt ? ` · Waiting ${formatRelativeTime(step.startedAt)}` : ''}
                                </div>
                              </div>
                              <div style={{display: 'flex', gap: 8}}>
                                <button
                                  type="button"
                                  className="inbox-btn inbox-btn--reject"
                                  disabled={busyKey === key}
                                  onClick={() => handleApprovalDecision(selectedApp.id, step.stepId, 'REJECTED')}
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  className="inbox-btn inbox-btn--approve"
                                  disabled={busyKey === key}
                                  onClick={() => handleApprovalDecision(selectedApp.id, step.stepId, 'APPROVED')}
                                >
                                  Approve
                                </button>
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              className="inbox-remarks-input"
                              placeholder="Remarks (required if rejecting, optional if approving)..."
                              value={remarksByKey[key] || ''}
                              onChange={e => setRemarksByKey(prev => ({...prev, [key]: e.target.value}))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AccessGate>
  );
}
