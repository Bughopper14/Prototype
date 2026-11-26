import {useState, useMemo} from 'react';
import {Row} from '@/features/user-management/lib/types';

export function DepartmentMembersListDialog({
  department,
  members,
  onOpenManage,
  onClose,
}: {
  department: Row;
  members: Row[];
  onOpenManage?: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(u => {
      const matchName = (u.full_name || '').toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchPosition = (u.position || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchPosition || matchEmail;
    });
  }, [members, search]);

  return (
    <div
      className="pt-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="pt-modal"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 44, 95, 0.25)',
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
              <i className="fas fa-users" style={{fontSize: 20}} />
            </div>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#002C5F',
                  }}
                >
                  Department Members
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
                  {department.department_code}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: members.length > 0 ? '#DCFCE7' : '#F1F5F9',
                    color: members.length > 0 ? '#166534' : '#64748B',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {members.length} {members.length === 1 ? 'User' : 'Users'}
                </span>
              </div>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 13,
                  color: '#64748B',
                  fontWeight: 500,
                }}
              >
                {department.department_name}
                {department.description ? ` · ${department.description}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-times" style={{fontSize: 14}} />
          </button>
        </div>

        {/* Search Bar (if members exist) */}
        {members.length > 0 && (
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                position: 'relative',
                flex: 1,
              }}
            >
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  fontSize: 13,
                }}
              />
              <input
                type="text"
                placeholder="Search by name, username, position, or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 34px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Member List Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            maxHeight: 460,
          }}
        >
          {members.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748B',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: '#F1F5F9',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  color: '#94A3B8',
                }}
              >
                <i className="fas fa-users-slash" style={{fontSize: 24}} />
              </div>
              <h4 style={{margin: '0 0 6px', color: '#1E293B', fontSize: 15, fontWeight: 700}}>
                No Members Assigned
              </h4>
              <p style={{margin: '0 0 16px', fontSize: 13, color: '#64748B'}}>
                There are currently no users assigned to <strong>{department.department_name}</strong>.
              </p>
              {onOpenManage && (
                <button
                  type="button"
                  onClick={onOpenManage}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#002C5F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(0, 44, 95, 0.15)',
                  }}
                >
                  <i className="fas fa-user-plus" style={{color: '#FF9900'}} />
                  <span>+ Add Users Now</span>
                </button>
              )}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                color: '#64748B',
              }}
            >
              <i className="fas fa-search" style={{fontSize: 20, color: '#94A3B8', marginBottom: 8}} />
              <div style={{fontSize: 14, fontWeight: 700}}>No matching users found</div>
              <div style={{fontSize: 12, marginTop: 4}}>Try another name or keyword</div>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              {filteredMembers.map((u, idx) => {
                const nameInitials = (u.full_name || u.username || 'U')
                  .split(' ')
                  .map((n: string) => n[0])
                  .filter(Boolean)
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
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      gap: 12,
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: 12, minWidth: 0}}>
                      {/* Avatar initial circle */}
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          backgroundColor: '#002C5F',
                          color: '#FFFFFF',
                          fontSize: 13,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0, 44, 95, 0.15)',
                        }}
                      >
                        {nameInitials}
                      </div>

                      <div style={{minWidth: 0}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#1E293B',
                              fontSize: 13.5,
                            }}
                          >
                            {u.full_name || u.username}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#64748B',
                              fontFamily: 'monospace',
                              backgroundColor: '#F1F5F9',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            @{u.username}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginTop: 3,
                            fontSize: 12,
                            color: '#64748B',
                            flexWrap: 'wrap',
                          }}
                        >
                          {u.position && (
                            <span style={{color: '#475569', fontWeight: 700}}>
                              <i
                                className="fas fa-briefcase"
                                style={{fontSize: 10, marginRight: 4, color: '#94A3B8'}}
                              />
                              {u.position}
                            </span>
                          )}

                          {u.email && (
                            <span>
                              <i
                                className="fas fa-envelope"
                                style={{fontSize: 10, marginRight: 4, color: '#94A3B8'}}
                              />
                              {u.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0}}>
                      {u.role_name ? (
                        <span
                          className="badge-app"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                          }}
                        >
                          {u.role_name}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: '#94A3B8',
                            fontStyle: 'italic',
                          }}
                        >
                          Standard Member
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{fontSize: 12, color: '#64748B', fontWeight: 500}}>
            Showing {filteredMembers.length} of {members.length} members
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              style={{padding: '7px 16px', fontSize: 13, fontWeight: 700, borderRadius: 8}}
            >
              Close
            </button>
            {onOpenManage && (
              <button
                type="button"
                className="button primary"
                onClick={onOpenManage}
                style={{
                  padding: '7px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  backgroundColor: '#002C5F',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(0, 44, 95, 0.2)',
                }}
              >
                <i className="fas fa-users-cog" style={{color: '#FF9900'}} />
                <span>Edit Users</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
