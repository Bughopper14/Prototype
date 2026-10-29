import React, { useState } from 'react';
import {
  Activity,
  Bell,
  CheckCheck,
  Check,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  FolderCheck,
  Sparkles,
  Pencil,
  FileText,
  AlertCircle,
  Inbox,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { SystemActivity, SystemNotificationItem } from './system-activity';

interface ActivityPageProps {
  activities: SystemActivity[];
  readActivityIds: Set<string>;
  onOpen: (applicationId: string, tabIndex?: number) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function ActivityPage({
  activities,
  readActivityIds,
  onOpen,
  onMarkRead,
  onMarkAllRead
}: ActivityPageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const unreadList = activities.filter(a => !a.read && !readActivityIds.has(a.id));
  const displayList = (filter === 'unread' ? unreadList : activities).filter(a => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      a.companyName.toLowerCase().includes(term) ||
      a.title.toLowerCase().includes(term) ||
      a.section.toLowerCase().includes(term) ||
      (a.fapNumber && a.fapNumber.toLowerCase().includes(term)) ||
      (a.details && a.details.toLowerCase().includes(term))
    );
  });

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'CREATE':
        return { bg: '#e0f2fe', text: '#0369a1', icon: Sparkles, label: 'Created' };
      case 'APPROVE':
        return { bg: '#dcfce7', text: '#15803d', icon: ShieldCheck, label: 'Approved' };
      case 'SUBMIT':
        return { bg: '#e0e7ff', text: '#4338ca', icon: ArrowUpRight, label: 'Submitted' };
      case 'VERIFY':
        return { bg: '#ccfbf1', text: '#0f766e', icon: FolderCheck, label: 'Verified' };
      default:
        return { bg: '#fef3c7', text: '#b45309', icon: Pencil, label: 'Updated' };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <section className="panel" style={{ padding: '24px 28px', borderRadius: 12 }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 18
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Activity size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                Recent System Activity
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                Live record of application changes, form submissions, and section updates.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {unreadList.length > 0 && (
            <button
              type="button"
              className="button"
              onClick={onMarkAllRead}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#0284c7',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 7,
                cursor: 'pointer'
              }}
              title="Mark all unread activities as seen (clears badge count)"
            >
              <CheckCheck size={16} />
              <span>Mark all as seen</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === 'all' ? '#002c5f' : '#cbd5e1',
              background: filter === 'all' ? '#002c5f' : '#ffffff',
              color: filter === 'all' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>All History</span>
            <span
              style={{
                background: filter === 'all' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                color: filter === 'all' ? '#ffffff' : '#334155',
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              {activities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === 'unread' ? '#002c5f' : '#cbd5e1',
              background: filter === 'unread' ? '#002c5f' : '#ffffff',
              color: filter === 'unread' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>Unread Activities</span>
            {unreadList.length > 0 ? (
              <span
                style={{
                  background: filter === 'unread' ? '#ff9900' : '#e2e8f0',
                  color: filter === 'unread' ? '#ffffff' : '#334155',
                  padding: '1px 7px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {unreadList.length}
              </span>
            ) : null}
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="Filter activities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              width: 220,
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Activity list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayList.map(item => {
          const isUnread = !item.read && !readActivityIds.has(item.id);
          const badge = getActionBadge(item.actionType);
          const BadgeIcon = badge.icon;

          return (
            <article
              key={item.id}
              style={{
                background: isUnread ? '#f8fafc' : '#ffffff',
                border: isUnread ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px 20px',
                boxShadow: isUnread
                  ? '0 2px 8px rgba(59, 130, 246, 0.08)'
                  : '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Left Action Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: badge.bg,
                  color: badge.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2
                }}
              >
                <BadgeIcon size={20} />
              </div>

              {/* Main Card Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 4
                  }}
                >
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.text,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}
                  >
                    {badge.label}
                  </span>

                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4
                    }}
                  >
                    Section: {item.section}
                  </span>

                  {item.fapNumber && (
                    <span
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4
                      }}
                    >
                      {item.fapNumber}
                    </span>
                  )}

                  {isUnread && (
                    <span
                      style={{
                        background: '#0284c7',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 999
                      }}
                    >
                      NEW
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4
                  style={{
                    margin: '4px 0 6px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.4
                  }}
                >
                  {item.title}
                </h4>

                {/* Details snippet */}
                {item.details && (
                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: 13,
                      color: '#475569',
                      lineHeight: 1.5
                    }}
                  >
                    {item.details}
                  </p>
                )}

                {/* Meta footer: User, Role, Timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    fontSize: 12,
                    color: '#64748b',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{item.actionBy}</span>
                    <span
                      style={{
                        background: '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#64748b'
                      }}
                    >
                      {item.userRole || 'User'}
                    </span>
                  </span>

                  <span>•</span>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} />
                    <span>{formatTime(item.timestamp)}</span>
                  </span>
                </div>
              </div>

              {/* Action buttons on the right: Direct Link to section & Mark as read */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  flexShrink: 0,
                  alignItems: 'flex-end'
                }}
              >
                {item.applicationId && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkRead(item.id);
                      onOpen(item.applicationId!, item.tabIndex !== undefined ? item.tabIndex : 0);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#002c5f',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '7px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 44, 95, 0.2)',
                      transition: 'background 0.15s ease'
                    }}
                    title={`Open ${item.companyName} at tab: ${item.section}`}
                  >
                    <span>Open Section</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}

                {isUnread ? (
                  <button
                    type="button"
                    onClick={() => onMarkRead(item.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Mark this activity as seen (clears sidebar unread badge)"
                  >
                    <Check size={13} />
                    <span>Mark seen</span>
                  </button>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: '#94a3b8',
                      padding: '5px 10px',
                      fontWeight: 500
                    }}
                  >
                    <CheckCheck size={14} style={{ color: '#10b981' }} />
                    <span>Seen</span>
                  </span>
                )}
              </div>
            </article>
          );
        })}

        {displayList.length === 0 && (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: 12,
              color: '#64748b'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              {filter === 'unread'
                ? 'All caught up!'
                : (activities.length === 0 ? 'No activity history yet' : 'No activities found')}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {filter === 'unread'
                ? 'No unread activity tasks.'
                : (activities.length === 0
                    ? 'Real-time application changes and updates will be logged here automatically.'
                    : 'No activities match the current search filter.')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

interface EnhancedNotificationsPageProps {
  notifications: SystemNotificationItem[];
  readNotificationIds: Set<string>;
  onOpen: (applicationId: string, tabIndex?: number) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function EnhancedNotificationsPage({
  notifications,
  readNotificationIds,
  onOpen,
  onMarkRead,
  onMarkAllRead
}: EnhancedNotificationsPageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const unreadList = notifications.filter(n => !n.readAt && !readNotificationIds.has(n.id));
  const displayList = (filter === 'unread' ? unreadList : notifications).filter(n => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(term) ||
      n.message.toLowerCase().includes(term) ||
      (n.companyName && n.companyName.toLowerCase().includes(term)) ||
      (n.fapNumber && n.fapNumber.toLowerCase().includes(term))
    );
  });

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <section className="panel" style={{ padding: '24px 28px', borderRadius: 12 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 18
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Notifications &amp; Tasks
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
              Pending approvals, verification tasks, and deed reviews needing follow-up.
            </p>
          </div>
        </div>

        {unreadList.length > 0 && (
          <button
            type="button"
            className="button"
            onClick={onMarkAllRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#0284c7',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 7,
              cursor: 'pointer'
            }}
            title="Mark all notifications as read (clears badge count)"
          >
            <CheckCheck size={16} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === 'all' ? '#002c5f' : '#cbd5e1',
              background: filter === 'all' ? '#002c5f' : '#ffffff',
              color: filter === 'all' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>All Notifications</span>
            <span
              style={{
                background: filter === 'all' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                color: filter === 'all' ? '#ffffff' : '#334155',
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === 'unread' ? '#002c5f' : '#cbd5e1',
              background: filter === 'unread' ? '#002c5f' : '#ffffff',
              color: filter === 'unread' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>Unread Notifications</span>
            {unreadList.length > 0 && (
              <span
                style={{
                  background: filter === 'unread' ? '#ff9900' : '#e2e8f0',
                  color: filter === 'unread' ? '#ffffff' : '#334155',
                  padding: '1px 7px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {unreadList.length}
              </span>
            )}
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              width: 220,
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Notifications list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayList.map(item => {
          const isUnread = !item.readAt && !readNotificationIds.has(item.id);

          return (
            <article
              key={item.id}
              style={{
                background: isUnread ? '#fffbf5' : '#ffffff',
                border: isUnread ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px 20px',
                boxShadow: isUnread
                  ? '0 2px 8px rgba(249, 115, 22, 0.08)'
                  : '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                position: 'relative'
              }}
            >
              {/* Alert icon */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: item.priority === 'high' ? '#fee2e2' : '#fef3c7',
                  color: item.priority === 'high' ? '#dc2626' : '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2
                }}
              >
                <AlertCircle size={20} />
              </div>

              {/* Main Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 4
                  }}
                >
                  {item.taskType && (
                    <span
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4
                      }}
                    >
                      {item.taskType}
                    </span>
                  )}

                  {item.priority === 'high' && (
                    <span
                      style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4
                      }}
                    >
                      HIGH PRIORITY
                    </span>
                  )}

                  {isUnread && (
                    <span
                      style={{
                        background: '#ea580c',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 999
                      }}
                    >
                      NEW
                    </span>
                  )}
                </div>

                <h4
                  style={{
                    margin: '4px 0 6px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {item.title}
                </h4>

                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: 13,
                    color: '#475569',
                    lineHeight: 1.5
                  }}
                >
                  {item.message}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 12,
                    color: '#64748b'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} />
                    <span>{formatTime(item.createdAt)}</span>
                  </span>
                  {item.fapNumber && (
                    <>
                      <span>•</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{item.fapNumber}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  flexShrink: 0,
                  alignItems: 'flex-end'
                }}
              >
                {item.applicationId && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkRead(item.id);
                      onOpen(item.applicationId!, item.tabIndex !== undefined ? item.tabIndex : 0);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#002c5f',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '7px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 44, 95, 0.2)'
                    }}
                    title={`Open ${item.companyName} for action`}
                  >
                    <span>Open Task</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}

                {isUnread ? (
                  <button
                    type="button"
                    onClick={() => onMarkRead(item.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Mark this notification as read (clears sidebar unread badge)"
                  >
                    <Check size={13} />
                    <span>Mark as read</span>
                  </button>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: '#94a3b8',
                      padding: '5px 10px',
                      fontWeight: 500
                    }}
                  >
                    <CheckCheck size={14} style={{ color: '#10b981' }} />
                    <span>Read</span>
                  </span>
                )}
              </div>
            </article>
          );
        })}

        {displayList.length === 0 && (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: 12,
              color: '#64748b'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#ffedd5',
                color: '#ea580c',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              {filter === 'unread'
                ? 'All caught up!'
                : (notifications.length === 0 ? 'No notifications yet' : 'No notifications found')}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {filter === 'unread'
                ? 'No unread notification tasks.'
                : (notifications.length === 0
                    ? 'Important reminders and required actions will appear here automatically.'
                    : 'No notifications match the current search filter.')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
