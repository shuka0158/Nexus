'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Check, X, Clock, Eye, Edit3, Trash2, Mail, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { subscribeToSharedCalendars, createSharedCalendar, updateSharedCalendar, deleteSharedCalendar } from '@/lib/firestore';
import { SharedCalendar } from '@/types';
import toast from 'react-hot-toast';

export default function SharedCalendarPage() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [shares, setShares] = useState<SharedCalendar[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    return subscribeToSharedCalendars(user.uid, user.email, setShares);
  }, [user]);

  const sentShares = shares.filter(s => s.ownerId === user?.uid);
  const receivedShares = shares.filter(s => s.inviteeEmail === user?.email && s.ownerId !== user?.uid);

  const sendInvite = async () => {
    if (!user || !email.trim()) return;
    if (!email.includes('@')) { toast.error('Enter a valid email'); return; }
    if (email.trim() === user.email) { toast.error("You can't share with yourself"); return; }
    setLoading(true);
    try {
      await createSharedCalendar({
        ownerId: user.uid,
        ownerEmail: user.email ?? '',
        ownerName: user.displayName ?? 'User',
        inviteeEmail: email.trim().toLowerCase(),
        inviteeId: null,
        status: 'pending',
        permission,
      });
      toast.success(`Invite sent to ${email.trim()}`);
      setEmail('');
      setShowForm(false);
    } catch { toast.error('Failed to send invite'); }
    finally { setLoading(false); }
  };

  const respond = async (id: string, accepted: boolean) => {
    await updateSharedCalendar(id, {
      status: accepted ? 'accepted' : 'declined',
      inviteeId: accepted ? user?.uid : null,
    });
    toast.success(accepted ? 'Calendar access accepted' : 'Invite declined');
  };

  const revoke = async (id: string) => {
    await deleteSharedCalendar(id);
    toast.success('Share removed');
  };

  const statusBadge = (status: SharedCalendar['status']) => {
    const map = {
      pending:  { label: 'Pending',  color: '#eab308' },
      accepted: { label: 'Active',   color: '#22c55e' },
      declined: { label: 'Declined', color: '#ef4444' },
    };
    const { label, color } = map[status];
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
        style={{ background: `${color}20`, color }}>
        {label}
      </span>
    );
  };

  return (
    <DashboardLayout title="Shared Calendars" subtitle="Collaborate with others">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/40">Invite people to view or edit your calendar</p>
          <NeonButton onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />} glow size="sm">
            Share Calendar
          </NeonButton>
        </div>

        {/* Received invites */}
        {receivedShares.length > 0 && (
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Received invites</p>
            <div className="space-y-2">
              {receivedShares.map(s => (
                <GlassCard key={s.id} padding="md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${theme.accentColor}15` }}>
                      <Share2 className="w-4 h-4" style={{ color: theme.accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{s.ownerName}</p>
                      <p className="text-xs text-white/40">{s.ownerEmail} · {s.permission === 'edit' ? 'Can edit' : 'View only'}</p>
                    </div>
                    {s.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => respond(s.id, true)}
                          className="p-2 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => respond(s.id, false)}
                          className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : statusBadge(s.status)}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Sent shares */}
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">My shares</p>
          {sentShares.length === 0 ? (
            <GlassCard padding="lg" className="text-center py-12">
              <Users className="w-10 h-10 mx-auto mb-3 text-white/15" />
              <p className="text-white/30 text-sm">No one has access yet</p>
              <p className="text-white/20 text-xs mt-1">Click "Share Calendar" to invite someone</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {sentShares.map(s => (
                <GlassCard key={s.id} padding="md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${theme.secondaryColor}15` }}>
                      <Mail className="w-4 h-4" style={{ color: theme.secondaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{s.inviteeEmail}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.permission === 'edit'
                          ? <span className="flex items-center gap-1 text-xs text-white/40"><Edit3 className="w-3 h-3" /> Can edit</span>
                          : <span className="flex items-center gap-1 text-xs text-white/40"><Eye className="w-3 h-3" /> View only</span>
                        }
                      </div>
                    </div>
                    {statusBadge(s.status)}
                    <button onClick={() => revoke(s.id)}
                      className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* Note about functionality */}
        <GlassCard padding="md" className="border border-white/5">
          <p className="text-xs text-white/30 leading-relaxed">
            <span className="text-white/50 font-medium">Note:</span> Shared calendar access is stored in Firestore. Invitees will see this invite when they log into NEXUS with the same email address.
          </p>
        </GlassCard>
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: isDark ? 'rgba(10,10,25,0.98)' : 'rgba(248,250,252,0.98)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <p className="font-semibold text-white">Share Your Calendar</p>
                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Invitee email</p>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="friend@example.com"
                    type="email"
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Permission</p>
                  <div className="flex gap-2">
                    {(['view', 'edit'] as const).map(p => (
                      <button key={p} onClick={() => setPermission(p)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all border"
                        style={{
                          background: permission === p ? `${theme.accentColor}20` : 'transparent',
                          borderColor: permission === p ? `${theme.accentColor}40` : 'rgba(255,255,255,0.08)',
                          color: permission === p ? theme.accentColor : 'rgba(255,255,255,0.4)',
                        }}>
                        {p === 'view' ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        {p === 'view' ? 'View only' : 'Can edit'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-5 py-3 border-t border-white/8">
                <NeonButton variant="ghost" size="sm" onClick={() => setShowForm(false)} className="flex-1">Cancel</NeonButton>
                <NeonButton size="sm" glow loading={loading} onClick={sendInvite} className="flex-1"
                  icon={<Share2 className="w-3.5 h-3.5" />}>
                  Send Invite
                </NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
