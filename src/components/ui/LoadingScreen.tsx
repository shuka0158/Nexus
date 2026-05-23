'use client';

import { motion } from 'framer-motion';

export const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 bg-dark-900 flex flex-col items-center justify-center z-50">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Logo */}
      <div className="relative w-20 h-20">
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
            boxShadow: '0 0 40px rgba(0,212,255,0.4)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <div
          className="absolute inset-1 rounded-xl bg-dark-800 flex items-center justify-center"
        >
          <span className="text-2xl font-bold text-white font-orb">N</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <motion.h1
          className="text-2xl font-bold text-white tracking-widest font-orb"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          NEXUS
        </motion.h1>
        <p className="text-white/40 text-xs tracking-widest uppercase">
          Productivity OS
        </p>
      </div>

      {/* Loading bar */}
      <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #00d4ff, #a855f7)' }}
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  </div>
);
