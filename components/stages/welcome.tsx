'use client';

import { motion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';

interface WelcomeProps {
  hasExistingPatients: boolean;
  onStart: () => void;
  onContinue: () => void;
}

export function Welcome({ hasExistingPatients, onStart, onContinue }: WelcomeProps) {
  return (
    <div
      className="min-h-screen max-w-[680px] mx-auto px-6 pt-[20vh] pb-12 relative"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(193,127,89,0.13), transparent)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h1
          className="leading-[0.92] breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(64px, 14vw, 112px)',
            fontStyle: 'italic',
          }}
        >
          <span style={{ color: 'var(--color-deep)' }}>First</span>
          <br />
          <span style={{ color: 'var(--color-terracotta)' }}>Step</span>
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        className="mt-8 text-lg leading-relaxed max-w-[360px]"
        style={{ color: 'var(--color-muted)' }}
      >
        Tu primer paso hacia el autoconocimiento. Un espacio íntimo, guiado y tuyo.
      </motion.p>

      <FloatingBar visible>
        <motion.button
          onClick={onStart}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Comenzar sesión
        </motion.button>

        {hasExistingPatients && (
          <motion.button
            onClick={onContinue}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl font-medium text-sm"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              background: 'transparent',
            }}
          >
            Ver expedientes
          </motion.button>
        )}
      </FloatingBar>
    </div>
  );
}
