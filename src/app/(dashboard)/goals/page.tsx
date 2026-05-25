'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Check, Trash2, Edit3, X, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { subscribeToGoals, createGoal, updateGoal, deleteGoal } from '@/lib/firestore';
import { Goal, GoalMilestone } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const GOAL_COLORS = ['#00d4ff','#a855f7','#22c55e','#f97316','#f43f5e','#eab308','#06b6d4','#8b5cf6'];
const GOAL_EMOJIS = ['🎯','🏆','💡','🚀','📈','💪','🌱','⭐','🎓','💰','❤️','🌍'];
const CATEGORIES = ['health','work','learning','finance','personal','other'] as const;

const catColors: Record<string, string> = {
  health: '#22c55e', work: '#00d4ff', learning: '#a855f7',
  finance: '#eab308', personal: '#f43f5e', other: '#6b7280',
};

export default function GoalsPage() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'personal' as Goal['category'],
    color: GOAL_COLORS[0], emoji: GOAL_EMOJIS[0], progress: 0,
    targetDate: '', milestones: [] as { title: string }[],
  });
  const [newMilestone, setNewMilestone] = useState('');

  useEffect(() => {
    if (!user) return;
    return subscribeToGoals(user.uid, setGoals);
  }, [user]);

  const openCreate = () => {
    setForm({ title: '', description: '', category: 'personal', color: GOAL_COLORS[0], emoji: GOAL_EMOJIS[0], progress: 0, targetDate: '', milestones: [] });
    setEditGoal(null);
    setShowForm(true);
  };

  const openEdit = (g: Goal) => {
    setForm({
      title: g.title, description: g.description, category: g.category,
      color: g.color, emoji: g.emoji, progress: g.progress,
      targetDate: g.targetDate ? g.targetDate.toDate().toISOString().slice(0,10) : '',
      milestones: g.milestones.map(m => ({ title: m.title })),
    });
    setEditGoal(g);
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !form.title.trim()) return;
    const milestones: GoalMilestone[] = form.milestones.map((m, i) => ({
      id: String(i), title: m.title, completed: false, completedAt: null,
    }));
    try {
      if (editGoal) {
        await updateGoal(editGoal.id, {
          title: form.title, description: form.description, category: form.category,
          color: form.color, emoji: form.emoji, progress: form.progress,
          targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
        });
        toast.success('Goal updated');
      } else {
        await createGoal({
          userId: user.uid, title: form.title, description: form.description,
          category: form.category, color: form.color, emoji: form.emoji,
          progress: form.progress, milestones,
          targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
          completedAt: null,
        });
        toast.success('Goal created');
      }
      setShowForm(false);
    } catch { toast.error('Failed to save'); }
  };

  const toggleMilestone = async (goal: Goal, milestoneId: string) => {
    const updated = goal.milestones.map(m =>
      m.id === milestoneId
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? Timestamp.now() : null }
        : m
    );
    const completedCount = updated.filter(m => m.completed).length;
    const progress = updated.length ? Math.round((completedCount / updated.length) * 100) : goal.progress;
    await updateGoal(goal.id, { milestones: updated, progress });
  };

  const updateProgress = async (goal: Goal, progress: number) => {
    await updateGoal(goal.id, { progress, completedAt: progress === 100 ? Timestamp.now() : null });
  };

  const active = goals.filter(g => !g.completedAt);
  const completed = goals.filter(g => !!g.completedAt);

  return (
    <DashboardLayout title="Goals" subtitle="Your milestones, your journey">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Active', value: active.length, color: theme.accentColor },
          { label: 'Completed', value: completed.length, color: '#22c55e' },
          { label: 'Avg. Progress', value: active.length ? Math.round(active.reduce((a,g) => a+g.progress,0)/active.length) + '%' : '—', color: theme.secondaryColor },
        ].map(s => (
          <GlassCard key={s.label} padding="md" className="text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Active Goals</h2>
        <NeonButton onClick={openCreate} icon={<Plus className="w-4 h-4" />} glow size="sm">Add Goal</NeonButton>
      </div>

      {goals.length === 0 ? (
        <GlassCard padding="lg" className="text-center py-16">
          <Target className="w-12 h-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">No goals yet. Set your first one!</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {[...active, ...completed].map(goal => {
            const isExpanded = expandedId === goal.id;
            return (
              <motion.div key={goal.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/8 overflow-hidden transition-all hover:border-white/20"
                style={{ borderLeft: `3px solid ${goal.color}` }}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : goal.id)}
                  style={{ background: `linear-gradient(135deg, ${goal.color}10, ${goal.color}04)` }}
                >
                  <span className="text-2xl flex-shrink-0">{goal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn('text-sm font-semibold text-white', goal.completedAt && 'line-through text-white/40')}>{goal.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: `${catColors[goal.category]}20`, color: catColors[goal.category] }}>
                        {goal.category}
                      </span>
                      {goal.completedAt && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ Done</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: goal.color }}
                          initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.5 }} />
                      </div>
                      <span className="text-xs font-mono text-white/40 w-8">{goal.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); openEdit(goal); }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteGoal(goal.id).then(() => toast.success('Goal deleted')); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/8"
                    >
                      <div className="p-4 space-y-4">
                        {goal.description && <p className="text-sm text-white/50">{goal.description}</p>}

                        {/* Progress slider */}
                        <div>
                          <p className="text-xs text-white/40 mb-2">Progress: {goal.progress}%</p>
                          <input type="range" min={0} max={100} value={goal.progress}
                            onChange={e => updateProgress(goal, Number(e.target.value))}
                            className="w-full accent-[var(--accent)]"
                            style={{ accentColor: goal.color }} />
                        </div>

                        {/* Milestones */}
                        {goal.milestones.length > 0 && (
                          <div>
                            <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Flag className="w-3 h-3" /> Milestones</p>
                            <div className="space-y-1.5">
                              {goal.milestones.map(m => (
                                <button key={m.id} onClick={() => toggleMilestone(goal, m.id)}
                                  className="flex items-center gap-2 w-full text-left group/m hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors">
                                  <div className={cn('w-4 h-4 rounded-sm border transition-all flex items-center justify-center', m.completed ? 'border-transparent' : 'border-white/20')}
                                    style={{ background: m.completed ? goal.color : 'transparent' }}>
                                    {m.completed && <Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  <span className={cn('text-sm', m.completed ? 'line-through text-white/30' : 'text-white/70')}>{m.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {goal.targetDate && (
                          <p className="text-xs text-white/30">
                            Target: {goal.targetDate.toDate().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto"
              style={{ background: isDark ? 'rgba(10,10,25,0.98)' : 'rgba(248,250,252,0.98)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <p className="font-semibold text-white">{editGoal ? 'Edit Goal' : 'New Goal'}</p>
                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Goal title" className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--accent)]" />
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)" rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--accent)] resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/40 mb-1.5">Category</p>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Goal['category'] }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none capitalize">
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-900 capitalize">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1.5">Target date</p>
                    <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Emoji</p>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_EMOJIS.map(e => (
                      <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                        className={cn('w-9 h-9 rounded-xl text-lg transition-all hover:scale-110', form.emoji === e ? 'ring-2 ring-white/50 scale-110' : 'bg-white/5')}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Color</p>
                  <div className="flex gap-2">
                    {GOAL_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                        style={{ background: c, outline: form.color === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
                    ))}
                  </div>
                </div>
                {/* Milestones */}
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Milestones</p>
                  <div className="space-y-1.5 mb-2">
                    {form.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-white/60 flex-1">{m.title}</span>
                        <button onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter((_, j) => j !== i) }))}
                          className="text-white/30 hover:text-red-400"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newMilestone.trim()) { setForm(f => ({ ...f, milestones: [...f.milestones, { title: newMilestone.trim() }] })); setNewMilestone(''); }}}
                      placeholder="Add milestone (Enter to add)" className="flex-1 px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" />
                    <button onClick={() => { if (newMilestone.trim()) { setForm(f => ({ ...f, milestones: [...f.milestones, { title: newMilestone.trim() }] })); setNewMilestone(''); }}}
                      className="px-3 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 text-sm">Add</button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8">
                <NeonButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</NeonButton>
                <NeonButton size="sm" glow onClick={save}>Save Goal</NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
