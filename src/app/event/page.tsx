'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, AlignLeft, ExternalLink } from 'lucide-react';
import { getPublicEventBySlug } from '@/lib/firestore';
import { PublicEvent } from '@/types';
import { format, isSameDay } from 'date-fns';
import Link from 'next/link';

function EventContent() {
  const params = useSearchParams();
  const slug = params.get('slug') ?? params.get('id'); // backward-compat with old ?id= links
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) { setError(true); setLoading(false); return; }
    getPublicEventBySlug(slug)
      .then((pe) => {
        if (pe) setEvent(pe);
        else    setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6 text-center">
        <Calendar className="w-12 h-12 text-white/20 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Event not found</h1>
        <p className="text-white/40 text-sm mb-6">The link may have been revoked or never existed.</p>
        <Link href="/" className="px-4 py-2 rounded bg-white text-black text-sm font-medium hover:bg-[#e0e0e0] transition-colors">
          Open NEXUS
        </Link>
      </div>
    );
  }

  const start = event.startDate.toDate();
  const end   = event.endDate.toDate();
  const startFmt = format(start, event.allDay ? 'EEE, MMM d, yyyy' : 'EEE, MMM d, yyyy · HH:mm');
  const endFmt   = format(end,   event.allDay ? 'EEE, MMM d, yyyy' : 'HH:mm');
  const sameDay  = isSameDay(start, end);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-[#333333] overflow-hidden bg-[#0d0d0d]"
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${event.color}25`, background: `${event.color}10` }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: event.color }} />
            <h1 className="text-xl sm:text-2xl font-bold text-white">{event.title}</h1>
          </div>
          {event.category && (
            <span className="text-xs px-2.5 py-1 rounded-full capitalize font-medium ml-6"
              style={{ background: `${event.color}20`, color: event.color }}>
              {event.category}
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/80">
              <p>{startFmt}</p>
              {!event.allDay && <p className="text-white/40 mt-0.5">{sameDay ? `Ends at ${endFmt}` : `→ ${endFmt}`}</p>}
            </div>
          </div>
          {event.location && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-white/30 flex-shrink-0" />
              <p className="text-sm text-white/80">{event.location}</p>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-3">
              <AlignLeft className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <Link href="/"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] transition-colors">
            <ExternalLink className="w-4 h-4" /> Open NEXUS
          </Link>
          <p className="text-center text-[11px] text-white/30 mt-3">Shared via NEXUS · nexus-future.web.app</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function PublicEventPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EventContent />
    </Suspense>
  );
}
