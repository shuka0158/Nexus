'use client';

import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/ThemeContext';

interface ActivityChartProps {
  data: { date: string; count: number }[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg border border-white/10 text-sm"
      style={{ background: 'rgba(10,10,25,0.9)', backdropFilter: 'blur(10px)' }}
    >
      <p className="text-white/50 text-xs">{label}</p>
      <p className="text-white font-medium">{payload[0].value} tasks</p>
    </div>
  );
};

export const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const { theme } = useTheme();

  return (
    <GlassCard padding="md" className="col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Activity</h3>
          <p className="text-xs text-white/40">Tasks completed this month</p>
        </div>
        <motion.div
          className="px-2 py-1 rounded-lg text-xs font-medium"
          style={{
            background: `${theme.accentColor}20`,
            color: theme.accentColor,
            border: `1px solid ${theme.accentColor}40`,
          }}
        >
          This Month
        </motion.div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={theme.accentColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={theme.accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke={theme.accentColor}
            strokeWidth={2}
            fill="url(#activityGrad)"
            dot={false}
            activeDot={{ r: 4, fill: theme.accentColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
