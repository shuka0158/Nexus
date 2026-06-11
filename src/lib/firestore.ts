import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  addDoc,
  writeBatch,
  QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, UserSettings, Todo, CalendarEvent, AppNotification, ActivityLog, Note, Habit, Goal, SharedCalendar, PublicEvent, DailyCheckin, DailyCheckinAnswers } from '@/types';

// ─── User ─────────────────────────────────────────────────────────────────────

export const createUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  }, { merge: true });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } as unknown as UserProfile : null;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const subscribeToUserProfile = (uid: string, cb: (profile: UserProfile | null) => void) =>
  onSnapshot(doc(db, 'users', uid), (snap) =>
    cb(snap.exists() ? { id: snap.id, ...snap.data() } as unknown as UserProfile : null)
  );

// ─── Settings ────────────────────────────────────────────────────────────────

export const getUserSettings = async (uid: string): Promise<UserSettings | null> => {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
  return snap.exists() ? snap.data() as UserSettings : null;
};

export const saveUserSettings = async (uid: string, settings: Partial<UserSettings>) => {
  await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
    ...settings,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToUserSettings = (uid: string, cb: (settings: UserSettings | null) => void) =>
  onSnapshot(doc(db, 'users', uid, 'settings', 'preferences'), (snap) =>
    cb(snap.exists() ? snap.data() as UserSettings : null)
  );

// ─── Todos ───────────────────────────────────────────────────────────────────

export const createTodo = async (data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, 'todos'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateTodo = async (id: string, data: Partial<Todo>) => {
  await updateDoc(doc(db, 'todos', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteTodo = async (id: string) => {
  await deleteDoc(doc(db, 'todos', id));
};

export const subscribeToTodos = (uid: string, cb: (todos: Todo[]) => void) => {
  const q = query(
    collection(db, 'todos'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Todo))
  );
};

export const batchUpdateTodoOrder = async (updates: { id: string; order: number }[]) => {
  const batch = writeBatch(db);
  updates.forEach(({ id, order }) => {
    batch.update(doc(db, 'todos', id), { order, updatedAt: serverTimestamp() });
  });
  await batch.commit();
};

// ─── Events ──────────────────────────────────────────────────────────────────

export const createEvent = async (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, 'events'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateEvent = async (id: string, data: Partial<CalendarEvent>) => {
  await updateDoc(doc(db, 'events', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteEvent = async (id: string) => {
  await deleteDoc(doc(db, 'events', id));
};

export const subscribeToEvents = (
  uid: string,
  startDate: Date,
  endDate: Date,
  cb: (events: CalendarEvent[]) => void
) => {
  const q = query(
    collection(db, 'events'),
    where('userId', '==', uid),
    where('startDate', '>=', Timestamp.fromDate(startDate)),
    where('startDate', '<=', Timestamp.fromDate(endDate)),
    orderBy('startDate', 'asc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent))
  );
};

export const getTodos = async (uid: string): Promise<Todo[]> => {
  const q = query(collection(db, 'todos'), where('userId', '==', uid), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Todo);
};

export const getNotes = async (uid: string): Promise<Note[]> => {
  const q = query(collection(db, 'notes'), where('userId', '==', uid), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Note);
};

export const getHabits = async (uid: string): Promise<Habit[]> => {
  const q = query(collection(db, 'habits'), where('userId', '==', uid), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Habit);
};

export const getGoals = async (uid: string): Promise<Goal[]> => {
  const q = query(collection(db, 'goals'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Goal);
};

export const getEvents = async (uid: string): Promise<CalendarEvent[]> => {
  const q = query(
    collection(db, 'events'),
    where('userId', '==', uid),
    orderBy('startDate', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent);
};

export const subscribeToAllEvents = (uid: string, cb: (events: CalendarEvent[]) => void) => {
  const q = query(
    collection(db, 'events'),
    where('userId', '==', uid),
    orderBy('startDate', 'asc')
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent))
  );
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const subscribeToNotifications = (uid: string, cb: (notifications: AppNotification[]) => void) => {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification))
  );
};

export const markNotificationRead = async (uid: string, notifId: string) => {
  await updateDoc(doc(db, 'users', uid, 'notifications', notifId), {
    read: true,
    readAt: serverTimestamp(),
  });
};

export const markAllNotificationsRead = async (uid: string) => {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { read: true, readAt: serverTimestamp() });
  });
  await batch.commit();
};

export const addNotification = async (uid: string, data: Omit<AppNotification, 'id' | 'createdAt'>) => {
  await addDoc(collection(db, 'users', uid, 'notifications'), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// ─── FCM Tokens ──────────────────────────────────────────────────────────────

export const saveFCMToken = async (uid: string, token: string) => {
  await setDoc(doc(db, 'users', uid, 'tokens', token), {
    token,
    createdAt: serverTimestamp(),
    platform: typeof window !== 'undefined' ? navigator.platform : 'unknown',
  });
};

// ─── Activity Logs ───────────────────────────────────────────────────────────

export const logActivity = async (uid: string, data: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => {
  await addDoc(collection(db, 'activityLogs'), {
    ...data,
    userId: uid,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToActivityLogs = (uid: string, cb: (logs: ActivityLog[]) => void) => {
  const q = query(
    collection(db, 'activityLogs'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityLog))
  );
};

// ─── Notes ───────────────────────────────────────────────────────────────────

export const createNote = async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, 'notes'), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateNote = async (id: string, data: Partial<Note>) => {
  await updateDoc(doc(db, 'notes', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteNote = async (id: string) => {
  await deleteDoc(doc(db, 'notes', id));
};

export const subscribeToNotes = (uid: string, cb: (notes: Note[]) => void) => {
  const q = query(collection(db, 'notes'), where('userId', '==', uid), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Note)));
};

// ─── Habits ──────────────────────────────────────────────────────────────────

export const createHabit = async (data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, 'habits'), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateHabit = async (id: string, data: Partial<Habit>) => {
  await updateDoc(doc(db, 'habits', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteHabit = async (id: string) => {
  await deleteDoc(doc(db, 'habits', id));
};

export const subscribeToHabits = (uid: string, cb: (habits: Habit[]) => void) => {
  const q = query(collection(db, 'habits'), where('userId', '==', uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Habit)));
};

// ─── Goals ───────────────────────────────────────────────────────────────────

export const createGoal = async (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, 'goals'), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateGoal = async (id: string, data: Partial<Goal>) => {
  await updateDoc(doc(db, 'goals', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteGoal = async (id: string) => {
  await deleteDoc(doc(db, 'goals', id));
};

export const subscribeToGoals = (uid: string, cb: (goals: Goal[]) => void) => {
  const q = query(collection(db, 'goals'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Goal)));
};

// ─── Shared Calendars ────────────────────────────────────────────────────────

export const createSharedCalendar = async (data: Omit<SharedCalendar, 'id' | 'createdAt'>) => {
  const ref = await addDoc(collection(db, 'sharedCalendars'), {
    ...data, createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateSharedCalendar = async (id: string, data: Partial<SharedCalendar>) => {
  await updateDoc(doc(db, 'sharedCalendars', id), data);
};

export const deleteSharedCalendar = async (id: string) => {
  await deleteDoc(doc(db, 'sharedCalendars', id));
};

export const subscribeToSharedCalendars = (uid: string, email: string, cb: (shares: SharedCalendar[]) => void) => {
  const q = query(collection(db, 'sharedCalendars'), where('ownerId', '==', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SharedCalendar)));
};

// ─── Public Events ───────────────────────────────────────────────────────────

// Short URL-safe random slug used as both the doc ID and the public path.
const makeSlug = (len = 10): string => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'; // no 0/1/l/o for legibility
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
};

// Create a public-readable snapshot of an event. Returns the slug.
export const createPublicEvent = async (event: CalendarEvent, ownerId: string, expiresAt: Timestamp | null = null): Promise<string> => {
  const slug = makeSlug(10);
  await setDoc(doc(db, 'publicEvents', slug), {
    eventId: event.id,
    ownerId,
    slug,
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    allDay: event.allDay,
    color: event.color,
    location: event.location,
    category: event.category,
    expiresAt,
    createdAt: serverTimestamp(),
  });
  return slug;
};

export const getPublicEventBySlug = async (slug: string): Promise<PublicEvent | null> => {
  const snap = await getDoc(doc(db, 'publicEvents', slug));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PublicEvent;
};

export const deletePublicEvent = async (slug: string) => {
  await deleteDoc(doc(db, 'publicEvents', slug));
};

// List all share links for an event so the user can revoke or copy them
export const getPublicEventsForEvent = async (eventId: string): Promise<PublicEvent[]> => {
  const q = query(collection(db, 'publicEvents'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PublicEvent);
};

// ─── Daily Check-ins ─────────────────────────────────────────────────────────

const checkinId = (uid: string, date: string) => `${uid}_${date}`;

export const getCheckin = async (uid: string, date: string): Promise<DailyCheckin | null> => {
  const snap = await getDoc(doc(db, 'dailyCheckins', checkinId(uid, date)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DailyCheckin;
};

export const saveCheckin = async (uid: string, date: string, patch: Partial<Pick<DailyCheckin, 'morning' | 'evening' | 'journalEntry'>>): Promise<void> => {
  const id = checkinId(uid, date);
  const ref = doc(db, 'dailyCheckins', id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    const empty: Omit<DailyCheckin, 'id'> = {
      userId: uid,
      date,
      morning: { completedAt: null, answers: {} },
      evening: { completedAt: null, answers: {} },
      journalEntry: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(ref, { ...empty, ...patch, updatedAt: serverTimestamp() });
  } else {
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  }
};

export const subscribeToRecentCheckins = (uid: string, days: number, cb: (entries: DailyCheckin[]) => void) => {
  // Pull all of the user's check-ins and let the caller slice; volume is tiny (1/day).
  const q = query(collection(db, 'dailyCheckins'), where('userId', '==', uid), orderBy('date', 'desc'), limit(days));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyCheckin)));
};

// Avoid unused import lint
export type _CheckinAnswers = DailyCheckinAnswers;
