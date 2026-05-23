'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pin, Trash2, Edit3, Tag, X, Check, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { subscribeToNotes, createNote, updateNote, deleteNote } from '@/lib/firestore';
import { Note } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const NOTE_COLORS = ['#00d4ff','#a855f7','#22c55e','#f97316','#f43f5e','#eab308','#06b6d4','#8b5cf6'];

function timeAgo(ts: { toDate: () => Date } | undefined) {
  if (!ts) return '';
  const d = ts.toDate();
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotesPage() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ title: '', content: '', color: NOTE_COLORS[0], tags: '' });

  useEffect(() => {
    if (!user) return;
    return subscribeToNotes(user.uid, setNotes);
  }, [user]);

  const openCreate = () => {
    setForm({ title: '', content: '', color: NOTE_COLORS[0], tags: '' });
    setEditing(null);
    setCreating(true);
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  const openEdit = (note: Note) => {
    setForm({ title: note.title, content: note.content, color: note.color, tags: note.tags.join(', ') });
    setEditing(note);
    setCreating(true);
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  const save = async () => {
    if (!user || !form.title.trim()) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (editing) {
        await updateNote(editing.id, { title: form.title, content: form.content, color: form.color, tags });
        toast.success('Note updated');
      } else {
        await createNote({ userId: user.uid, title: form.title, content: form.content, color: form.color, tags, pinned: false });
        toast.success('Note saved');
      }
      setCreating(false);
      setEditing(null);
    } catch { toast.error('Failed to save note'); }
  };

  const togglePin = async (note: Note) => {
    await updateNote(note.id, { pinned: !note.pinned });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id);
      toast.success('Note deleted');
    } catch { toast.error('Failed to delete'); }
    setDeleteId(null);
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  return (
    <DashboardLayout title="Notes" subtitle="Your personal journal">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <NeonButton onClick={openCreate} icon={<Plus className="w-4 h-4" />} glow>New Note</NeonButton>
      </div>

      {/* Note editor modal */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: isDark ? 'rgba(10,10,25,0.98)' : 'rgba(248,250,252,0.98)' }}
            >
              <div className="p-5 space-y-4">
                <input
                  ref={titleRef}
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Note title…"
                  className="w-full text-lg font-semibold bg-transparent text-white border-b border-white/10 pb-2 focus:outline-none focus:border-[var(--accent)] placeholder-white/30"
                />
                <textarea
                  value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write something…"
                  rows={8}
                  className="w-full bg-transparent text-sm text-white/80 resize-none focus:outline-none placeholder-white/30 leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-white/40" />
                  <input
                    value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="Tags (comma separated)"
                    className="flex-1 bg-transparent text-xs text-white/60 focus:outline-none placeholder-white/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {NOTE_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: form.color === c ? `2px solid white` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8">
                <NeonButton variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</NeonButton>
                <NeonButton size="sm" glow onClick={save} icon={<Check className="w-3.5 h-3.5" />}>Save</NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No notes yet. Start writing!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5"><Pin className="w-3 h-3" /> Pinned</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinned.map(note => <NoteCard key={note.id} note={note} onEdit={openEdit} onPin={togglePin} onDelete={setDeleteId} accentColor={theme.accentColor} />)}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-3">Other</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinned.map(note => <NoteCard key={note.id} note={note} onEdit={openEdit} onPin={togglePin} onDelete={setDeleteId} accentColor={theme.accentColor} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-80 text-center space-y-4"
              style={{ background: 'rgba(10,10,25,0.98)' }}
            >
              <p className="text-white font-semibold">Delete this note?</p>
              <p className="text-white/40 text-sm">This can&apos;t be undone.</p>
              <div className="flex gap-3">
                <NeonButton variant="ghost" fullWidth onClick={() => setDeleteId(null)}>Cancel</NeonButton>
                <NeonButton variant="danger" fullWidth onClick={() => handleDelete(deleteId!)}>Delete</NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function NoteCard({ note, onEdit, onPin, onDelete, accentColor }: {
  note: Note;
  onEdit: (n: Note) => void;
  onPin: (n: Note) => void;
  onDelete: (id: string) => void;
  accentColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl border border-white/8 p-4 cursor-pointer hover:border-white/20 transition-all"
      style={{ background: `linear-gradient(135deg, ${note.color}12, ${note.color}06)`, borderLeft: `3px solid ${note.color}` }}
      onClick={() => onEdit(note)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-white leading-tight line-clamp-1">{note.title}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onPin(note); }}
            className={cn('p-1 rounded-lg hover:bg-white/10 transition-colors', note.pinned && 'text-yellow-400')}>
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(note.id); }}
            className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {note.content && <p className="text-xs text-white/50 line-clamp-3 leading-relaxed mb-2">{note.content}</p>}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${note.color}25`, color: note.color }}>#{tag}</span>
          ))}
        </div>
      )}
      <p className="text-[10px] text-white/25">{timeAgo(note.updatedAt as { toDate: () => Date } | undefined)}</p>
    </motion.div>
  );
}
