'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, AlignLeft, ExternalLink } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarEvent } from '@/types';
import { format, isSameDay } from 'date-fns';
import Link from 'next/link';

function EventContent() {
  const params = useSearchParams();
  const id = params.get('id');
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }
    getDoc(doc(db, 'events', id))
      .then(snap => {
        if (snap.exists()) {
          setEvent({ id: snap.id, ...snap.data() } as CalendarEvent);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070714]">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070714] p-6 text-center">
        <Calendar className="w-12 h-12 text-white/20 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Event not found</h1>
        <p className="text-white/40 text-sm mb-6">This event may have been deleted or the link is invalid.</p>
        <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-[#00d4ff]/15 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/25 transition-colors">
          Open NEXUS
        </Link>
      </div>
    );
  }

  const startFmt = format(event.startDate.toDate(), event.allDay ? 'EEE, MMM d, yyyy' : 'EEE, MMM d, yyyy · HH:mm');
  const endFmt   = format(event.endDate.toDate(), event.allDay ? 'EEE, MMM d, yyyy' : 'HH:mm');
  const sameDay  = isSameDay(event.startDate.toDate(), event.endDate.toDate());

  return (
    <div className="min-h-screen bg-[#070714] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
        style={{ background: 'rgba(15,15,35,0.95)', backdropFilter: 'blur(20px)' }}
      >
        <div className="px-7 pt-7 pb-5" style={{ borderBottom: `1px solid ${event.color}25`, background: `${event.color}12` }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: event.color, boxShadow: `0 0 12px ${event.color}60` }} />
            <h1 className="text-2xl font-bold text-white">{event.title}</h1>
          </div>
          {event.category && (
            <span className="text-xs px-2.5 py-1 rounded-full capitalize font-medium ml-7"
              style={{ background: `${event.color}20`, color: event.color }}>
              {event.category}
            </span>
          )}
        </div>

        <div className="px-7 py-6 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/70">
              <p>{startFmt}</p>
              {!event.allDay && <p className="text-white/40">{sameDay ? `Ends at ${endFmt}` : `→ ${endFmt}`}</p>}
            </div>
          </div>
          {event.location && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-white/30 flex-shrink-0" />
              <p className="text-sm text-white/70">{event.location}</p>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-3">
              <AlignLeft className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/60 leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        <div className="px-7 pb-7">
          <Link href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm transition-all"
            style={{ background: `${event.color}20`, color: event.color, border: `1px solid ${event.color}30` }}>
            <ExternalLink className="w-4 h-4" /> Open in NEXUS
          </Link>
          <p className="text-center text-xs text-white/20 mt-3">Shared via NEXUS · nexus-future.web.app</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function PublicEventPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#070714]">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EventContent />
    </Suspense>
  );
}
