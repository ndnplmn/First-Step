'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { FloatingBar } from '@/components/ui/floating-bar';

/* ── constants ─────────────────────────────────────────── */

const WELLBEING_OPTIONS = [
  { value: 1, label: 'Muy mal' },
  { value: 2, label: 'Mal' },
  { value: 3, label: 'Regular' },
  { value: 4, label: 'Bien' },
  { value: 5, label: 'Muy bien' },
];

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

const TOTAL_STEPS = 3;

/* ── types ─────────────────────────────────────────────── */

interface CheckInProps {
  patient: Patient;
  session: PatientSession;
  onComplete: (session: PatientSession) => void;
}

/* ── helpers ───────────────────────────────────────────── */

function getStepQuestion(step: number, patientName: string): string {
  switch (step) {
    case 0: return `Hola ${patientName}, ¿cómo te sientes hoy?`;
    case 1: return '¿Hubo algún cambio importante desde la última vez?';
    case 2: return '¿Qué quieres trabajar hoy?';
    default: return '';
  }
}

function getStepAnswer(
  step: number,
  wellbeing: number | null,
  lifeChanges: string[],
  lifeDetail: string,
  intention: string
): string | null {
  switch (step) {
    case 0: return wellbeing ? WELLBEING_OPTIONS.find(o => o.value === wellbeing)?.label ?? null : null;
    case 1: {
      if (lifeChanges.length === 0) return 'Sin cambios';
      return lifeChanges.join(', ') + (lifeDetail.trim() ? ` — ${lifeDetail.trim()}` : '');
    }
    case 2: return intention.trim() || null;
    default: return null;
  }
}

/* ── chip subcomponent ─────────────────────────────────── */

function Chip({
  label,
  active,
  onClick,
  reduce,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  reduce: boolean | null;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduce ? {} : { scale: 0.95 }}
      className="px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-medium"
      style={{
        background: active ? 'var(--color-sage)' : 'var(--color-surface)',
        color: active ? 'white' : 'var(--color-deep)',
        boxShadow: active ? 'var(--shadow-glow-sage)' : 'var(--shadow-card)',
        transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {label}
    </motion.button>
  );
}

/* ── main component ────────────────────────────────────── */

export function CheckIn({ patient, session, onComplete }: CheckInProps) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);

  // Step 0
  const [wellbeing, setWellbeing] = useState<number | null>(null);
  // Step 1
  const [lifeChanges, setLifeChanges] = useState<string[]>([]);
  const [lifeDetail, setLifeDetail] = useState('');
  // Step 2
  const [intention, setIntention] = useState('');

  const toggleLifeChange = (option: string) => {
    setLifeChanges(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const canProceed = (): boolean => {
    if (step === 0) return wellbeing !== null;
    return true; // steps 1 and 2 are skippable
  };

  const buildUpdatedSession = (): PatientSession => ({
    ...session,
    wellbeingBefore: wellbeing ?? undefined,
    lifeChanges: lifeChanges.length > 0
      ? { categories: lifeChanges, detail: lifeDetail.trim() || undefined }
      : undefined,
    sessionIntention: intention.trim() || undefined,
  });

  const handleNext = () => {
    if (!canProceed()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      onComplete(buildUpdatedSession());
    }
  };

  const handleSkip = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      onComplete(buildUpdatedSession());
    }
  };

  return (
    <div className="min-h-dvh flex flex-col max-w-[680px] mx-auto px-6 pt-6 pb-48">
      {/* Progress bar */}
      <div className="flex gap-0.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full transition-all duration-300"
            style={{
              background: i < step
                ? 'var(--color-deep)'
                : i === step
                ? 'var(--color-sage)'
                : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* Answered steps as bubbles */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {Array.from({ length: step }).map((_, i) => {
          const answer = getStepAnswer(i, wellbeing, lifeChanges, lifeDetail, intention);
          if (!answer) return null;
          return (
            <motion.div
              key={`answered-${i}`}
              initial={false}
              animate={{ opacity: 0.6 }}
              className="space-y-1.5"
            >
              <p
                className="text-xs"
                style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {getStepQuestion(i, patient.name)}
              </p>
              <p
                className="text-sm inline-block px-3 py-1.5 rounded-[var(--radius-inner)]"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-deep)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {answer}
              </p>
            </motion.div>
          );
        })}

        {/* Current step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="space-y-5"
          >
            <p
              className="text-xl leading-snug"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
            >
              {getStepQuestion(step, patient.name)}
            </p>

            {/* Step 0: Wellbeing */}
            {step === 0 && (
              <div className="flex flex-wrap gap-3">
                {WELLBEING_OPTIONS.map(opt => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={wellbeing === opt.value}
                    onClick={() => setWellbeing(opt.value)}
                    reduce={shouldReduce}
                  />
                ))}
              </div>
            )}

            {/* Step 1: Life changes */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {LIFE_CHANGE_OPTIONS.map(option => (
                    <Chip
                      key={option}
                      label={option}
                      active={lifeChanges.includes(option)}
                      onClick={() => toggleLifeChange(option)}
                      reduce={shouldReduce}
                    />
                  ))}
                </div>
                <AnimatePresence>
                  {lifeChanges.length > 0 && (
                    <motion.div
                      initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={lifeDetail}
                        onChange={e => setLifeDetail(e.target.value)}
                        placeholder="¿Quieres contarme más? (opcional)"
                        rows={3}
                        className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step 2: Session intention */}
            {step === 2 && (
              <div className="space-y-3">
                <textarea
                  value={intention}
                  onChange={e => setIntention(e.target.value)}
                  placeholder="Puede ser algo nuevo, algo pendiente, o simplemente cómo te sientes…"
                  rows={4}
                  autoFocus
                  className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FloatingBar */}
      <FloatingBar visible={canProceed()}>
        <div className="space-y-3">
          <motion.button
            type="button"
            onClick={handleNext}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
            style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
          >
            {step === TOTAL_STEPS - 1 ? 'Comenzar sesión →' : 'Siguiente'}
          </motion.button>
          {step > 0 && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-muted)' }}
            >
              {step === 1 ? 'Todo sigue igual, continuar' : 'Continuar sin definir un tema'}
            </button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
