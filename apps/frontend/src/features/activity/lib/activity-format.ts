/** Labels, colours and filtering used by the activity page. */
import type {SystemActivity} from '@/features/activity/lib/types';
import {ArrowUpRight, FolderCheck, Pencil, ShieldCheck, Sparkles, type LucideIcon} from 'lucide-react';

export interface ActionBadge {
  bg: string;
  text: string;
  icon: LucideIcon;
  label: string;
}

export const getActionBadge = (type: string): ActionBadge => {
  switch (type) {
    case 'CREATE':
      return {bg: '#e0f2fe', text: '#0369a1', icon: Sparkles, label: 'Created'};
    case 'APPROVE':
      return {bg: '#dcfce7', text: '#15803d', icon: ShieldCheck, label: 'Approved'};
    case 'SUBMIT':
      return {bg: '#e0e7ff', text: '#4338ca', icon: ArrowUpRight, label: 'Submitted'};
    case 'VERIFY':
      return {bg: '#ccfbf1', text: '#0f766e', icon: FolderCheck, label: 'Verified'};
    default:
      return {bg: '#fef3c7', text: '#b45309', icon: Pencil, label: 'Updated'};
  }
};

export const formatTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
};

/** Activities that match the search text (company, title, section, FAP number or details). */
export function filterActivities(list: SystemActivity[], search: string) {
  return list.filter(a => {
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
}

/** Notifications that match the search text (title, message, company or FAP number). */
export function filterNotifications<
  T extends {title: string; message: string; companyName?: string | null; fapNumber?: string | null},
>(list: T[], search: string) {
  return list.filter(n => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(term) ||
      n.message.toLowerCase().includes(term) ||
      (n.companyName && n.companyName.toLowerCase().includes(term)) ||
      (n.fapNumber && n.fapNumber.toLowerCase().includes(term))
    );
  });
}
