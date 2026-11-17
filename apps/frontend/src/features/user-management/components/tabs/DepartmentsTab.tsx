/** Departments: list, create, edit, delete, and manage user assignments. */
import {DepartmentForm} from '@/features/user-management/components/forms/DepartmentForm';
import {DepartmentMembersListDialog} from '@/features/user-management/components/forms/DepartmentMembersListDialog';
import {ManageDepartmentMembersDialog} from '@/features/user-management/components/forms/ManageDepartmentMembersDialog';
import {call} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import {AddButton} from '@/features/user-management/components/ui/AddButton';
import type {ReactNode} from 'react';
import type {Overview, Row} from '@/features/user-management/lib/types';

export function DepartmentsTab({
  data,
  act,
  setDialog,
  empty,
}: {
  data: Overview;
  act: (work: () => Promise<{message?: string} | void>) => Promise<void>;
  setDialog: (dialog: ReactNode) => void;
  empty: (cols: number) => ReactNode;
}) {
  const departments = data.departments || [];
  const unassignedUsers = (data.users || []).filter(u => !u.dept_id);

  // Group active users by department
  const usersByDept = new Map<number, Row[]>();
  (data.users || []).forEach(u => {
    if (u.dept_id) {
      const list = usersByDept.get(u.dept_id) || [];
      list.push(u);
      usersByDept.set(u.dept_id, list);
    }
  });

  // Handler to open Manage Department Members dialog (add / remove users)
  const openManageUsersDialog = (dept: Row) => {
    setDialog(
      <ManageDepartmentMembersDialog
        targetDepartment={dept}
        users={data.users}
        onAssignUsers={async userIds => {
          await act(() =>
            call('/departments/assign-user', 'PUT', {
              userIds,
              dept_id: dept.dept_id,
            }),
          );
        }}
        onRemoveUsers={async userIds => {
          await act(() =>
            call('/departments/assign-user', 'PUT', {
              userIds,
              dept_id: null,
            }),
          );
        }}
        onClose={() => setDialog(null)}
      />,
    );
  };

  // Handler to open Member List popup
  const openMembersListDialog = (dept: Row, members: Row[]) => {
    setDialog(
      <DepartmentMembersListDialog
        department={dept}
        members={members}
        onOpenManage={() => openManageUsersDialog(dept)}
        onClose={() => setDialog(null)}
      />,
    );
  };

  return (
    <>
      {/* Informative notice for unassigned users */}
      {unassignedUsers.length > 0 && (
        <div
          className="um-notice warning"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #fed7aa',
            backgroundColor: '#fffbeb',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <i
              className="fas fa-exclamation-triangle"
              style={{color: '#f97316', fontSize: '1.25rem'}}
            />
            <div>
              <div style={{fontWeight: 700, color: '#9a3412', fontSize: '0.95rem'}}>
                {unassignedUsers.length} Users are currently unassigned to any department
              </div>
              <div style={{fontSize: '0.85rem', color: '#c2410c', marginTop: 2}}>
                Users:{' '}
                <strong>
                  {unassignedUsers.slice(0, 5).map(u => u.full_name || u.username).join(', ')}
                  {unassignedUsers.length > 5 ? `, and ${unassignedUsers.length - 5} others` : ''}
                </strong>{' '}
                (assign them using <em>Edit Users</em> on any department or from the <em>Users</em> tab)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Head: clean header with only + Add Department */}
      <SectionHead
        icon="fa-building"
        color="#002c5f"
        title="Manage Departments"
        action={
          <AddButton
            label="Add Department"
            onClick={() =>
              setDialog(
                <DepartmentForm
                  onSave={v => act(() => call('/departments', 'POST', v))}
                  onClose={() => setDialog(null)}
                />,
              )
            }
          />
        }
      />

      {/* Department Table: Clean 5 columns without sprawling registered users cell */}
      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th style={{width: 140}}>DEPT CODE</th>
              <th style={{width: 240}}>DEPARTMENT NAME</th>
              <th>DESCRIPTION</th>
              <th style={{width: 140, textAlign: 'center'}}>TOTAL USERS</th>
              <th style={{width: 250}}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 && empty(5)}
            {departments.map(d => {
              const assigned = usersByDept.get(d.dept_id) || [];
              return (
                <tr key={d.dept_id}>
                  {/* Department Code */}
                  <td>
                    <span
                      className="badge-position"
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        borderColor: '#bfdbfe',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {d.department_code}
                    </span>
                  </td>

                  {/* Department Name */}
                  <td>
                    <strong style={{color: '#1e293b'}}>{d.department_name}</strong>
                  </td>

                  {/* Description */}
                  <td>
                    <span className="um-muted" style={{fontSize: '0.88rem'}}>
                      {d.description || '—'}
                    </span>
                  </td>

                  {/* Clickable Total Users Count */}
                  <td style={{textAlign: 'center'}}>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        backgroundColor: assigned.length > 0 ? '#002C5F' : '#E2E8F0',
                        color: assigned.length > 0 ? '#FFFFFF' : '#64748B',
                        fontWeight: 700,
                        padding: '5px 12px',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: assigned.length > 0 ? '0 2px 6px rgba(0, 44, 95, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Click to view ${assigned.length} members in ${d.department_name}`}
                      onClick={() => openMembersListDialog(d, assigned)}
                    >
                      <i
                        className="fas fa-users"
                        style={{
                          fontSize: '0.75rem',
                          color: assigned.length > 0 ? '#FF9900' : '#94A3B8',
                        }}
                      />
                      <span>
                        {assigned.length} {assigned.length === 1 ? 'User' : 'Users'}
                      </span>
                    </button>
                  </td>

                  {/* Actions Column: Edit Users, Edit Department, Delete Department */}
                  <td>
                    <div className="um-actions" style={{display: 'flex', alignItems: 'center', gap: 6}}>
                      {/* Edit Users button to add / remove users from this department */}
                      <button
                        type="button"
                        className="um-btn outline"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '5px 11px',
                          color: '#002C5F',
                          borderColor: '#CBD5E1',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title={`Add or remove users in ${d.department_name}`}
                        onClick={() => openManageUsersDialog(d)}
                      >
                        <i className="fas fa-users-cog" style={{color: '#FF9900', fontSize: '0.8rem'}} />
                        <span>Edit Users</span>
                      </button>

                      {/* Edit Department Meta */}
                      <button
                        type="button"
                        className="um-btn warning"
                        title="Edit Department"
                        style={{padding: '5px 10px', fontSize: '0.82rem'}}
                        onClick={() =>
                          setDialog(
                            <DepartmentForm
                              department={d}
                              onSave={v => act(() => call(`/departments/${d.dept_id}`, 'PUT', v))}
                              onClose={() => setDialog(null)}
                            />,
                          )
                        }
                      >
                        <i className="fas fa-edit" />
                        Edit
                      </button>

                      {/* Delete Department */}
                      <button
                        type="button"
                        className="um-btn danger"
                        title="Delete Department"
                        style={{padding: '5px 9px', fontSize: '0.82rem'}}
                        onClick={() =>
                          confirm(
                            `Delete department "${d.department_name}"? Users assigned to this department will become unassigned.`,
                          ) && act(() => call(`/departments/${d.dept_id}`, 'DELETE'))
                        }
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
