'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, User, Bell, Shield, Download, Upload, Trash2,
  Sparkles, LogOut, Camera, Moon, Sun, Laptop,
  Volume2, Vibrate, Monitor, Mail, CheckSquare, Calendar,
  BarChart2, Trophy, Focus, Clock, Key, AlertTriangle,
  RefreshCw, Link2, CheckCircle2, XCircle, Plug,
} from 'lucide-react';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useAuth as useAuthForIntegrations } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { NeonInput } from '@/components/ui/NeonInput';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useSettings } from '@/hooks/useSettings';
import { ThemeConfig, ThemePreset } from '@/types';
import { cn, hexToRgba } from '@/lib/utils';
import { updateUserProfile } from '@/lib/firestore';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Image from 'next/image';

const CLOUDINARY_CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_PRESET);
  form.append('folder', 'nexus-avatars');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.secure_url as string;
}

const TABS = [
  { id: 'appearance',    label: 'Appearance',   icon: Palette },
  { id: 'profile',       label: 'Profile',      icon: User },
  { id: 'notifications', label: 'Notifications',icon: Bell },
  { id: 'security',      label: 'Security',     icon: Shield },
  { id: 'integrations',  label: 'Integrations', icon: Plug },
  { id: 'data',          label: 'Data',         icon: Download },
];

const PRESETS: { id: ThemePreset; name: string; accent: string; secondary: string }[] = [
  { id: 'cyber-blue',  name: 'Cyber Blue',  accent: '#00d4ff', secondary: '#0284c7' },
  { id: 'neon-purple', name: 'Neon Purple', accent: '#a855f7', secondary: '#ec4899' },
  { id: 'acid-green',  name: 'Acid Green',  accent: '#22c55e', secondary: '#14b8a6' },
  { id: 'crimson-red', name: 'Crimson',     accent: '#ef4444', secondary: '#f97316' },
  { id: 'gold-amber',  name: 'Gold',        accent: '#eab308', secondary: '#f97316' },
  { id: 'teal-wave',   name: 'Teal',        accent: '#14b8a6', secondary: '#0ea5e9' },
];

// ─── Appearance Tab ───────────────────────────────────────────────────────────

