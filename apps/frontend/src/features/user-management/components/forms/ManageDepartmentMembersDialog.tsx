import {usePortalConfirm} from '@/features/user-management/components/ui/ConfirmDialog';
import {useState, useMemo} from 'react';
import {Row} from '@/features/user-management/lib/types';

export function ManageDepartmentMembersDialog({
  targetDepartment,
  users,
  onAssignUsers,
  onRemoveUsers,
  onClose,
}: {
  targetDepartment: Row;
  users: Row[];
  onAssignUsers: (userIds: number[]) => void | Promise<void>;
  onRemoveUsers: (userIds: number[]) => void | Promise<void>;
  onClose: () => void;
}) {
  // Members currently assigned to this department
  const currentMembers = useMemo(() => {
    return users.filter(u => u.dept_id === targetDepartment.dept_id);
  }, [users, targetDepartment.dept_id]);

  // Candidates not in this department
  const candidates = useMemo(() => {
    return users.filter(u => u.dept_id !== targetDepartment.dept_id);
  }, [users, targetDepartment.dept_id]);

  // Active top tab: 'MEMBERS' (Active Members) or 'ADD' (Add / Transfer Users)
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'ADD'>(
    currentMembers.length > 0 ? 'MEMBERS' : 'ADD'
  );

  // Search queries
  const [searchMembers, setSearchMembers] = useState('');
  const [searchCandidates, setSearchCandidates] = useState('');

  // Add tab sub-filter
  const [candidateFilter, setCandidateFilter] = useState<'UNASSIGNED' | 'TRANSFER' | 'ALL'>('UNASSIGNED');

  // Selected state for adding
  const [selectedAddIds, setSelectedAddIds] = useState<number[]>([]);
  // Selected state for removing
  const [selectedRemoveIds, setSelectedRemoveIds] = useState<number[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [askConfirm, confirmModal] = usePortalConfirm();

  // Filtered current members
  const filteredMembers = useMemo(() => {
    const q = searchMembers.trim().toLowerCase();
    if (!q) return currentMembers;
    return currentMembers.filter(u => {
      const matchName = (u.full_name || '').toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchPosition = (u.position || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchPosition || matchEmail;
    });
  }, [currentMembers, searchMembers]);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    const q = searchCandidates.trim().toLowerCase();
    return candidates.filter(u => {
      const isUnassigned = u.dept_id === null || u.dept_id === undefined;
      if (candidateFilter === 'UNASSIGNED' && !isUnassigned) return false;
      if (candidateFilter === 'TRANSFER' && isUnassigned) return false;

      if (!q) return true;
      const matchName = (u.full_name || '').toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchPosition = (u.position || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchPosition || matchEmail;
    });
  }, [candidates, candidateFilter, searchCandidates]);

  const unassignedCount = useMemo(() => {
    return candidates.filter(u => u.dept_id === null || u.dept_id === undefined).length;
  }, [candidates]);

  const transferCount = useMemo(() => {
    return candidates.filter(u => u.dept_id !== null && u.dept_id !== undefined).length;
  }, [candidates]);

  // Toggle selection for adding
  const allFilteredCandidatesSelected =
    filteredCandidates.length > 0 &&
    filteredCandidates.every(u => selectedAddIds.includes(u.id));

  function toggleSelectAllCandidates() {
    if (allFilteredCandidatesSelected) {
      const filteredIds = new Set(filteredCandidates.map(u => u.id));
      setSelectedAddIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const next = new Set(selectedAddIds);
      filteredCandidates.forEach(u => next.add(u.id));
      setSelectedAddIds(Array.from(next));
    }
  }

  function toggleAddUser(id: number) {
    setSelectedAddIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // Toggle selection for removing
  const allFilteredMembersSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every(u => selectedRemoveIds.includes(u.id));

  function toggleSelectAllMembers() {
    if (allFilteredMembersSelected) {
      const filteredIds = new Set(filteredMembers.map(u => u.id));
      setSelectedRemoveIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const next = new Set(selectedRemoveIds);
      filteredMembers.forEach(u => next.add(u.id));
      setSelectedRemoveIds(Array.from(next));
    }
  }

  function toggleRemoveUser(id: number) {
    setSelectedRemoveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // Actions
  async function handleAssignSelected() {
    if (selectedAddIds.length === 0) return;
    try {
      setIsSubmitting(true);
      await onAssignUsers(selectedAddIds);
      setSelectedAddIds([]);
      setActiveTab('MEMBERS');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveSelected() {
    if (selectedRemoveIds.length === 0) return;
    const ok = await askConfirm({
      title: 'Remove selected users?',
      message: `Remove ${selectedRemoveIds.length} selected users from ${targetDepartment.department_name}? They will become Unassigned.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      setIsSubmitting(true);
      await onRemoveUsers(selectedRemoveIds);
      setSelectedRemoveIds([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveSingle(user: Row) {
    const ok = await askConfirm({
      title: 'Remove user from department?',
      message: `Remove ${user.full_name || user.username} from ${targetDepartment.department_name}? The user will become Unassigned.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      setIsSubmitting(true);
      await onRemoveUsers([user.id]);
      setSelectedRemoveIds(prev => prev.filter(id => id !== user.id));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 25px 60px -15px rgba(0, 44, 95, 0.3)',
          width: '100%',
          maxWidth: 720,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div
          style={{
            height: 4,
            background: 'linear-gradient(90deg, #002C5F, #FF9900)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #002C5F, #0284C7)',
                color: '#FF9900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 44, 95, 0.15)',
              }}
            >
              <i className="fas fa-users-cog" style={{fontSize: 20}} />
            </div>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#002C5F',
                  }}
                >
                  Manage Department Members
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid #BFDBFE',
                  }}
                >
                  {targetDepartment.department_code}
                </span>
              </div>
              <p style={{margin: '3px 0 0', fontSize: 12, color: '#64748B'}}>
                Department: <strong style={{color: '#002C5F'}}>{targetDepartment.department_name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              fontSize: 18,
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            title="Close"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Tab Selector Header */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '6px 24px 0',
            gap: 16,
          }}
        >
          {/* Tab 1: Current Members */}
          <button
            type="button"
            onClick={() => setActiveTab('MEMBERS')}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === 'MEMBERS' ? '3px solid #002C5F' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'MEMBERS' ? '#002C5F' : '#64748B',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-user-check" style={{color: activeTab === 'MEMBERS' ? '#FF9900' : '#94A3B8'}} />
            <span>Active Members</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: activeTab === 'MEMBERS' ? '#002C5F' : '#E2E8F0',
                color: activeTab === 'MEMBERS' ? '#FFFFFF' : '#475569',
                padding: '1px 7px',
                borderRadius: 999,
              }}
            >
              {currentMembers.length}
            </span>
          </button>

          {/* Tab 2: Add / Transfer */}
          <button
            type="button"
            onClick={() => setActiveTab('ADD')}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === 'ADD' ? '3px solid #002C5F' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'ADD' ? '#002C5F' : '#64748B',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-user-plus" style={{color: activeTab === 'ADD' ? '#16A34A' : '#94A3B8'}} />
            <span>Add / Transfer Users</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: activeTab === 'ADD' ? '#16A34A' : '#E2E8F0',
                color: activeTab === 'ADD' ? '#FFFFFF' : '#475569',
                padding: '1px 7px',
                borderRadius: 999,
              }}
            >
              +{candidates.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: ACTIVE MEMBERS TAB                                                */}
        {/* ========================================================================= */}
        {activeTab === 'MEMBERS' && (
          <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
            {/* Search & Actions Bar */}
            <div
              style={{
                padding: '14px 24px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{position: 'relative', flex: 1, minWidth: 240}}>
                <i
                  className="fas fa-search"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    fontSize: 12,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search members in this department..."
                  value={searchMembers}
                  onChange={e => setSearchMembers(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 12,
                    fontFamily: "'Outfit', sans-serif",
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {filteredMembers.length > 0 && (
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#002C5F',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allFilteredMembersSelected}
                      onChange={toggleSelectAllMembers}
                      style={{width: 16, height: 16, cursor: 'pointer', accentColor: '#002C5F'}}
                    />
                    <span>Select All ({filteredMembers.length})</span>
                  </label>
                </div>
              )}
            </div>

            {/* Members List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px 24px',
                maxHeight: 380,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {currentMembers.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748B',
                    fontSize: 13,
                  }}
                >
                  <i
                    className="fas fa-user-slash"
                    style={{fontSize: 36, color: '#CBD5E1', marginBottom: 12, display: 'block'}}
                  />
                  <strong style={{fontSize: 14, color: '#1E293B'}}>No Members Assigned</strong>
                  <p style={{margin: '4px 0 16px', fontSize: 12}}>
                    {targetDepartment.department_name} currently has no active members.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ADD')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: '#002C5F',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <i className="fas fa-plus" />
                    <span>Add Members Now</span>
                  </button>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{textAlign: 'center', padding: '36px 16px', color: '#64748B', fontSize: 13}}>
                  No members match search query <strong>"{searchMembers}"</strong>
                </div>
              ) : (
                filteredMembers.map(u => {
                  const isSelected = selectedRemoveIds.includes(u.id);
                  const initials = String(u.full_name || u.username || 'U')
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: isSelected ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#FFF1F2' : '#FFFFFF',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(220, 38, 38, 0.08)' : 'none',
                      }}
                    >
                      <div
                        style={{display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1}}
                        onClick={() => toggleRemoveUser(u.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // parent click
                          style={{width: 17, height: 17, cursor: 'pointer', accentColor: '#DC2626'}}
                        />

                        {/* Avatar */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: '#002C5F',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>

                        {/* Info */}
                        <div>
                          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                            <span style={{fontSize: 13, fontWeight: 700, color: '#002C5F'}}>
                              {u.full_name || u.username}
                            </span>
                            <code
                              style={{
                                fontSize: 11,
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              @{u.username}
                            </code>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#64748B',
                              marginTop: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            {u.position && <span>{u.position}</span>}
                            {u.email && (
                              <>
                                <span>•</span>
                                <span>{u.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button for Single User */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSingle(u)}
                        disabled={isSubmitting}
                        style={{
                          background: '#FEE2E2',
                          border: '1px solid #FECACA',
                          borderRadius: 8,
                          padding: '5px 10px',
                          color: '#DC2626',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                        title={`Remove ${u.full_name || u.username} from this department (set as unassigned)`}
                      >
                        <i className="fas fa-user-minus" />
                        <span>Remove</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer for Members Tab */}
            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                {selectedRemoveIds.length > 0 ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#DC2626',
                      backgroundColor: '#FEE2E2',
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {selectedRemoveIds.length} Members Selected for Removal
                  </span>
                ) : (
                  <span style={{fontSize: 12, color: '#64748B'}}>
                    Total: <strong>{currentMembers.length}</strong> active members in {targetDepartment.department_code}
                  </span>
                )}
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                {selectedRemoveIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    disabled={isSubmitting}
                    style={{
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      backgroundColor: '#DC2626',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                    }}
                  >
                    <i className="fas fa-trash-alt" />
                    <span>Remove {selectedRemoveIds.length} Selected Users</span>
                  </button>
                )}

                <button
                  type="button"
                  className="button secondary"
                  onClick={onClose}
                  style={{padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 8}}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: ADD / TRANSFER USERS TAB                                          */}
        {/* ========================================================================= */}
        {activeTab === 'ADD' && (
          <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
            {/* Search & Sub-Filter Bar */}
            <div
              style={{
                padding: '14px 24px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{position: 'relative', width: '100%'}}>
                <i
                  className="fas fa-search"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    fontSize: 12,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search candidates by name, username, title, email..."
                  value={searchCandidates}
                  onChange={e => setSearchCandidates(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 12,
                    fontFamily: "'Outfit', sans-serif",
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Sub-filter pills & select all */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  <button
                    type="button"
                    onClick={() => setCandidateFilter('UNASSIGNED')}
                    style={{
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: candidateFilter === 'UNASSIGNED' ? '#002C5F' : '#E2E8F0',
                      color: candidateFilter === 'UNASSIGNED' ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <i className="fas fa-user-clock" />
                    <span>Unassigned ({unassignedCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateFilter('TRANSFER')}
                    style={{
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: candidateFilter === 'TRANSFER' ? '#002C5F' : '#E2E8F0',
                      color: candidateFilter === 'TRANSFER' ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <i className="fas fa-exchange-alt" />
                    <span>Transfer from Other Dept ({transferCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateFilter('ALL')}
                    style={{
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: candidateFilter === 'ALL' ? '#002C5F' : '#E2E8F0',
                      color: candidateFilter === 'ALL' ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <i className="fas fa-users" />
                    <span>All Candidates ({candidates.length})</span>
                  </button>
                </div>

                {filteredCandidates.length > 0 && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#002C5F',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allFilteredCandidatesSelected}
                      onChange={toggleSelectAllCandidates}
                      style={{width: 16, height: 16, cursor: 'pointer', accentColor: '#002C5F'}}
                    />
                    <span>Select All ({filteredCandidates.length})</span>
                  </label>
                )}
              </div>
            </div>

            {/* Candidates Checklist */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px 24px',
                maxHeight: 380,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {filteredCandidates.length === 0 ? (
                <div style={{textAlign: 'center', padding: '36px 16px', color: '#64748B', fontSize: 13}}>
                  <i
                    className="fas fa-user-slash"
                    style={{fontSize: 32, color: '#CBD5E1', marginBottom: 12, display: 'block'}}
                  />
                  <strong>No candidate users match your filter</strong>
                  <p style={{margin: '4px 0 0', fontSize: 12}}>
                    Try switching filter tabs or use different search keywords.
                  </p>
                </div>
              ) : (
                filteredCandidates.map(u => {
                  const isSelected = selectedAddIds.includes(u.id);
                  const initials = String(u.full_name || u.username || 'U')
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleAddUser(u.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: isSelected ? '1.5px solid #002C5F' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(0, 44, 95, 0.08)' : 'none',
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // parent onClick
                          style={{width: 17, height: 17, cursor: 'pointer', accentColor: '#002C5F'}}
                        />

                        {/* Avatar */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#002C5F' : '#E2E8F0',
                            color: isSelected ? '#FFFFFF' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>

                        {/* Info */}
                        <div>
                          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                            <span style={{fontSize: 13, fontWeight: 700, color: '#002C5F'}}>
                              {u.full_name || u.username}
                            </span>
                            <code
                              style={{
                                fontSize: 11,
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              @{u.username}
                            </code>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#64748B',
                              marginTop: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            {u.position && <span>{u.position}</span>}
                            {u.email && (
                              <>
                                <span>•</span>
                                <span>{u.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Current Department Status */}
                      <div>
                        {u.department_name ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #FDE68A',
                              whiteSpace: 'nowrap',
                            }}
                            title={`Will be transferred from ${u.department_name}`}
                          >
                            Transfer from: {u.department_code || u.department_name}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #FECACA',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <i className="fas fa-exclamation-circle" style={{fontSize: 10}} />
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer for Add Tab */}
            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: selectedAddIds.length > 0 ? '#166534' : '#64748B',
                    backgroundColor: selectedAddIds.length > 0 ? '#DCFCE7' : '#E2E8F0',
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {selectedAddIds.length} Candidates Selected
                </span>
                {selectedAddIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAddIds([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 11,
                      color: '#DC2626',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontWeight: 700,
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 8}}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={handleAssignSelected}
                  disabled={selectedAddIds.length === 0 || isSubmitting}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 8,
                    backgroundColor: selectedAddIds.length > 0 ? '#002C5F' : '#94A3B8',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: selectedAddIds.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: selectedAddIds.length > 0 ? '0 4px 12px rgba(0, 44, 95, 0.2)' : 'none',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-plus" />
                      <span>
                        Assign {selectedAddIds.length > 0 ? `${selectedAddIds.length} ` : ''}
                        to {targetDepartment.department_code}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {confirmModal}
    </div>
  );
}
