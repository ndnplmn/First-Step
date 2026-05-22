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
            className="max-w-[680px] mx-auto px-5 pt-5"
            style={{
              background: 'linear-gradient(to top, var(--color-base) 60%, transparent)',
              paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
            }}
          >
            <div
              className="rounded-[22px] p-4 space-y-2.5"
              style={{
                background: 'var(--color-glass-heavy)',
                backdropFilter: 'blur(32px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
                boxShadow: 'var(--shadow-float)',
                border: '1px solid rgba(255,255,255,0.55)',
                outline: '1px solid rgba(28,25,21,0.06)',
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
