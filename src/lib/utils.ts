import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatDate = (date: Date, format = 'MMM d, yyyy') => {
  const d = new Date(date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return format
    .replace('MMMM', d.toLocaleString('default', { month: 'long' }))
    .replace('MMM', months[d.getMonth()])
    .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
    .replace('M', String(d.getMonth() + 1))
    .replace('dddd', days[d.getDay()])
    .replace('ddd', days[d.getDay()].slice(0, 3))
    .replace('dd', String(d.getDate()).padStart(2, '0'))
    .replace('d', String(d.getDate()))
    .replace('yyyy', String(d.getFullYear()))
    .replace('yy', String(d.getFullYear()).slice(-2))
    .replace('HH', String(d.getHours()).padStart(2, '0'))
    .replace('mm', String(d.getMinutes()).padStart(2, '0'))
    .replace('ss', String(d.getSeconds()).padStart(2, '0'));
};

export const timeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

export const generateId = (): string =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

export const debounce = <T extends (...args: unknown[]) => unknown>(fn: T, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,212,255,${alpha})`;
  return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
};

export const priorityColor = (priority: string): string => {
  const map: Record<string, string> = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
  };
  return map[priority] ?? '#6b7280';
};

export const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    todo: '#6b7280',
    in_progress: '#00d4ff',
    review: '#a855f7',
    done: '#22c55e',
  };
  return map[status] ?? '#6b7280';
};

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

export const truncate = (str: string, max: number) =>
  str.length > max ? `${str.slice(0, max)}…` : str;

export const downloadJSON = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
