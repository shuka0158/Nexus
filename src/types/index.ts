import { Timestamp } from 'firebase/firestore';

// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio?: string;
  timezone: string;
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeen: Timestamp;
}

export interface UserSettings {
  theme: ThemeConfig;
  notifications: NotificationPreferences;
  calendar: CalendarPreferences;
  todos: TodoPreferences;
  pomodoro: PomodoroSettings;
  accessibility: AccessibilitySettings;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export type ThemePreset =
  | 'cyber-blue'
  | 'neon-purple'
  | 'acid-green'
  | 'crimson-red'
  | 'gold-amber'
  | 'teal-wave'
  | 'rose-pink'
  | 'solar-orange'
  | 'white-minimal'
  | 'midnight-blue'
  | 'custom';

export type ColorMode = 'dark' | 'light' | 'system';

export interface ThemeConfig {
  preset: ThemePreset;
  colorMode: ColorMode;
  accentColor: string;
  secondaryColor: string;
  backgroundType: 'gradient' | 'particles' | 'grid' | 'solid' | 'mesh';
  wallpaper: string | null;
  glassOpacity: number;
  blurIntensity: number;
  animationIntensity: 'none' | 'reduced' | 'normal' | 'high';
  fontFamily: 'inter' | 'orbitron' | 'exo' | 'jetbrains';
  fontSize: 'sm' | 'md' | 'lg';
  uiDensity: 'compact' | 'comfortable' | 'spacious';
  sidebarCollapsed: boolean;
  particlesEnabled: boolean;
  glowEffects: boolean;
  scanlines: boolean;
}

export const DEFAULT_THEME: ThemeConfig = {
  preset: 'midnight-blue',
  colorMode: 'dark',
  accentColor: '#58a6ff',
  secondaryColor: '#3fb950',
  backgroundType: 'solid',
  wallpaper: null,
  glassOpacity: 0,
  blurIntensity: 0,
  animationIntensity: 'reduced',
  fontFamily: 'inter',
  fontSize: 'md',
  uiDensity: 'comfortable',
  sidebarCollapsed: false,
  particlesEnabled: false,
  glowEffects: false,
  scanlines: false,
};

// ─── Todos ───────────────────────────────────────────────────────────────────

export type TodoStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TodoPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Timestamp;
}

export interface Todo {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  labels: string[];
  dueDate: Timestamp | null;
  reminderAt: Timestamp | null;
  subtasks: SubTask[];
  attachments: string[];
  recurring: RecurringConfig | null;
  order: number;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: Timestamp;
}

export interface TodoPreferences {
  defaultView: 'list' | 'kanban' | 'timeline';
  defaultPriority: TodoPriority;
  showCompletedTasks: boolean;
  sortBy: 'priority' | 'dueDate' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export type CalendarView = 'day' | 'week' | 'month' | 'year' | 'agenda';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  allDay: boolean;
  color: string;
  category: string;
  location?: string;
  recurring: RecurringConfig | null;
  reminderMinutes: number[];
  attendees: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CalendarPreferences {
  defaultView: CalendarView;
  weekStartsOn: 0 | 1 | 6;
  timezone: string;
  showWeekNumbers: boolean;
  showDeclinedEvents: boolean;
  defaultEventDuration: number;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'todo_reminder'
  | 'event_reminder'
  | 'system'
  | 'achievement'
  | 'update'
  | 'focus';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  actionUrl?: string;
  imageUrl?: string;
  data?: Record<string, string>;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  desktop: boolean;
  email: boolean;
  todoReminders: boolean;
  eventReminders: boolean;
  dailySummary: boolean;
  achievementAlerts: boolean;
  focusMode: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

// ─── Pomodoro & Focus ────────────────────────────────────────────────────────

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  notifyOnComplete: boolean;
}

export interface PomodoroSession {
  id: string;
  userId: string;
  type: 'work' | 'short_break' | 'long_break';
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  cancelled: boolean;
  linkedTodoId?: string;
}

// ─── Accessibility ───────────────────────────────────────────────────────────

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: 'todo' | 'event' | 'settings' | 'auth';
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface ProductivityStats {
  todosCompleted: number;
  todosCreated: number;
  eventsAttended: number;
  pomodoroSessionsCompleted: number;
  focusMinutes: number;
  streakDays: number;
  completionRate: number;
  topLabels: { label: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface ModalState {
  isOpen: boolean;
  type: 'todo' | 'event' | 'reminder' | 'confirm' | null;
  data?: unknown;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  icon?: string;
  category: string;
  action: () => void;
  keywords?: string[];
}

// ─── Notes / Journal ─────────────────────────────────────────────────────────

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  pinned: boolean;
  color: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Habits ──────────────────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekly';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description: string;
  color: string;
  emoji: string;
  frequency: HabitFrequency;
  targetDays: number[];   // 0=Sun … 6=Sat (weekly) or [] = every day
  completedDates: string[]; // ISO date strings 'YYYY-MM-DD'
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt: Timestamp | null;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt: Timestamp | null;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'health' | 'work' | 'learning' | 'finance' | 'personal' | 'other';
  color: string;
  emoji: string;
  progress: number;        // 0-100
  targetDate: Timestamp | null;
  milestones: GoalMilestone[];
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Shared Calendars ────────────────────────────────────────────────────────

export interface SharedCalendar {
  id: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  inviteeEmail: string;
  inviteeId: string | null;
  status: 'pending' | 'accepted' | 'declined';
  permission: 'view' | 'edit';
  createdAt: Timestamp;
}

// ─── Public Event Link ───────────────────────────────────────────────────────

export interface PublicEvent {
  id: string;            // doc id (also the slug)
  eventId: string;
  ownerId: string;
  slug: string;
  // Snapshot fields — copied at creation time so viewers don't need to read events/
  title: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  allDay: boolean;
  color: string;
  location: string;
  category: string;
  expiresAt: Timestamp | null;
  createdAt: Timestamp;
}

// ─── Daily Check-in (morning/evening journal) ───────────────────────────────

export interface DailyCheckinAnswers {
  oneThing?: string;
  feeling?: string;
  blocker?: string;       // morning
  accomplished?: string;
  unplanned?: string;
  closingFeeling?: string;  // evening
}

export interface DailyCheckin {
  id: string;
  userId: string;
  date: string;            // YYYY-MM-DD (local)
  morning: { completedAt: Timestamp | null; answers: DailyCheckinAnswers };
  evening: { completedAt: Timestamp | null; answers: DailyCheckinAnswers };
  journalEntry: string | null;   // AI-written summary, populated after evening
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
