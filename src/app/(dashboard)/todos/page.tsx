'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable,
  DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Search, Filter, Grid3X3, List, ChevronDown,
  MoreHorizontal, Trash2, Edit3, CheckCircle2, Circle,
  GripVertical, X, Tag, CheckCheck, ListTodo,
} from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { NeonInput } from '@/components/ui/NeonInput';
import { Modal } from '@/components/ui/Modal';
import { PriorityBadge, StatusBadge, Badge } from '@/components/ui/Badge';
import { useTodos } from '@/hooks/useTodos';
import { useTheme } from '@/contexts/ThemeContext';
import { Todo, TodoStatus, TodoPriority, SubTask } from '@/types';
import { cn, capitalize, hexToRgba, priorityColor, statusColor, generateId } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const STATUS_COLUMNS: { id: TodoStatus; label: string; color: string }[] = [
  { id: 'todo',        label: 'To Do',      color: '#6b7280' },
  { id: 'in_progress', label: 'In Progress', color: '#00d4ff' },
  { id: 'review',      label: 'Review',     color: '#a855f7' },
  { id: 'done',        label: 'Done',        color: '#22c55e' },
];

const PRIORITIES: TodoPriority[] = ['low','medium','high','critical'];

// ─── Todo Card ────────────────────────────────────────────────────────────────

