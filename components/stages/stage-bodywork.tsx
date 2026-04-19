'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, ExplorationRecord } from '@/lib/types';
import { synthesizeExploration } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';

type Props = {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  onAdvance: (record: ExplorationRecord) => void;
  onUpdate: (session: PatientSession) => void;
};

export function StageBodywork({ session, patient, priorSessions = [], onAdvance, onUpdate: _onUpdate }: Props) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [breathingDone, setBreathingDone] = useState(false);
  const [breathingReflection, setBreathingReflection] = useState('');

  // Step 2 state
  const [bodySensation, setBodySensation] = useState('');
  const [bodyNeed, setBodyNeed] = useState('');

  // Step 3 state
  const [bodyMessage, setBodyMessage] = useState('');

  // Synthesis state
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);

  const lastExploration = [...priorSessions]
    .reverse()
    .find(s => s.explorationRecord?.framework === 'bioenergetico')?.explorationRecord
    ?? [...priorSessions].reverse().find(s => s.explorationRecord)?.explorationRecord;

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

  const handleFinalAdvance = async () => {
    const rawData = [
      'Respiración — ' + breathingReflection,
      'Sensación corporal — ' + bodySensation,
      'Necesidad corporal — ' + bodyNeed,
      'Mensaje del cuerpo — ' + bodyMessage,
    ].join('\n\n');
    setSynthesisState('loading');
    try {
      const priorExplorations = priorSessions.filter(s => s.explorationRecord).map(s => s.explorationRecord!);
      const record = await synthesizeExploration({
        rawData,
        patient,
        conflicts: session.conflicts,
        frameworkKey: 'bioenergetico',
        frameworkName: session.frameworkMatches[0]?.name ?? 'Terapia Bioenergética',
        stage3Type: 'bodywork',
        sessionNumber: session.sessionNumber,
        priorExplorations,
      });
      setExplorationRecord(record);
      setSynthesisState('done');
    } catch {
      setSynthesisState('idle');
      onAdvance({ sessionNumber: session.sessionNumber, framework: 'bioenergetico', frameworkName: session.frameworkMatches[0]?.name ?? 'Terapia Bioenergética', stage3Type: 'bodywork', insights: [], aiReflection: '', completedAt: Date.now() });
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Fase 3 — Trabajo Bioenergético
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
          El Lenguaje del Cuerpo
        </h2>
      </div>

      {/* Continuity banner */}
      {lastExploration && lastExploration.insights.length > 0 && synthesisState === 'idle' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)' }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            Lo que exploramos en la sesión {lastExploration.sessionNumber}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
            {lastExploration.insights.map(i => (
              <span key={i.theme} style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}>
                {i.theme}
              </span>
            ))}
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
            {lastExploration.aiReflection}
          </p>
        </motion.div>
      )}

      {/* Step progress */}
      {synthesisState === 'idle' && (
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '2rem' }}>
          {[0, 1, 2, 3].map(i => (
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
      )}

      {/* Synthesis states */}
      {synthesisState === 'loading' && (
        <motion.div initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '2rem' }}>
          <AIThinking phrases={['Integrando lo explorado...', 'Escuchando al cuerpo...', 'Construyendo el mapa...']} />
        </motion.div>
      )}
      {synthesisState === 'done' && explorationRecord && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.75rem', fontWeight: 500, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lo que emergió en esta exploración
            </p>
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
              {explorationRecord.aiReflection}
            </p>
            {explorationRecord.insights.length > 0 && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {explorationRecord.insights.map((insight, i) => (
                    <motion.span
                      key={insight.theme}
                      initial={shouldReduce ? {} : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      title={insight.observation}
                      style={{ padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'var(--color-violet-light)', color: 'var(--color-violet)', cursor: 'default' }}
                    >
                      {insight.theme}
                    </motion.span>
                  ))}
                </div>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', margin: 0 }}>
                  Estas piezas se acumulan sesión a sesión para que la IA te entienda mejor
                </p>
              </div>
            )}
          </div>
          <motion.button
            type="button"
            onClick={() => onAdvance(explorationRecord)}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            style={{ background: 'var(--color-violet)', color: 'white', border: 'none', borderRadius: 'var(--radius-inner)', padding: '1rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
          >
            Continuar a la interpretación →
          </motion.button>
        </motion.div>
      )}

      {synthesisState === 'idle' && <AnimatePresence mode="wait">
        {/* Step 0 — Preparación */}
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
              Tu cuerpo tiene algo que decir
            </h3>
            <div
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                borderRadius: 'var(--radius-card)',
                padding: '1.5rem',
              }}
            >
              <p style={{ color: 'var(--color-deep)', lineHeight: 1.7, margin: 0 }}>
                El cuerpo guarda lo que la mente no siempre puede expresar. Vamos a explorar juntos qué siente tu cuerpo en este momento.
              </p>
            </div>
            <motion.button
              type="button"
              onClick={() => setStep(1)}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={btnStyle}
            >
              Estoy listo/a
            </motion.button>
          </motion.div>
        )}

        {/* Step 1 — Respiración guiada */}
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
              Respiración consciente
            </h3>
            <div
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                borderRadius: 'var(--radius-card)',
                padding: '1.5rem',
              }}
            >
              <p style={{ color: 'var(--color-deep)', lineHeight: 1.7, margin: '0 0 1.5rem' }}>
                Respira profundamente por la nariz (4 segundos), retén (4 segundos), exhala lentamente por la boca (8 segundos). Repite 3 veces.
              </p>

              {/* Animated breathing circle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <motion.div
                  style={{
                    width: '5rem',
                    height: '5rem',
                    borderRadius: '9999px',
                    background: 'var(--color-sage)',
                    opacity: 0.4,
                  }}
                  animate={shouldReduce ? {} : {
                    scale: [1, 1.3, 1.3, 1],
                    opacity: [0.4, 0.65, 0.65, 0.4],
                  }}
                  transition={{
                    duration: 16,
                    repeat: Infinity,
                    times: [0, 0.25, 0.5, 1],
                    ease: 'easeInOut',
                  }}
                />
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textAlign: 'center', margin: 0 }}>
                Inhala 4s · Retén 4s · Exhala 8s
              </p>
            </div>

            {!breathingDone ? (
              <motion.button
                type="button"
                onClick={() => setBreathingDone(true)}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                style={btnStyle}
              >
                Ya respiré 3 veces
              </motion.button>
            ) : (
              <motion.div
                initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <p style={{ color: 'var(--color-deep)', fontWeight: 500, margin: 0 }}>
                  ¿Qué cambió en tu cuerpo? ¿Cómo te sientes ahora?
                </p>
                <textarea
                  value={breathingReflection}
                  onChange={e => setBreathingReflection(e.target.value)}
                  placeholder="Describe lo que sientes..."
                  autoFocus
                  rows={4}
                  style={textareaStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
                <motion.button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={breathingReflection.trim().length === 0}
                  whileTap={shouldReduce ? {} : { scale: 0.97 }}
                  style={{
                    ...btnStyle,
                    opacity: breathingReflection.trim().length === 0 ? 0.4 : 1,
                    cursor: breathingReflection.trim().length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  Continuar
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 2 — Escaneo corporal */}
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
              ¿Dónde vive el conflicto en tu cuerpo?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--color-deep)', margin: 0, fontWeight: 500 }}>
                ¿Dónde en tu cuerpo sientes el conflicto que describiste? ¿Es calor, tensión, peso, vacío?
              </p>
              <textarea
                value={bodySensation}
                onChange={e => setBodySensation(e.target.value)}
                placeholder="Describe la sensación y su ubicación..."
                rows={4}
                style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--color-deep)', margin: 0, fontWeight: 500 }}>
                ¿Qué necesitaría esa parte de tu cuerpo para sentirse mejor?
              </p>
              <textarea
                value={bodyNeed}
                onChange={e => setBodyNeed(e.target.value)}
                placeholder="¿Qué necesita esa parte de ti?"
                rows={4}
                style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <motion.button
              type="button"
              onClick={() => setStep(3)}
              disabled={bodySensation.trim().length === 0 || bodyNeed.trim().length === 0}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                ...btnStyle,
                opacity: (bodySensation.trim().length === 0 || bodyNeed.trim().length === 0) ? 0.4 : 1,
                cursor: (bodySensation.trim().length === 0 || bodyNeed.trim().length === 0) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease',
              }}
            >
              Continuar
            </motion.button>
          </motion.div>
        )}

        {/* Step 3 — Integración */}
        {step === 3 && (
          <motion.div
            key="step-3"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-deep)', margin: 0 }}>
              El mensaje de tu cuerpo
            </h3>

            <p style={{ color: 'var(--color-deep)', margin: 0, fontWeight: 500 }}>
              ¿Qué mensaje te está enviando tu cuerpo hoy?
            </p>

            <textarea
              value={bodyMessage}
              onChange={e => setBodyMessage(e.target.value)}
              placeholder="El mensaje de mi cuerpo es..."
              autoFocus
              rows={6}
              style={textareaStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />

            <motion.button
              type="button"
              onClick={handleFinalAdvance}
              disabled={bodyMessage.trim().length === 0}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                ...btnStyle,
                opacity: bodyMessage.trim().length === 0 ? 0.4 : 1,
                cursor: bodyMessage.trim().length === 0 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease',
              }}
            >
              Completar
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>}
    </div>
  );
}
