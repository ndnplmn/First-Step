'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Patient, PatientSession, Gender } from '@/lib/types';
import { generatePatientId, generateId } from '@/lib/id';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowLeft } from '@phosphor-icons/react';

interface IntakeProps {
  onComplete: (patient: Patient, session: PatientSession) => void;
  onBack: () => void;
}

const QUESTIONS = [
  { field: 'name' as const, label: '¿Cómo te llamas?', type: 'text' as const, placeholder: 'Tu nombre' },
  { field: 'age' as const, label: '¿Cuántos años tienes?', type: 'number' as const, placeholder: 'Tu edad' },
  { field: 'gender' as const, label: '¿Cómo te identificas?', type: 'select' as const, options: ['Femenino', 'Masculino', 'Otro'] as Gender[] },
];

export function Intake({ onComplete, onBack }: IntakeProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ name: '', age: '', gender: 'Femenino' as Gender });

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const handleNext = () => {
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
      onComplete(patient, session);
    } else {
      setStep(s => s + 1);
    }
  };

  const canProceed =
    (current.field === 'name' && values.name.trim().length > 0) ||
    (current.field === 'age' && parseInt(values.age) > 0 && parseInt(values.age) < 120) ||
    current.field === 'gender';

  return (
    <div className="min-h-screen flex flex-col max-w-[680px] mx-auto px-6 pt-16 pb-48">
      <button onClick={onBack} className="flex items-center gap-2 mb-12 self-start" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} />
        <span className="text-sm">Volver</span>
      </button>

      <p className="text-xs mb-3" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
        Capítulo 1 — Apertura
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="flex-1 space-y-8"
        >
          <h2
            className="text-[42px] leading-tight breathe"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
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
              className="w-full bg-transparent outline-none py-3 text-xl placeholder:opacity-40 border-b-2 transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-deep)',
              }}
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
              min={1} max={120}
              className="w-full bg-transparent outline-none py-3 text-xl placeholder:opacity-40 border-b-2 transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-deep)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            />
          )}

          {current.type === 'select' && (
            <div className="flex flex-wrap gap-3">
              {current.options?.map(opt => (
                <button
                  key={opt}
                  onClick={() => setValues(v => ({ ...v, gender: opt }))}
                  className="px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: values.gender === opt ? 'var(--color-sage)' : 'var(--color-surface)',
                    color: values.gender === opt ? 'white' : 'var(--color-deep)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 mt-8">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className="h-0.5 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= step ? 'var(--color-sage)' : 'var(--color-border)' }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <FloatingBar visible={canProceed}>
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          {isLast ? 'Comenzar mi proceso' : 'Continuar'}
        </button>
      </FloatingBar>
    </div>
  );
}
