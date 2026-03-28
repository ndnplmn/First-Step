'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { FloatingBar } from '@/components/ui/floating-bar';

interface CheckInProps {
  patient: Patient;
  session: PatientSession;
  onComplete: (session: PatientSession) => void;
}

const LIFE_CHANGE_OPTIONS = [
  'Cambié de trabajo',
  'Cambié de vivienda',
  'Cambio en mi relación',
  'Problema de salud',
  'Pérdida de alguien',
  'Conflicto familiar',
  'Cambio económico',
  'Otro',
];

export function CheckIn({ patient, session, onComplete }: CheckInProps) {
  const shouldReduce = useReducedMotion();
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState('');

  const toggleChip = (option: string) => {
    setSelected(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const handleContinue = () => {
    const updatedSession: PatientSession = {
      ...session,
      lifeChanges: {
        categories: selected,
        detail: detail.trim() || undefined,
      },
    };
    onComplete(updatedSession);
  };

  const handleSkip = () => {
    onComplete(session);
  };

  return (
    <div className="max-w-[680px] mx-auto px-6 pt-[12vh] pb-48">
      {/* Header */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduce ? { duration: 0 } : { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <p
          className="text-xs mb-2"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
        >
          Sesión {session.sessionNumber}
        </p>
        <h2
          className="text-[40px] leading-tight breathe"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
        >
          Hola {patient.name}
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Antes de empezar, ¿hubo algún cambio importante en tu vida desde la última vez?
        </p>
      </motion.div>

      {/* Life Change Chips */}
      <div className="flex flex-wrap gap-3 mt-8">
        {LIFE_CHANGE_OPTIONS.map((option, i) => {
          const isSelected = selected.includes(option);
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => toggleChip(option)}
              initial={shouldReduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldReduce
                  ? { duration: 0 }
                  : { duration: 0.35, delay: 0.15 + i * 0.05, ease: 'easeOut' }
              }
              whileTap={shouldReduce ? {} : { scale: 0.96 }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: isSelected ? 'var(--color-sage)' : 'var(--color-surface)',
                color: isSelected ? 'white' : 'var(--color-deep)',
                boxShadow: isSelected ? 'none' : 'var(--shadow-card)',
              }}
            >
              {option}
            </motion.button>
          );
        })}
      </div>

      {/* Conditional Detail Textarea */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={
              shouldReduce
                ? { duration: 0 }
                : { duration: 0.35, ease: 'easeOut' }
            }
            className="mt-6 overflow-hidden"
          >
            <label
              className="block text-sm mb-2 font-medium"
              style={{ color: 'var(--color-deep)' }}
            >
              ¿Quieres contarme más sobre este cambio?
            </label>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Es opcional, pero puede ayudarme a entenderte mejor..."
              rows={4}
              className="w-full bg-transparent outline-none resize-none p-4 rounded-xl border-2 transition-all"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FloatingBar */}
      <FloatingBar visible>
        <div className="space-y-3">
          <motion.button
            type="button"
            onClick={handleContinue}
            disabled={selected.length === 0}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="w-full py-3.5 rounded-xl font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--color-sage)' }}
          >
            Continuar →
          </motion.button>
          <motion.button
            type="button"
            onClick={handleSkip}
            whileTap={shouldReduce ? {} : { scale: 0.98 }}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ color: 'var(--color-muted)', background: 'transparent' }}
          >
            Todo sigue igual, continuar
          </motion.button>
        </div>
      </FloatingBar>
    </div>
  );
}
