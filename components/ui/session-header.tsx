'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Gear } from '@phosphor-icons/react';
import type { Patient, PatientSession } from '@/lib/types';
import { ChapterProgress } from './chapter-progress';

interface SessionHeaderProps {
  patient: Patient;
  session: PatientSession;
  onSettings?: () => void;
}

export function SessionHeader({ patient, session, onSettings }: SessionHeaderProps) {
  const shouldReduce = useReducedMotion();

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'var(--color-glass-heavy)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3.5">
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--color-deep)' }}
        >
          {patient.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ChapterProgress currentStage={session.stage} />
          {onSettings && (
            <motion.button
              type="button"
              onClick={onSettings}
              whileTap={shouldReduce ? {} : { scale: 0.92 }}
              aria-label="Ajustes"
              style={{
                color: 'var(--color-muted)',
                padding: '0.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                opacity: 0.6,
              }}
            >
              <Gear size={15} aria-hidden="true" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}
