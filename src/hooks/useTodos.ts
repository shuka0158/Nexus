'use client';

import { useState, useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Todo, TodoStatus, TodoPriority, SubTask, RecurringConfig } from '@/types';
import {
  subscribeToTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  batchUpdateTodoOrder,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/utils';

export const useTodos = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setTodos([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToTodos(user.uid, (data) => {
      setTodos(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addTodo = useCallback(async (data: {
    title: string;
    description?: string;
    status?: TodoStatus;
    priority?: TodoPriority;
    labels?: string[];
    dueDate?: Date | null;
    subtasks?: SubTask[];
    recurring?: RecurringConfig | null;
  }) => {
    if (!user) return;
    await createTodo({
      userId: user.uid,
      title: data.title,
      description: data.description ?? '',
      status: data.status ?? 'todo',
      priority: data.priority ?? 'medium',
      labels: data.labels ?? [],
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
      reminderAt: null,
      subtasks: data.subtasks ?? [],
      attachments: [],
      recurring: data.recurring ?? null,
      order: todos.length,
      completedAt: null,
    });
  }, [user, todos.length]);

  const editTodo = useCallback(async (id: string, data: Partial<Todo>) => {
    await updateTodo(id, data);
  }, []);

  // Advance a Date by N daily/weekly/monthly/yearly intervals
  const advanceDate = (from: Date, recurring: RecurringConfig): Date => {
    const d = new Date(from);
    const n = Math.max(1, recurring.interval);
    switch (recurring.frequency) {
      case 'daily':   d.setDate(d.getDate() + n); break;
      case 'weekly':  d.setDate(d.getDate() + n * 7); break;
      case 'monthly': d.setMonth(d.getMonth() + n); break;
      case 'yearly':  d.setFullYear(d.getFullYear() + n); break;
    }
    return d;
  };

  const completeTodo = useCallback(async (id: string) => {
    const current = todos.find((t) => t.id === id);
    await updateTodo(id, {
      status: 'done',
      completedAt: Timestamp.now(),
    });

    // If the completed task was recurring, spawn the next instance with a shifted due date
    if (current && current.recurring && user) {
      const base = current.dueDate ? current.dueDate.toDate() : new Date();
      const nextDue = advanceDate(base, current.recurring);
      const endDate = current.recurring.endDate?.toDate();
      if (!endDate || nextDue <= endDate) {
        await createTodo({
          userId: user.uid,
          title: current.title,
          description: current.description,
          status: 'todo',
          priority: current.priority,
          labels: current.labels,
          dueDate: Timestamp.fromDate(nextDue),
          reminderAt: null,
          // Carry forward subtasks as uncompleted templates
          subtasks: current.subtasks.map((s) => ({ ...s, completed: false, createdAt: Timestamp.now() })),
          attachments: [],
          recurring: current.recurring,
          order: todos.length,
          completedAt: null,
        });
      }
    }
  }, [todos, user]);

  const removeTodo = useCallback(async (id: string) => {
    await deleteTodo(id);
  }, []);

  const reorderTodos = useCallback(async (updates: { id: string; order: number }[]) => {
    await batchUpdateTodoOrder(updates);
  }, []);

  const addSubtask = useCallback(async (todoId: string, title: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    const subtask = { id: generateId(), title, completed: false, createdAt: Timestamp.now() };
    await updateTodo(todoId, { subtasks: [...todo.subtasks, subtask] });
  }, [todos]);

  const toggleSubtask = useCallback(async (todoId: string, subtaskId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    const subtasks = todo.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    await updateTodo(todoId, { subtasks });
  }, [todos]);

  const todosByStatus = {
    todo:        todos.filter((t) => t.status === 'todo'),
    in_progress: todos.filter((t) => t.status === 'in_progress'),
    review:      todos.filter((t) => t.status === 'review'),
    done:        todos.filter((t) => t.status === 'done'),
  };

  const stats = {
    total:       todos.length,
    completed:   todos.filter((t) => t.status === 'done').length,
    inProgress:  todos.filter((t) => t.status === 'in_progress').length,
    overdue:     todos.filter((t) => t.dueDate && t.dueDate.toDate() < new Date() && t.status !== 'done').length,
    completionRate: todos.length > 0
      ? Math.round((todos.filter((t) => t.status === 'done').length / todos.length) * 100)
      : 0,
  };

  return {
    todos,
    todosByStatus,
    stats,
    loading,
    addTodo,
    editTodo,
    completeTodo,
    removeTodo,
    reorderTodos,
    addSubtask,
    toggleSubtask,
  };
};
