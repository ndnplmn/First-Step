'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';

type Props = {
  session: PatientSession;
  patient: Patient;
  onAdvance: (result: string) => void;
  onUpdate: (session: PatientSession) => void;
};

const FALLBACK = {
  title: 'Awareness Corporal',
  description: 'Exploración consciente de las sensaciones del cuerpo',
  prompt: 'Cierra los ojos. ¿Dónde sientes esto en tu cuerpo? ¿Qué forma tiene?',
};

export function StageGestaltActivity({ session, patient: _patient, onAdvance, onUpdate: _onUpdate }: Props) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [step1Text, setStep1Text] = useState('');
  const [step2Text, setStep2Text] = useState('');

  const activity = session.gestaltActivity ?? FALLBACK;
  const title = activity.title;
  const description = activity.description;
  const prompt = activity.prompt;

  const stepVariants = {
    initial: shouldReduce ? {} : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduce ? {} : { opacity: 0, y: -12 },
  };

  const transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Fase 3 — Técnica Gestalt
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            color: 'var(--color-deep)',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '2rem' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              height: '2px',
              flex: 1,
              borderRadius: '9999px',
              background: i <= step ? 'var(--color-sage)' : 'var(--color-border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0 — Introducción */}
        {step === 0 && (
          <motion.div
            key="step-0"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <div
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                borderRadius: 'var(--radius-card)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <p style={{ color: 'var(--color-deep)', lineHeight: 1.7, margin: 0 }}>{description}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>
                El terapeuta te guiará a través de esta actividad
              </p>

              {/* Breathing indicator */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
                <motion.div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '9999px',
                    background: 'var(--color-sage)',
                    opacity: 0.35,
                  }}
                  animate={shouldReduce ? {} : {
                    scale: [1, 1.5, 1],
                    opacity: [0.35, 0.6, 0.35],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            </div>

            <motion.button
              type="button"
              onClick={() => setStep(1)}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                background: 'var(--color-sage)',
                boxShadow: 'var(--shadow-glow-sage)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-inner)',
                padding: '0.875rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Comenzar actividad
            </motion.button>
          </motion.div>
        )}

        {/* Step 1 — Actividad */}
        {step === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                color: 'var(--color-deep)',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {prompt}
            </p>

            <textarea
              value={step1Text}
              onChange={e => setStep1Text(e.target.value)}
              placeholder="¿Qué surge en ti?"
              autoFocus
              rows={6}
              style={{
                width: '100%',
                background: 'transparent',
                outline: 'none',
                resize: 'none',
                padding: '1rem',
                borderRadius: 'var(--radius-inner)',
                border: '2px solid var(--color-border)',
                color: 'var(--color-deep)',
                fontSize: '1rem',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />

            <AnimatePresence>
              {step1Text.length >= 10 && (
                <motion.button
                  type="button"
                  onClick={() => setStep(2)}
                  initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduce ? {} : { opacity: 0 }}
                  whileTap={shouldReduce ? {} : { scale: 0.97 }}
                  style={{
                    background: 'var(--color-sage)',
                    boxShadow: 'var(--shadow-glow-sage)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-inner)',
                    padding: '0.875rem 1.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  Continuar
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Step 2 — Integración */}
        {step === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                color: 'var(--color-deep)',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              ¿Qué te llevas de esta experiencia?
            </p>

            <textarea
              value={step2Text}
              onChange={e => setStep2Text(e.target.value)}
              placeholder="Comparte lo que surge..."
              autoFocus
              rows={6}
              style={{
                width: '100%',
                background: 'transparent',
                outline: 'none',
                resize: 'none',
                padding: '1rem',
                borderRadius: 'var(--radius-inner)',
                border: '2px solid var(--color-border)',
                color: 'var(--color-deep)',
                fontSize: '1rem',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />

            <motion.button
              type="button"
              onClick={() => onAdvance(step1Text + '\n\n' + step2Text)}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              disabled={step2Text.trim().length === 0}
              style={{
                background: 'var(--color-sage)',
                boxShadow: 'var(--shadow-glow-sage)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-inner)',
                padding: '0.875rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: step2Text.trim().length === 0 ? 'not-allowed' : 'pointer',
                opacity: step2Text.trim().length === 0 ? 0.4 : 1,
                alignSelf: 'flex-start',
                transition: 'opacity 0.2s ease',
              }}
            >
              Completar y continuar
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
