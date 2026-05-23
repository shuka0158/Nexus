'use client';

import { motion } from 'framer-motion';
import { format, isToday, isTomorrow } from 'date-fns';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CalendarEvent } from '@/types';
import { hexToRgba } from '@/lib/utils';

interface UpcomingEventsProps {
  events: CalendarEvent[];
}

const getDateLabel = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
};

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events }) => (
  <GlassCard padding="md">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-white">Upcoming Events</h3>
      <Calendar className="w-4 h-4 text-white/30" />
    </div>

    {events.length === 0 ? (
      <div className="py-8 text-center">
        <Calendar className="w-8 h-8 text-white/15 mx-auto mb-2" />
        <p className="text-sm text-white/30">No upcoming events</p>
      </div>
    ) : (
      <div className="space-y-2">
        {events.map((event, i) => {
          const start = event.startDate.toDate();
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div
                className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: event.color, boxShadow: `0 0 8px ${event.color}60` }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{event.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <Clock className="w-3 h-3" />
                    {getDateLabel(start)}{!event.allDay && `, ${format(start, 'HH:mm')}`}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-white/30 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: hexToRgba(event.color, 0.15),
                  color: event.color,
                  border: `1px solid ${hexToRgba(event.color, 0.3)}`,
                }}
              >
                {event.category}
              </span>
            </motion.div>
          );
        })}
      </div>
    )}
  </GlassCard>
);
