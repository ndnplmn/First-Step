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
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div
            className="max-w-[680px] mx-auto px-6 pb-8 pt-4"
            style={{
              background: 'linear-gradient(to top, var(--color-base) 60%, transparent)',
            }}
          >
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--color-glass)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-float)',
                border: '1px solid rgba(255,255,255,0.5)',
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