const AppearanceTab = () => {
  const { theme, updateTheme, applyPreset, resetTheme } = useTheme();

  const colorModeOptions = [
    { value: 'dark'  as const, label: 'Dark',   icon: Moon },
    { value: 'light' as const, label: 'Light',  icon: Sun },
    { value: 'system'as const, label: 'System', icon: Laptop },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Presets */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Theme Presets</h3>
        <p className="text-xs text-white/40 mb-3">Quick color themes</p>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <motion.button
              key={p.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => applyPreset(p.id)}
              className={cn(
                'relative p-3 rounded-xl border transition-all',
                theme.preset === p.id ? 'border-[#555555]' : 'border-[#555555] hover:border-[#555555]'
              )}
              style={{ background: hexToRgba(p.accent, 0.12) }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: p.accent }} />
                <div className="w-3 h-3 rounded-full" style={{ background: p.secondary }} />
              </div>
              <p className="text-xs font-medium text-white text-left">{p.name}</p>
              {theme.preset === p.id && (
                <div
                  className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: p.accent }}
                >
                  <div className="w-2 h-2 rounded-full bg-black" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Color Mode */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Color Mode</h3>
        <div className="flex gap-2">
          {colorModeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => updateTheme({ colorMode: value })}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                theme.colorMode === value
                  ? 'border-[#555555] bg-[#1a1a1a] text-white'
                  : 'border-[#333333] text-[#666666] hover:text-white hover:border-[#666666]'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Accent Color */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Accent Color</h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={theme.accentColor}
            onChange={(e) => updateTheme({ accentColor: e.target.value, preset: 'custom' })}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
          />
          <input
            type="text"
            value={theme.accentColor}
            onChange={(e) => updateTheme({ accentColor: e.target.value, preset: 'custom' })}
            className="flex-1 bg-[#111111] border border-[#444444] rounded-xl text-white px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Background Type */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Background Style</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['particles','grid','gradient','mesh','solid'] as ThemeConfig['backgroundType'][]).map((bg) => (
            <button
              key={bg}
              onClick={() => updateTheme({ backgroundType: bg })}
              className={cn(
                'px-3 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all',
                theme.backgroundType === bg
                  ? 'border-[#555555] bg-[#1a1a1a] text-white'
                  : 'border-[#333333] text-[#666666] hover:text-white hover:border-[#666666]'
              )}
            >
              {bg}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Fine Tuning</h3>

        <div>
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Glass Opacity</span>
            <span>{Math.round(theme.glassOpacity * 100)}%</span>
          </div>
          <input
            type="range" min="0.02" max="0.2" step="0.01"
            value={theme.glassOpacity}
            onChange={(e) => updateTheme({ glassOpacity: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Blur Intensity</span>
            <span>{theme.blurIntensity}px</span>
          </div>
          <input
            type="range" min="0" max="30" step="1"
            value={theme.blurIntensity}
            onChange={(e) => updateTheme({ blurIntensity: parseInt(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Animation Intensity</span>
            <span className="capitalize">{theme.animationIntensity}</span>
          </div>
          <div className="flex gap-2">
            {(['none','reduced','normal','high'] as ThemeConfig['animationIntensity'][]).map((v) => (
              <button
                key={v}
                onClick={() => updateTheme({ animationIntensity: v })}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-lg text-xs capitalize border transition-all',
                  theme.animationIntensity === v
                    ? 'border-[#555555] bg-[#1a1a1a] text-white'
                    : 'border-[#333333] text-white/40 hover:text-white'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Effects</h3>
        {[
          { key: 'particlesEnabled' as const, label: 'Particle Background' },
          { key: 'glowEffects' as const,     label: 'Glow Effects' },
          { key: 'scanlines' as const,        label: 'Scanlines Overlay' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-[#aaaaaa]">{label}</span>
            <button
              onClick={() => updateTheme({ [key]: !theme[key] })}
              className={cn(
                'relative w-11 h-6 rounded-full transition-all border',
                theme[key] ? 'bg-[#22c55e] border-[#22c55e]' : 'bg-[#1a1a1a] border-[#444444]'
              )}
            >
              <motion.div
                animate={{ x: theme[key] ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn('absolute top-1 w-4 h-4 rounded-full', theme[key] ? 'bg-white' : 'bg-[#666666]')}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Font */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Font Family</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['inter','orbitron','exo','jetbrains'] as ThemeConfig['fontFamily'][]).map((f) => (
            <button
              key={f}
              onClick={() => updateTheme({ fontFamily: f })}
              className={cn(
                'px-3 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all',
                theme.fontFamily === f
                  ? 'border-[#555555] bg-[#1a1a1a] text-white'
                  : 'border-[#333333] text-white/40 hover:text-white'
              )}
            >
              {f === 'jetbrains' ? 'JetBrains Mono' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <NeonButton variant="ghost" size="sm" onClick={resetTheme} icon={<Sparkles className="w-4 h-4" />}>
        Reset to Defaults
      </NeonButton>
    </div>
  );
};

// ─── Profile Tab ──────────────────────────────────────────────────────────────

const ProfileTab = () => {
  const { user, updateUserDisplayName } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await updateUserDisplayName(name);
      toast.success('Name updated!');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
      }
      await updateUserProfile(user.uid, { photoURL: url });
      toast.success('Avatar updated!');
      // Force re-render by refreshing the page slightly
      window.location.reload();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1a1a1a]">
            {user?.photoURL ? (
              <Image src={user.photoURL} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-black">
                {user?.displayName?.charAt(0) ?? '?'}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center"
          >
            <Camera className="w-3.5 h-3.5 text-black" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{user?.displayName}</p>
          <p className="text-xs text-white/40">{user?.email}</p>
          {uploading && <p className="text-xs text-[var(--accent)] mt-1">Uploading...</p>}
        </div>
      </div>

      <NeonInput
        label="Display Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />

      <NeonInput
        label="Email"
        value={user?.email ?? ''}
        disabled
        hint="Contact support to change your email"
      />

      <NeonButton onClick={handleSaveName} loading={saving} glow>
        Save Profile
      </NeonButton>
    </div>
  );
};

// ─── Notifications Tab ────────────────────────────────────────────────────────

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={cn('relative w-11 h-6 rounded-full transition-all border',
      enabled ? 'bg-[#22c55e] border-[#22c55e]' : 'bg-[#1a1a1a] border-[#444444]')}
  >
    <motion.div
      animate={{ x: enabled ? 22 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn('absolute top-1 w-4 h-4 rounded-full', enabled ? 'bg-white' : 'bg-[#666666]')}
    />
  </button>
);

const ToggleRow = ({
  icon: Icon, label, description, enabled, onChange,
}: {
  icon: React.ElementType; label: string; description?: string;
  enabled: boolean; onChange: () => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-[#222222] last:border-0">
    <div className="flex items-center gap-3 min-w-0">
      <Icon className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-white font-medium">{label}</p>
        {description && <p className="text-xs text-white/40 truncate">{description}</p>}
      </div>
    </div>
    <Toggle enabled={enabled} onChange={onChange} />
  </div>
);

const NotificationsTab = () => {
  const { settings, updateSettings } = useSettings();
  const { requestPermission } = useNotifications();
  const [requesting, setRequesting] = useState(false);
  const prefs = settings.notifications;

  const toggle = (key: keyof typeof prefs) => {
    updateSettings({ notifications: { ...prefs, [key]: !prefs[key] } });
  };

  const handleEnablePush = async () => {
    setRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        await updateSettings({ notifications: { ...prefs, desktop: true } });
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Permission denied. Enable notifications in your browser settings.');
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Push permission banner */}
      {typeof window !== 'undefined' && Notification.permission !== 'granted' && (
        <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#444444] flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Enable Push Notifications</p>
            <p className="text-xs text-white/40 mt-0.5">Get alerts even when NEXUS is in the background</p>
          </div>
          <NeonButton size="sm" glow loading={requesting} onClick={handleEnablePush}>
            Enable
          </NeonButton>
        </div>
      )}

      {/* General */}
      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">General</h3>
        <div className="rounded-md bg-[#111111] border border-[#333333] px-4">
          <ToggleRow icon={Bell}        label="All Notifications"    description="Master switch for all alerts"         enabled={prefs.enabled}           onChange={() => toggle('enabled')} />
          <ToggleRow icon={Volume2}     label="Sound"               description="Play audio on notifications"          enabled={prefs.sound}             onChange={() => toggle('sound')} />
          <ToggleRow icon={Vibrate}     label="Vibration"           description="Haptic feedback on mobile"            enabled={prefs.vibration}         onChange={() => toggle('vibration')} />
          <ToggleRow icon={Monitor}     label="Desktop Alerts"      description="Browser push notifications"           enabled={prefs.desktop}           onChange={() => toggle('desktop')} />
          <ToggleRow icon={Mail}        label="Email Notifications" description="Receive updates via email"            enabled={prefs.email}             onChange={() => toggle('email')} />
        </div>
      </div>

      {/* Activity */}
      <div>
        <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-1">Activity</h3>
        <div className="rounded-md bg-[#111111] border border-[#333333] px-4">
          <ToggleRow icon={CheckSquare} label="Todo Reminders"      description="Alerts for upcoming tasks"            enabled={prefs.todoReminders}     onChange={() => toggle('todoReminders')} />
          <ToggleRow icon={Calendar}    label="Event Reminders"     description="Alerts for calendar events"           enabled={prefs.eventReminders}    onChange={() => toggle('eventReminders')} />
          <ToggleRow icon={BarChart2}   label="Daily Summary"       description="Morning overview of your day"        enabled={prefs.dailySummary}      onChange={() => toggle('dailySummary')} />
          <ToggleRow icon={Trophy}      label="Achievements"        description="Celebrate your milestones"            enabled={prefs.achievementAlerts} onChange={() => toggle('achievementAlerts')} />
          <ToggleRow icon={Focus}       label="Focus Mode"          description="Suppress alerts during Pomodoro"      enabled={prefs.focusMode}         onChange={() => toggle('focusMode')} />
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-1">Quiet Hours</h3>
        <div className="rounded-md bg-[#111111] border border-[#333333] px-4">
          <ToggleRow icon={Clock} label="Quiet Hours" description="Silence all notifications during set times" enabled={prefs.quietHoursEnabled} onChange={() => toggle('quietHoursEnabled')} />
        </div>
        <AnimatePresence>
          {prefs.quietHoursEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 mt-3">
                <div className="flex-1">
                  <label className="text-xs text-white/50 block mb-1">From</label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => updateSettings({ notifications: { ...prefs, quietHoursStart: e.target.value } })}
                    className="w-full bg-black border border-[#444444] rounded text-white px-3 py-2 text-sm focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#888888] block mb-1">Until</label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => updateSettings({ notifications: { ...prefs, quietHoursEnd: e.target.value } })}
                    className="w-full bg-black border border-[#444444] rounded text-white px-3 py-2 text-sm focus:outline-none focus:border-white"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Security Tab ─────────────────────────────────────────────────────────────

const SecurityTab = () => {
  const { user, updateUserPassword, updateUserEmail, logout } = useAuth();
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [newEmail, setNewEmail]                 = useState('');
  const [savingPw, setSavingPw]                 = useState(false);
  const [savingEmail, setSavingEmail]           = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);

  const isGoogleUser = user?.providerData.some((p) => p.providerId === 'google.com');

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      await updateUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('requires-recent-login')) {
        toast.error('Please sign out and back in, then try again.');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setSavingPw(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    setSavingEmail(true);
    try {
      await updateUserEmail(newEmail);
      setNewEmail('');
      toast.success('Email updated!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('requires-recent-login')) {
        toast.error('Please sign out and back in, then try again.');
      } else {
        toast.error('Failed to update email');
      }
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#333333] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#444444] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{user?.email}</p>
          <p className="text-xs text-white/40">
            {isGoogleUser ? 'Signed in with Google' : 'Email & Password account'}
          </p>
        </div>
      </div>

      {/* Change Password */}
      {!isGoogleUser && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-[var(--accent)]" /> Change Password
          </h3>
          <NeonInput
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            hint={newPassword.length > 0 && newPassword.length < 8 ? 'Too short' : undefined}
          />
          <NeonInput
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
          />
          <NeonButton
            onClick={handlePasswordChange}
            loading={savingPw}
            disabled={!newPassword || !confirmPassword}
            glow
          >
            Update Password
          </NeonButton>
        </div>
      )}

      {/* Change Email */}
      {!isGoogleUser && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-[var(--accent)]" /> Change Email
          </h3>
          <NeonInput
            label="New Email Address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="your@email.com"
          />
          <NeonButton
            variant="secondary"
            onClick={handleEmailChange}
            loading={savingEmail}
            disabled={!newEmail}
          >
            Update Email
          </NeonButton>
        </div>
      )}

      {isGoogleUser && (
        <div className="p-4 rounded-xl bg-[#111111] border border-[#333333]">
          <p className="text-sm text-white/60">
            Password and email are managed by Google. Visit your Google account settings to make changes.
          </p>
        </div>
      )}

      {/* Sign out */}
      <div className="pt-2 border-t border-[#333333] space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <LogOut className="w-4 h-4 text-white/40" /> Session
        </h3>
        {!showConfirm ? (
          <NeonButton variant="ghost" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={() => setShowConfirm(true)}>
            Sign Out
          </NeonButton>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/8 border border-red-500/20 space-y-3"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/70">You will be signed out of all active sessions.</p>
            </div>
            <div className="flex gap-2">
              <NeonButton variant="danger" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={logout}>
                Confirm Sign Out
              </NeonButton>
              <NeonButton variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </NeonButton>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Data Tab ─────────────────────────────────────────────────────────────────

const DataTab = () => {
  const { settings, exportSettings, importSettings } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = await importSettings(text);
    if (ok) toast.success('Settings imported!');
    else toast.error('Invalid settings file');
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#111111] border border-[#333333] space-y-1">
        <p className="text-sm font-medium text-white">Export Settings</p>
        <p className="text-xs text-white/40">Download your theme and preferences as JSON</p>
        <NeonButton
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={exportSettings}
          className="mt-2"
        >
          Export JSON
        </NeonButton>
      </div>

      <div className="p-4 rounded-xl bg-[#111111] border border-[#333333] space-y-1">
        <p className="text-sm font-medium text-white">Import Settings</p>
        <p className="text-xs text-white/40">Restore settings from a backup file</p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <NeonButton
          variant="secondary"
          size="sm"
          icon={<Upload className="w-4 h-4" />}
          onClick={() => fileRef.current?.click()}
          className="mt-2"
        >
          Import JSON
        </NeonButton>
      </div>

      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
        <p className="text-sm font-medium text-red-400">Danger Zone</p>
        <p className="text-xs text-white/40">Irreversible actions</p>
        <NeonButton
          variant="danger"
          size="sm"
          icon={<Trash2 className="w-4 h-4" />}
          className="mt-2"
          onClick={() => toast.error('Please contact support to delete your account.')}
        >
          Delete Account
        </NeonButton>
      </div>
    </div>
  );
};

// ─── Integrations Tab ────────────────────────────────────────────────────────

const IntegrationsTab = () => {
  const { user } = useAuthForIntegrations();
  const { connected, syncing, lastSync, importCount, login, disconnect, syncImport } =
    useGoogleCalendarSync(user?.uid ?? '');
  const { theme } = useTheme();

  const hasClientId = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const [syncWeeks, setSyncWeeks] = useState(4);
  const [syncError, setSyncError] = useState('');

  const handleConnect = () => {
    setSyncError('');
    try { login(); } catch { setSyncError('Login failed. Check your Google Client ID setup.'); }
  };

  const handleSync = async () => {
    setSyncError('');
    try {
      const count = await syncImport(syncWeeks);
      toast.success(`Imported ${count} event${count !== 1 ? 's' : ''} from Google Calendar`);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
      toast.error('Google Calendar sync failed');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Google Calendar</h3>
        <p className="text-xs text-white/40">Import your Google Calendar events into NEXUS and keep both in sync.</p>
      </div>

      {!hasClientId && (
        <div className="p-4 rounded-xl border border-yellow-500/25 bg-yellow-500/8 space-y-3">
          <p className="text-sm font-medium text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Setup required
          </p>
          <p className="text-xs text-white/50 leading-relaxed">
            To enable Google Calendar sync, add your Google OAuth client ID to <code className="text-white/70 bg-[#1a1a1a] px-1.5 py-0.5 rounded">.env.local</code>:
          </p>
          <ol className="text-xs text-white/50 space-y-1.5 list-decimal ml-4">
            <li>Open <span className="text-white/70">console.cloud.google.com</span> → select project <span className="text-white/70">nexus-future</span></li>
            <li>Enable the <span className="text-white/70">Google Calendar API</span></li>
            <li>Go to <span className="text-white/70">APIs & Services → Credentials</span></li>
            <li>Create an OAuth 2.0 Web Client ID</li>
            <li>Add <span className="text-white/70">https://nexus-future.web.app</span> and <span className="text-white/70">http://localhost:3000</span> as Authorized JavaScript Origins</li>
            <li>Copy the Client ID and add to <code className="text-white/70 bg-[#1a1a1a] px-1.5 py-0.5 rounded">.env.local</code>:<br />
              <code className="text-[#00d4ff] text-[10px]">NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</code>
            </li>
            <li>Rebuild & deploy: <code className="text-white/70 bg-[#1a1a1a] px-1.5 py-0.5 rounded">npm run build && firebase deploy</code></li>
          </ol>
        </div>
      )}

      {/* Connection card */}
      <div className="p-4 rounded-2xl border border-[#333333] bg-[#111111] space-y-4">
        <div className="flex items-center gap-3">
          {/* Google calendar icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 75%, #ea4335 100%)', fontSize: 20 }}>
            📅
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Google Calendar</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {connected ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-green-400">Connected</span></>
              ) : (
                <><XCircle className="w-3.5 h-3.5 text-white/30" /><span className="text-xs text-white/40">Not connected</span></>
              )}
            </div>
          </div>
          {connected ? (
            <button onClick={disconnect}
              className="text-xs text-white/30 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
              Disconnect
            </button>
          ) : (
            <NeonButton size="sm" glow={hasClientId} disabled={!hasClientId}
              icon={<Link2 className="w-3.5 h-3.5" />} onClick={handleConnect}>
              Connect
            </NeonButton>
          )}
        </div>

        {connected && (
          <>
            {lastSync && (
              <p className="text-xs text-white/30">
                Last synced: {lastSync.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {importCount > 0 && ` · ${importCount} events imported`}
              </p>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-1">Import range</p>
                <select value={syncWeeks} onChange={e => setSyncWeeks(Number(e.target.value))}
                  className="w-full bg-[#111111] border border-[#444444] rounded-xl text-white text-sm px-3 py-2 focus:outline-none">
                  <option value={1}>Next 1 week</option>
                  <option value={2}>Next 2 weeks</option>
                  <option value={4}>Next 4 weeks</option>
                  <option value={8}>Next 8 weeks</option>
                  <option value={12}>Next 3 months</option>
                </select>
              </div>
              <div className="flex-1 pt-5">
                <NeonButton size="sm" glow loading={syncing} onClick={handleSync}
                  icon={<RefreshCw className="w-3.5 h-3.5" />} className="w-full">
                  {syncing ? 'Syncing…' : 'Sync now'}
                </NeonButton>
              </div>
            </div>

            {syncError && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{syncError}</p>
            )}
          </>
        )}
      </div>

      {/* Info note */}
      <div className="p-3 rounded-xl bg-[#111111] border border-[#222222]">
        <p className="text-xs text-white/30 leading-relaxed">
          Sync imports events from your primary Google Calendar into NEXUS. Imported events are tagged with category <span className="text-white/50">"google-calendar"</span> so you can identify them. Re-syncing does not remove previous imports.
        </p>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance');

  return (
    <DashboardLayout title="Settings" subtitle="Customize your NEXUS experience">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Tabs sidebar */}
          <div className="lg:w-48 flex-shrink-0">
            <GlassCard padding="sm">
              <nav className="space-y-0.5">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      activeTab === id
                        ? 'bg-[#1a1a1a] text-white border border-white'
                        : 'text-white/40 hover:text-white hover:bg-[#111111]'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </nav>
            </GlassCard>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <GlassCard padding="lg">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'appearance'    && <AppearanceTab />}
                  {activeTab === 'profile'        && <ProfileTab />}
                  {activeTab === 'notifications'  && <NotificationsTab />}
                  {activeTab === 'security'       && <SecurityTab />}
                  {activeTab === 'integrations'   && <IntegrationsTab />}
                  {activeTab === 'data'           && <DataTab />}
                </motion.div>
              </AnimatePresence>
            </GlassCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