const TodoCard: React.FC<{
  todo: Todo;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isDragging?: boolean;
}> = ({ todo, onComplete, onDelete, onEdit, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: dnd } = useSortable({ id: todo.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: dnd ? 0.4 : 1 };
  const [menuOpen, setMenuOpen] = useState(false);

  const subtaskProgress = todo.subtasks.length > 0
    ? Math.round((todo.subtasks.filter((s) => s.completed).length / todo.subtasks.length) * 100)
    : null;

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'rounded-xl border border-white/8 p-3 group transition-all',
          'hover:border-white/15 hover:shadow-lg',
          isDragging && 'shadow-2xl border-white/20',
          todo.status === 'done' && 'opacity-60'
        )}
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-start gap-2.5">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-white/20 hover:text-white/50 mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {/* Checkbox */}
          <button onClick={onComplete} className="mt-0.5 flex-shrink-0">
            {todo.status === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Circle className="w-4 h-4 text-white/20 hover:text-white/50 transition-colors" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium text-white', todo.status === 'done' && 'line-through text-white/50')}>
              {todo.title}
            </p>
            {todo.description && (
              <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{todo.description}</p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <PriorityBadge priority={todo.priority} />
              {todo.dueDate && (
                <span className="text-[10px] text-white/30">
                  📅 {format(todo.dueDate.toDate(), 'MMM d')}
                </span>
              )}
              {todo.labels.slice(0, 2).map((l) => (
                <Badge key={l} color="#6b7280" size="sm">{l}</Badge>
              ))}
            </div>

            {/* Subtask progress */}
            {subtaskProgress !== null && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                  <span>{todo.subtasks.filter((s) => s.completed).length}/{todo.subtasks.length} subtasks</span>
                  <span>{subtaskProgress}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-green-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white/20 hover:text-white/60 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  className="absolute right-0 top-6 z-20 w-32 rounded-xl border border-white/10 overflow-hidden"
                  style={{ background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(10px)' }}
                >
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Kanban Column ────────────────────────────────────────────────────────────

const KanbanColumn: React.FC<{
  column: typeof STATUS_COLUMNS[0];
  todos: Todo[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}> = ({ column, todos, onComplete, onDelete, onEdit }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col min-w-[280px] w-[280px]">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-xl border border-b-0"
        style={{
          background: hexToRgba(column.color, 0.08),
          borderColor: hexToRgba(column.color, 0.2),
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-sm font-medium text-white">{column.label}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: hexToRgba(column.color, 0.2), color: column.color }}
          >
            {todos.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[400px] p-2 space-y-2 rounded-b-xl border transition-colors',
          isOver ? 'bg-white/5' : 'bg-white/2'
        )}
        style={{ borderColor: 'rgba(255,255,255,0.06)', borderTop: 'none' }}
      >
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {todos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onComplete={() => onComplete(todo.id)}
                onDelete={() => onDelete(todo.id)}
                onEdit={() => onEdit(todo)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
};

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

const TodoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  todo?: Todo | null;
  onSave: (data: {
    title: string; description: string; priority: TodoPriority;
    status: TodoStatus; labels: string[]; dueDate: Date | null;
    subtasks: SubTask[];
  }) => Promise<void>;
}> = ({ isOpen, onClose, todo, onSave }) => {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority ?? 'medium');
  const [status, setStatus] = useState<TodoStatus>(todo?.status ?? 'todo');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState<string[]>(todo?.labels ?? []);
  const [dueDate, setDueDate] = useState(
    todo?.dueDate ? format(todo.dueDate.toDate(), "yyyy-MM-dd") : ''
  );
  const [subtasks, setSubtasks] = useState<SubTask[]>(todo?.subtasks ?? []);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [loading, setLoading] = useState(false);

  const addLabel = () => {
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      setLabels([...labels, labelInput.trim()]);
      setLabelInput('');
    }
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks(s => [...s, { id: generateId(), title: subtaskInput.trim(), completed: false, createdAt: Timestamp.now() }]);
    setSubtaskInput('');
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(s => s.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(s => s.filter(st => st.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    setLoading(true);
    try {
      await onSave({ title, description, priority, status, labels, dueDate: dueDate ? new Date(dueDate) : null, subtasks });
      onClose();
    } catch {
      toast.error('Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={todo ? 'Edit Task' : 'New Task'} size="md">
      <div className="space-y-4">
        <NeonInput label="Title" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            rows={2}
            className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Priority</label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-all border')}
                  style={{
                    background: priority === p ? hexToRgba(priorityColor(p), 0.2) : 'transparent',
                    color: priority === p ? priorityColor(p) : 'rgba(255,255,255,0.3)',
                    borderColor: priority === p ? hexToRgba(priorityColor(p), 0.4) : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {capitalize(p)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TodoStatus)}
              className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl text-white px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              {STATUS_COLUMNS.map((c) => (
                <option key={c.id} value={c.id} className="bg-dark-700">{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <NeonInput label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

        {/* Subtasks */}
        <div>
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Subtasks</label>
          <div className="flex gap-2 mt-1.5">
            <NeonInput
              placeholder="Add subtask..."
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
              icon={<ListTodo className="w-3.5 h-3.5" />}
            />
            <NeonButton variant="secondary" size="sm" onClick={addSubtask}>Add</NeonButton>
          </div>
          {subtasks.length > 0 && (
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
              {subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleSubtask(st.id)} className="flex-shrink-0">
                    {st.completed
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <Circle className="w-4 h-4 text-white/20" />
                    }
                  </button>
                  <span className={cn('text-sm flex-1 text-white/70', st.completed && 'line-through text-white/30')}>{st.title}</span>
                  <button onClick={() => removeSubtask(st.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labels */}
        <div>
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Labels</label>
          <div className="flex gap-2 mt-1.5">
            <NeonInput
              placeholder="Add label..."
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLabel()}
              icon={<Tag className="w-3.5 h-3.5" />}
            />
            <NeonButton variant="secondary" size="sm" onClick={addLabel}>Add</NeonButton>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {labels.map((l) => (
              <span key={l} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
                {l}
                <button onClick={() => setLabels(labels.filter((x) => x !== l))}>
                  <X className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <NeonButton variant="ghost" onClick={onClose} className="flex-1">Cancel</NeonButton>
          <NeonButton onClick={handleSave} loading={loading} glow className="flex-1">
            {todo ? 'Update Task' : 'Create Task'}
          </NeonButton>
        </div>
      </div>
    </Modal>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodosPage() {
  const { todos, todosByStatus, stats, addTodo, editTodo, completeTodo, removeTodo } = useTodos();
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const doneTodos = todos.filter(t => t.status === 'done');

  const bulkDeleteDone = async () => {
    await Promise.all(doneTodos.map(t => removeTodo(t.id)));
    toast.success(`Deleted ${doneTodos.length} completed tasks`);
  };

  const bulkCompleteAll = async () => {
    const incomplete = todos.filter(t => t.status !== 'done');
    await Promise.all(incomplete.map(t => completeTodo(t.id)));
    toast.success(`Marked ${incomplete.length} tasks done`);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = useMemo(() => {
    if (!search) return todos;
    const q = search.toLowerCase();
    return todos.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.labels.some((l) => l.toLowerCase().includes(q))
    );
  }, [todos, search]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveDragId(active.id as string);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    if (!over) return;
    const todoId = active.id as string;
    const newStatus = over.id as TodoStatus;
    const validStatuses: TodoStatus[] = ['todo','in_progress','review','done'];
    if (validStatuses.includes(newStatus)) {
      await editTodo(todoId, {
        status: newStatus,
        completedAt: newStatus === 'done' ? Timestamp.now() : null,
      });
    }
  };

  const activeTodo = activeDragId ? todos.find((t) => t.id === activeDragId) : null;

  return (
    <DashboardLayout title="Tasks" subtitle={`${stats.total} total · ${stats.completed} done`}>
      <div className="max-w-full space-y-4">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3">
          {STATUS_COLUMNS.map((col) => {
            const count = todosByStatus[col.id]?.length ?? 0;
            return (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative p-3 rounded-xl border overflow-hidden"
                style={{ background: hexToRgba(col.color, 0.05), borderColor: hexToRgba(col.color, 0.2) }}
              >
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-white/40 mt-0.5">{col.label}</p>
                <div
                  className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
                  style={{ width: `${todos.length ? (count / todos.length) * 100 : 0}%`, background: col.color }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <NeonInput
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            fullWidth={false}
            className="w-64"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {doneTodos.length > 0 && (
              <button
                onClick={bulkDeleteDone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete done ({doneTodos.length})
              </button>
            )}
            {todos.some(t => t.status !== 'done') && (
              <button
                onClick={bulkCompleteAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-green-400 border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Complete all
              </button>
            )}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn('p-2 rounded-lg transition-all', viewMode === 'kanban' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white')}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <NeonButton
              glow
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setAddModalOpen(true)}
            >
              New Task
            </NeonButton>
          </div>
        </div>

        {/* Views */}
        {viewMode === 'kanban' ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUS_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  todos={(filtered.filter((t) => t.status === col.id)).sort((a,b) => a.order - b.order)}
                  onComplete={completeTodo}
                  onDelete={removeTodo}
                  onEdit={setEditingTodo}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTodo && (
                <div className="rounded-xl border border-white/20 p-3 shadow-2xl opacity-90 rotate-2"
                  style={{ background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(12px)' }}>
                  <p className="text-sm font-medium text-white">{activeTodo.title}</p>
                  <PriorityBadge priority={activeTodo.priority} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <GlassCard padding="none">
            <div className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-white/30">No tasks found</div>
              ) : (
                filtered.map((todo, i) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors group"
                  >
                    <button onClick={() => completeTodo(todo.id)}>
                      {todo.status === 'done'
                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : <Circle className="w-5 h-5 text-white/20 hover:text-white/50" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium text-white', todo.status === 'done' && 'line-through text-white/50')}>
                        {todo.title}
                      </p>
                      {todo.description && <p className="text-xs text-white/40 truncate">{todo.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={todo.priority} />
                      <StatusBadge status={todo.status} />
                      {todo.dueDate && (
                        <span className="text-xs text-white/30">{format(todo.dueDate.toDate(), 'MMM d')}</span>
                      )}
                      <button onClick={() => setEditingTodo(todo)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-all">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        )}
      </div>

      <TodoModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={(data) => addTodo({ ...data, dueDate: data.dueDate ?? null, subtasks: data.subtasks } as Parameters<typeof addTodo>[0])}
      />

      {editingTodo && (
        <TodoModal
          isOpen={!!editingTodo}
          onClose={() => setEditingTodo(null)}
          todo={editingTodo}
          onSave={(data) => editTodo(editingTodo.id, {
            ...data,
            dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
            subtasks: data.subtasks,
          })}
        />
      )}
    </DashboardLayout>
  );
}
