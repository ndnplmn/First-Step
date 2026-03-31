'use client';

import { motion, useReducedMotion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';

interface WelcomeProps {
  hasExistingPatients: boolean;
  onStart: () => void;
  onContinue: () => void;
}

export function Welcome({ hasExistingPatients, onStart, onContinue }: WelcomeProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div
      className="min-h-dvh max-w-[680px] mx-auto px-6 pt-[22vh] pb-12 relative"
      style={{
        background: 'radial-gradient(ellipse 80% 45% at 50% -8%, rgba(180, 110, 69, 0.1), transparent)',
      }}
    >
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduce ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1
          className="leading-[0.9] breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-display)',
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: 'var(--color-deep)' }}>First</span>
          <br />
          <span style={{ color: 'var(--color-terracotta)' }}>Step</span>
        </h1>
      </motion.div>

      <motion.p
        initial={shouldReduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={shouldReduce ? { duration: 0 } : { duration: 0.6, delay: 0.45, ease: 'easeOut' }}
        className="mt-10 leading-relaxed max-w-[340px]"
        style={{
          color: 'var(--color-muted)',
          fontSize: 'var(--text-body)',
        }}
      >
        Tu primer paso hacia el autoconocimiento. Un espacio íntimo, guiado y tuyo.
      </motion.p>

      <FloatingBar visible>
        <motion.button
          type="button"
          onClick={onStart}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
          style={{
            background: 'var(--color-sage)',
            boxShadow: 'var(--shadow-glow-sage)',
          }}
        >
          Comenzar sesión
        </motion.button>

        {hasExistingPatients && (
          <motion.button
            type="button"
            onClick={onContinue}
            whileTap={shouldReduce ? {} : { scale: 0.98 }}
            className="w-full py-3.5 rounded-2xl font-medium text-sm"
            style={{
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-muted)',
              background: 'var(--color-surface)',
            }}
          >
            Mis sesiones
          </motion.button>
        )}
      </FloatingBar>
    </div>
  );
}
