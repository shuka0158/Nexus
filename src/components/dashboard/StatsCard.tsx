'use client';

import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { hexToRgba } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; label: string };
  delay?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title, value, subtitle, icon, color, trend, delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
  >
    <GlassCard glow glowColor={color} padding="md" className="h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{title}</p>
          <motion.p
            className="text-3xl font-bold text-white mt-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.1, duration: 0.4 }}
          >
            {value}
          </motion.p>
          {subtitle && <p className="text-sm text-white/50 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-400" />
              ) : (
                <Minus className="w-3 h-3 text-white/30" />
              )}
              <span
                className="text-xs font-medium"
                style={{ color: trend.value > 0 ? '#22c55e' : trend.value < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)' }}
              >
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-white/30">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: hexToRgba(color, 0.15),
            border: `1px solid ${hexToRgba(color, 0.3)}`,
          }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="mt-4 h-0.5 rounded-full overflow-hidden bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${hexToRgba(color, 0.3)})` }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ delay: delay + 0.3, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </GlassCard>
  </motion.div>
);
