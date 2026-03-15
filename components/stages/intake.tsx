'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Gender } from '@/lib/types';
import { generatePatientId, generateId } from '@/lib/id';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { ArrowLeft } from '@phosphor-icons/react';

interface IntakeProps {
  onComplete: (patient: Patient, session: PatientSession) => void;
  onBack: () => void;
}

const QUESTIONS = [
  {
    field: 'name' as const,
    label: '¿Cómo se llama\ntu paciente?',
    type: 'text' as const,
    placeholder: 'Nombre completo',
  },
  {
    field: 'age' as const,
    label: '¿Cuántos años\ntiene?',
    type: 'number' as const,
    placeholder: 'Edad',
  },
  {
    field: 'gender' as const,
    label: '¿Cómo se\nidentifica?',
    type: 'select' as const,
    options: ['Femenino', 'Masculino', 'Otro'] as Gender[],
  },
];

export function Intake({ onComplete, onBack }: IntakeProps) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ name: '', age: '', gender: 'Femenino' as Gender });
  const [pendingData, setPendingData] = useState<{ patient: Patient; session: PatientSession } | null>(null);
  const [showTransition, setShowTransition] = useState(false);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const canProceed =
    (current.field === 'name' && values.name.trim().length > 0) ||
    (current.field === 'age' && parseInt(values.age) > 0 && parseInt(values.age) < 120) ||
    current.field === 'gender';

  const handleNext = () => {
    if (!canProceed) return;
    if (isLast) {
      const patient: Patient = {
        id: generatePatientId(),
        name: values.name,
        age: parseInt(values.age),
        gender: values.gender,
        createdAt: Date.now(),
      };
      const session: PatientSession = {
        id: generateId(),
        patientId: patient.id,
        sessionNumber: 1,
        stage: 2,
        conflicts: [],
        theoryMatch: null,
        memories: [],
        interpretation: null,
        closure: null,
        unmappedPhrases: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPendingData({ patient, session });
      setShowTransition(true);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    if (pendingData) {
      onComplete(pendingData.patient, pendingData.session);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-[680px] mx-auto px-6 pt-10 pb-48">
      {/* Back button */}
      <motion.button
        type="button"
        onClick={onBack}
        whileTap={shouldReduce ? {} : { scale: 0.97 }}
        className="flex items-center gap-2 mb-10 self-start"
        style={{ color: 'var(--color-muted)' }}
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Volver</span>
      </motion.button>

      {/* Step indicator */}
      <div className="mb-8 space-y-3">
        <p
          className="text-xs"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
        >
          Nuevo expediente · Paso {step + 1} de {QUESTIONS.length}
        </p>
        <div className="flex items-center gap-1">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="h-[3px] rounded-full transition-all duration-300"
              style={{
                width: 28,
                background:
                  i < step
                    ? 'var(--color-deep)'
                    : i === step
                    ? 'var(--color-sage)'
                    : 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={shouldReduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={
            shouldReduce
              ? { opacity: 0 }
              : { opacity: 0, x: -16, transition: { duration: 0.18 } }
          }
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="flex-1 space-y-8"
        >
          <h2
            className="leading-tight breathe whitespace-pre-line"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 6vw, 52px)',
              color: 'var(--color-deep)',
            }}
          >
            {current.label}
          </h2>

          {current.type === 'text' && (
            <input
              type="text"
              value={values.name}
              onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
              placeholder={current.placeholder}
              autoFocus
              className="w-full bg-transparent outline-none py-3 text-xl placeholder:opacity-40 border-b-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            />
          )}

          {current.type === 'number' && (
            <input
              type="number"
              value={values.age}
              onChange={e => setValues(v => ({ ...v, age: e.target.value }))}
              placeholder={current.placeholder}
              autoFocus
              min={1}
              max={120}
              className="w-full bg-transparent outline-none py-3 text-xl placeholder:opacity-40 border-b-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            />
          )}

          {current.type === 'select' && (
            <div className="flex flex-wrap gap-3">
              {current.options?.map((opt, i) => (
                <motion.button
                  key={opt}
                  type="button"
                  onClick={() => setValues(v => ({ ...v, gender: opt }))}
                  initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.06,
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  className="px-5 py-3 rounded-xl text-sm font-medium"
                  style={{
                    background:
                      values.gender === opt ? 'var(--color-sage)' : 'var(--color-surface)',
                    color: values.gender === opt ? 'white' : 'var(--color-deep)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* CTA */}
      <FloatingBar visible={canProceed}>
        <motion.button
          type="button"
          onClick={handleNext}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          {isLast ? 'Crear expediente' : 'Continuar →'}
        </motion.button>
      </FloatingBar>

      {/* Chapter transition overlay on completion */}
      <AnimatePresence>
        {showTransition && (
          <ChapterTransition toStage={2} onComplete={handleTransitionComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
