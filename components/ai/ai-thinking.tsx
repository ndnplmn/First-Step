'use client';

import { motion } from 'motion/react';

export function AIThinking() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl p-5 border-l-[3px] border-[var(--color-sage)]"
      style={{
        background: 'linear-gradient(135deg, var(--color-sage-light), var(--color-violet-light))',
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          boxShadow: [
            '0 0 0 0px rgba(74,103,65,0.0)',
            '0 0 0 4px rgba(74,103,65,0.12)',
            '0 0 0 0px rgba(74,103,65,0.0)',
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-[var(--color-sage)] opacity-40 flex-shrink-0" />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)]"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <span className="text-sm text-[var(--color-muted)] italic">Analizando...</span>
      </div>
    </motion.div>
  );
}
