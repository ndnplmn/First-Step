'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';

interface FloatingBarProps {
  visible: boolean;
  children: ReactNode;
}

export function FloatingBar({ visible, children }: FloatingBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div
            className="max-w-[680px] mx-auto px-6 pb-8 pt-6"
            style={{
              background: 'linear-gradient(to top, var(--color-base) 55%, transparent)',
            }}
          >
            <div
              className="rounded-[20px] p-4 space-y-2.5"
              style={{
                background: 'var(--color-glass-heavy)',
                backdropFilter: 'blur(24px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                boxShadow: 'var(--shadow-float)',
                border: '1px solid rgba(255,255,255,0.45)',
              }}
            >
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
