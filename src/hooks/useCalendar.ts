'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfDay, endOfDay, addMonths, subMonths,
  addWeeks, subWeeks, addDays, subDays, addYears, subYears,
} from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { CalendarEvent, CalendarView, RecurringConfig } from '@/types';
import { subscribeToAllEvents, createEvent, updateEvent, deleteEvent } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

export const useCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!user) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToAllEvents(user.uid, (data) => {
      setEvents(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const navigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') { setCurrentDate(new Date()); return; }
    const delta = direction === 'next' ? 1 : -1;
    setCurrentDate((prev) => {
      if (view === 'month')  return addMonths(prev, delta);
      if (view === 'week')   return addWeeks(prev, delta);
      if (view === 'day')    return addDays(prev, delta);
      if (view === 'year')   return addYears(prev, delta);
      if (view === 'agenda') return addDays(prev, delta * 7);
      return addMonths(prev, delta);
    });
  }, [view]);

  const getVisibleRange = useCallback(() => {
    if (view === 'month')  return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    if (view === 'week')   return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    if (view === 'day')    return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    if (view === 'agenda') return { start: startOfDay(currentDate), end: addDays(currentDate, 90) };
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  }, [view, currentDate]);

  const getEventsForDate = useCallback((date: Date) => {
    const day = startOfDay(date);
    return events.filter((e) => {
      const start = startOfDay(e.startDate.toDate());
      const end = startOfDay(e.endDate.toDate());
      return day >= start && day <= end;
    });
  }, [events]);

  const addEvent = useCallback(async (data: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    allDay?: boolean;
    color?: string;
    category?: string;
    location?: string;
    recurring?: RecurringConfig | null;
    reminderMinutes?: number[];
  }) => {
    if (!user) return;
    await createEvent({
      userId: user.uid,
      title: data.title,
      description: data.description ?? '',
      startDate: Timestamp.fromDate(data.startDate),
      endDate: Timestamp.fromDate(data.endDate),
      allDay: data.allDay ?? false,
      color: data.color ?? '#00d4ff',
      category: data.category ?? 'personal',
      location: data.location,
      recurring: data.recurring ?? null,
      reminderMinutes: data.reminderMinutes ?? [15],
      attendees: [],
    });
  }, [user]);

  const editEvent = useCallback(async (id: string, data: Partial<CalendarEvent>) => {
    await updateEvent(id, data);
  }, []);

  const removeEvent = useCallback(async (id: string) => {
    await deleteEvent(id);
  }, []);

  const upcomingEvents = events
    .filter((e) => e.startDate.toDate() >= new Date())
    .sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime())
    .slice(0, 5);

  return {
    events,
    currentDate,
    view,
    loading,
    selectedEvent,
    setView,
    setCurrentDate,
    setSelectedEvent,
    navigate,
    getVisibleRange,
    getEventsForDate,
    addEvent,
    editEvent,
    removeEvent,
    upcomingEvents,
  };
};
