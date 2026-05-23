'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = '#00d4ff',
  className,
  size = 'sm',
  dot = false,
}) => {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClass,
        className
      )}
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, { color: string; label: string }> = {
    low:      { color: '#22c55e', label: 'Low' },
    medium:   { color: '#eab308', label: 'Medium' },
    high:     { color: '#f97316', label: 'High' },
    critical: { color: '#ef4444', label: 'Critical' },
  };
  const { color, label } = map[priority] ?? map.medium;
  return <Badge color={color} dot>{label}</Badge>;
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; label: string }> = {
    todo:        { color: '#6b7280', label: 'To Do' },
    in_progress: { color: '#00d4ff', label: 'In Progress' },
    review:      { color: '#a855f7', label: 'Review' },
    done:        { color: '#22c55e', label: 'Done' },
  };
  const { color, label } = map[status] ?? map.todo;
  return <Badge color={color} dot>{label}</Badge>;
};
