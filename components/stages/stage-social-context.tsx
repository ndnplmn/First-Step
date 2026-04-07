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

const SIBLING_OPTIONS = [
  'Hijo/a único/a',
  'El/la mayor',
  'Intermedio/a',
  'El/la menor',
] as const;

export function StageSocialContext({ session: _session, patient: _patient, onAdvance, onUpdate: _onUpdate }: Props) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);

  // Step 0 state
  const [siblingPosition, setSiblingPosition] = useState('');
  const [familyRole, setFamilyRole] = useState('');

  // Step 1 state
  const [inferiorityMoments, setInferiorityMoments] = useState('');
  const [compensationStrategy, setCompensationStrategy] = useState('');

  // Step 2 state
  const [motivation, setMotivation] = useState('');

  const stepVariants = {
    initial: shouldReduce ? {} : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduce ? {} : { opacity: 0, y: -12 },
  };
  const transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

  const textareaStyle: React.CSSProperties = {
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
  };

  const btnStyle: React.CSSProperties = {
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
  };

  const handleFinalAdvance = () => {
    const combined = [
      `Posición entre hermanos: ${siblingPosition}`,
      `Papel en la familia de origen: ${familyRole}`,
      `Momentos de inferioridad: ${inferiorityMoments}`,
      `Estrategias de compensación: ${compensationStrategy}`,
      `Motivaciones: ${motivation}`,
    ].join('\n\n');
    onAdvance(combined);
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Fase 3 — Psicología Adleriana
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
          Contexto Social
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
        {/* Step 0 — Contexto familiar */}
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-deep)', margin: 0 }}>
              Tu historia social
            </h3>
            <p style={{ color: 'var(--color-muted)', margin: 0, lineHeight: 1.6 }}>
              Para entender tu situación, me ayudaría conocer un poco de tu historia social y familiar.
            </p>

            {/* Radio group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--color-deep)', fontWeight: 500, margin: 0 }}>
                ¿Cuál es tu lugar entre tus hermanos?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {SIBLING_OPTIONS.map(option => {
                  const selected = siblingPosition === option;
                  return (
                    <motion.button
                      key={option}
                      type="button"
                      onClick={() => setSiblingPosition(option)}
                      whileTap={shouldReduce ? {} : { scale: 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-inner)',
                        border: `2px solid ${selected ? 'var(--color-sage)' : 'var(--color-border)'}`,
                        background: selected ? 'color-mix(in srgb, var(--color-sage) 8%, transparent)' : 'transparent',
                        cursor: 'pointer',
                        color: 'var(--color-deep)',
                        fontSize: '0.9375rem',
                        textAlign: 'left',
                        transition: 'border-color 0.2s ease, background 0.2s ease',
                      }}
                    >
                      <span style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '9999px',
                        border: `2px solid ${selected ? 'var(--color-sage)' : 'var(--color-border)'}`,
                        background: selected ? 'var(--color-sage)' : 'transparent',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }} />
                      {option}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--color-deep)', fontWeight: 500, margin: 0 }}>
                ¿Cómo describías tu papel en tu familia de origen?
              </p>
              <textarea
                value={familyRole}
                onChange={e => setFamilyRole(e.target.value)}
                placeholder="Describe tu rol en la familia..."
                rows={4}
                style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <motion.button
              type="button"
              onClick={() => setStep(1)}
              disabled={siblingPosition === ''}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                ...btnStyle,
                opacity: siblingPosition === '' ? 0.4 : 1,
                cursor: siblingPosition === '' ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease',
              }}
            >
              Continuar
            </motion.button>
          </motion.div>
        )}

        {/* Step 1 — Sentimiento de pertenencia */}
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-deep)', margin: 0 }}>
              El sentimiento de pertenencia
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--color-deep)', fontWeight: 500, margin: 0 }}>
                ¿En qué momentos de tu vida te has sentido más inferior o menos capaz que los demás?
              </p>
              <textarea
                value={inferiorityMoments}
                onChange={e => setInferiorityMoments(e.target.value)}
                placeholder="Describe esos momentos..."
                autoFocus
                rows={5}
                style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--color-deep)', fontWeight: 500, margin: 0 }}>
                ¿Cómo compensaste ese sentimiento? ¿Qué estrategias desarrollaste?
              </p>
              <textarea
                value={compensationStrategy}
                onChange={e => setCompensationStrategy(e.target.value)}
                placeholder="Describe tus estrategias..."
                rows={5}
                style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <motion.button
              type="button"
              onClick={() => setStep(2)}
              disabled={inferiorityMoments.trim().length === 0 || compensationStrategy.trim().length === 0}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                ...btnStyle,
                opacity: (inferiorityMoments.trim().length === 0 || compensationStrategy.trim().length === 0) ? 0.4 : 1,
                cursor: (inferiorityMoments.trim().length === 0 || compensationStrategy.trim().length === 0) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease',
              }}
            >
              Continuar
            </motion.button>
          </motion.div>
        )}

        {/* Step 2 — Metas y motivaciones */}
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-deep)', margin: 0 }}>
              Lo que te impulsa
            </h3>

            <p style={{ color: 'var(--color-deep)', fontWeight: 500, margin: 0 }}>
              ¿Qué te impulsa en la vida? ¿Qué quieres demostrar o lograr?
            </p>

            <textarea
              value={motivation}
              onChange={e => setMotivation(e.target.value)}
              placeholder="Lo que me impulsa es..."
              autoFocus
              rows={6}
              style={textareaStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />

            <motion.button
              type="button"
              onClick={handleFinalAdvance}
              disabled={motivation.trim().length === 0}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                ...btnStyle,
                opacity: motivation.trim().length === 0 ? 0.4 : 1,
                cursor: motivation.trim().length === 0 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease',
              }}
            >
              Completar
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
