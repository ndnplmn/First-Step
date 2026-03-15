'use client';

import { motion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';

interface WelcomeProps {
  onStart: () => void;
  onContinue?: () => void;
  hasExistingPatients: boolean;
}

export function Welcome({ onStart, onContinue, hasExistingPatients }: WelcomeProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between px-6 pt-24 pb-12 max-w-[680px] mx-auto">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1
            className="breathe text-[72px] leading-[0.95]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
          >
            Primer<br />Paso
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-lg max-w-xs leading-relaxed"
          style={{ color: 'var(--color-muted)' }}
        >
          Un espacio seguro para entenderte a ti mismo y encontrar claridad.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-12 h-px"
          style={{ background: 'var(--color-border)' }}
        />
      </div>

      <FloatingBar visible={true}>
        <div className="space-y-3">
          <button
            onClick={onStart}
            className="w-full py-3.5 rounded-xl font-medium text-white transition-all"
            style={{ background: 'var(--color-sage)' }}
          >
            Comenzar
          </button>
          {hasExistingPatients && (
            <button
              onClick={onContinue}
              className="w-full py-3.5 rounded-xl font-medium transition-all"
              style={{ color: 'var(--color-sage)', background: 'transparent' }}
            >
              Continuar donde lo dejé
            </button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
