'use client';

import { motion } from 'framer-motion';
import { CheckSquare, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { GlassCard } from '@/components/ui/GlassCard';
import { PriorityBadge } from '@/components/ui/Badge';
import { Todo } from '@/types';

interface RecentTasksProps {
  todos: Todo[];
}

export const RecentTasks: React.FC<RecentTasksProps> = ({ todos }) => {
  const recent = todos
    .filter((t) => t.status !== 'done')
    .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
    .slice(0, 5);

  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Active Tasks</h3>
        <CheckSquare className="w-4 h-4 text-white/30" />
      </div>

      {recent.length === 0 ? (
        <div className="py-8 text-center">
          <CheckSquare className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-sm text-white/30">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((todo, i) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Circle className="w-4 h-4 text-white/20 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{todo.title}</p>
                {todo.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-white/30 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {format(todo.dueDate.toDate(), 'MMM d')}
                  </span>
                )}
              </div>
              <PriorityBadge priority={todo.priority} />
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};
