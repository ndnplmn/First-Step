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

type AnxietySituation = {
  id: string;
  text: string;
  level: number;
};

const MUSCLE_GROUPS = ['hombros', 'manos', 'rostro', 'abdomen'] as const;

export function StageExposure({ session, patient, priorSessions = [], onAdvance, onUpdate: _onUpdate }: Props) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);

  // Step 0 state
  const [muscleGroupIndex, setMuscleGroupIndex] = useState(0);
  const [relaxationLevel, setRelaxationLevel] = useState<number | null>(null);

  // Step 1 state
  const [situations, setSituations] = useState<AnxietySituation[]>([]);
  const [newSituation, setNewSituation] = useState('');

  // Step 2 state
  const [exposureReflection, setExposureReflection] = useState('');

  // Synthesis state
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);

  const lastExploration = [...priorSessions]
    .reverse()
    .find(s => s.explorationRecord?.framework === 'conductual')?.explorationRecord
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

  const allMusclesDone = muscleGroupIndex >= MUSCLE_GROUPS.length;

  const addSituation = () => {
    if (newSituation.trim().length === 0 || situations.length >= 5) return;
    setSituations(prev => [
      ...prev,
      { id: String(Date.now()), text: newSituation.trim(), level: 5 },
    ]);
    setNewSituation('');
  };

  const updateSituationLevel = (id: string, level: number) => {
    setSituations(prev => prev.map(s => s.id === id ? { ...s, level } : s));
  };

  const lowestAnxietySituation = situations.length > 0
    ? situations.reduce((min, s) => s.level < min.level ? s : min, situations[0])
    : null;

  const handleFinalAdvance = async () => {
    const situationsSummary = situations
      .map((s, i) => `Situación ${i + 1} (ansiedad ${s.level}/10): ${s.text}`)
      .join('\n');
    const rawData = [
      `Nivel de relajación tras ejercicio: ${relaxationLevel}/5`,
      `Situaciones de ansiedad:\n${situationsSummary}`,
      `Primera exposición imaginaria (${lowestAnxietySituation?.text}):\n${exposureReflection}`,
    ].join('\n\n');
    setSynthesisState('loading');
    try {
      const priorExplorations = priorSessions.filter(s => s.explorationRecord).map(s => s.explorationRecord!);
      const record = await synthesizeExploration({
        rawData,
        patient,
        conflicts: session.conflicts,
        frameworkKey: 'conductual',
        frameworkName: session.frameworkMatches[0]?.name ?? 'Terapia Conductual',
        stage3Type: 'exposure',
        sessionNumber: session.sessionNumber,
        priorExplorations,
      });
      setExplorationRecord(record);
      setSynthesisState('done');
    } catch {
      setSynthesisState('idle');
      onAdvance({ sessionNumber: session.sessionNumber, framework: 'conductual', frameworkName: session.frameworkMatches[0]?.name ?? 'Terapia Conductual', stage3Type: 'exposure', insights: [], aiReflection: '', completedAt: Date.now() });
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Fase 3 — Terapia Conductual
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
          Exposición Gradual
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

      {/* Synthesis states */}
      {synthesisState === 'loading' && (
        <motion.div initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '2rem' }}>
          <AIThinking phrases={['Integrando lo explorado...', 'Cartografiando el conflicto...', 'Construyendo el mapa...']} />
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
            style={{ background: 'var(--color-violet)', color: 'white', border: 'none', borderRadius: 'var(--radius-inner)', padding: '1rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-card)', alignSelf: 'stretch', textAlign: 'center' }}
          >
            Continuar a la interpretación →
          </motion.button>
        </motion.div>
      )}

      {/* Step progress */}
      {synthesisState === 'idle' && <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '2rem' }}>
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
      </div>}

      {synthesisState === 'idle' && <AnimatePresence mode="wait">
        {/* Step 0 — Relajación progresiva */}
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
              Preparándonos juntos
            </h3>
            <p style={{ color: 'var(--color-muted)', margin: 0, lineHeight: 1.6 }}>
              Antes de explorar las situaciones que te generan ansiedad, vamos a aprender a relajarte profundamente.
            </p>

            {/* Muscle group exercises */}
            <AnimatePresence mode="wait">
              {!allMusclesDone ? (
                <motion.div
                  key={`muscle-${muscleGroupIndex}`}
                  initial={shouldReduce ? {} : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? {} : { opacity: 0, x: -8 }}
                  transition={{ duration: 0.3 }}
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
                  <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    {MUSCLE_GROUPS.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: '2px',
                          flex: 1,
                          borderRadius: '9999px',
                          background: i < muscleGroupIndex ? 'var(--color-sage)' : i === muscleGroupIndex ? 'color-mix(in srgb, var(--color-sage) 60%, transparent)' : 'var(--color-border)',
                          transition: 'background 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', margin: 0 }}>
                    Grupo {muscleGroupIndex + 1} de {MUSCLE_GROUPS.length}
                  </p>
                  <p style={{ color: 'var(--color-deep)', fontSize: '1.125rem', lineHeight: 1.6, margin: 0 }}>
                    Tensa tus <strong>{MUSCLE_GROUPS[muscleGroupIndex]}</strong> durante 5 segundos... ahora suéltalos.
                  </p>
                  <motion.button
                    type="button"
                    onClick={() => setMuscleGroupIndex(i => i + 1)}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    style={btnStyle}
                  >
                    {muscleGroupIndex < MUSCLE_GROUPS.length - 1 ? 'Siguiente grupo' : 'Finalizar ejercicio'}
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="relaxation-level"
                  initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  <p style={{ color: 'var(--color-deep)', fontWeight: 500, margin: 0 }}>
                    ¿Cómo te sientes ahora? ¿En qué nivel de relajación (1-5)?
                  </p>
                  <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map(n => {
                      const selected = relaxationLevel === n;
                      return (
                        <motion.button
                          key={n}
                          type="button"
                          onClick={() => setRelaxationLevel(n)}
                          whileTap={shouldReduce ? {} : { scale: 0.95 }}
                          style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: 'var(--radius-inner)',
                            border: `2px solid ${selected ? 'var(--color-sage)' : 'var(--color-border)'}`,
                            background: selected ? 'var(--color-sage)' : 'transparent',
                            color: selected ? 'white' : 'var(--color-deep)',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {n}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {allMusclesDone && relaxationLevel !== null && (
              <motion.button
                type="button"
                onClick={() => setStep(1)}
                initial={shouldReduce ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                style={btnStyle}
              >
                Continuar
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Step 1 — Jerarquía de ansiedad */}
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
              Situaciones que generan ansiedad
            </h3>
            <p style={{ color: 'var(--color-muted)', margin: 0, lineHeight: 1.6 }}>
              Pensemos en situaciones relacionadas con tu conflicto que te generen ansiedad, de menor a mayor.
            </p>

            {/* Add situation input */}
            {situations.length < 5 && (
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <input
                  type="text"
                  value={newSituation}
                  onChange={e => setNewSituation(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSituation(); } }}
                  placeholder="Describe una situación..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    outline: 'none',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-inner)',
                    border: '2px solid var(--color-border)',
                    color: 'var(--color-deep)',
                    fontSize: '0.9375rem',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
                <motion.button
                  type="button"
                  onClick={addSituation}
                  disabled={newSituation.trim().length === 0}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  style={{
                    background: 'var(--color-sage)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-inner)',
                    padding: '0.75rem 1.25rem',
                    fontWeight: 600,
                    cursor: newSituation.trim().length === 0 ? 'not-allowed' : 'pointer',
                    opacity: newSituation.trim().length === 0 ? 0.4 : 1,
                    transition: 'opacity 0.2s ease',
                    fontSize: '0.9375rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Añadir
                </motion.button>
              </div>
            )}

            {/* Situation list */}
            <AnimatePresence>
              {situations.map((situation, index) => (
                <motion.div
                  key={situation.id}
                  initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduce ? {} : { opacity: 0, height: 0 }}
                  style={{
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-card)',
                    borderRadius: 'var(--radius-card)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ color: 'var(--color-deep)', margin: 0, flex: 1, lineHeight: 1.5 }}>{situation.text}</p>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                      marginLeft: '0.5rem',
                      flexShrink: 0,
                    }}>
                      #{index + 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>Nivel de ansiedad</span>
                      <span style={{
                        color: 'var(--color-sage)',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem',
                      }}>
                        {situation.level}/10
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={situation.level}
                      onChange={e => updateSituationLevel(situation.id, Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-sage)', cursor: 'pointer' }}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {situations.length < 2 && (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', margin: 0, fontStyle: 'italic' }}>
                Añade al menos 2 situaciones para continuar
              </p>
            )}

            <motion.button
              type="button"
              onClick={() => setStep(2)}
              disabled={situations.length < 2}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                ...btnStyle,
                opacity: situations.length < 2 ? 0.4 : 1,
                cursor: situations.length < 2 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease',
              }}
            >
              Continuar
            </motion.button>
          </motion.div>
        )}

        {/* Step 2 — Primera exposición imaginaria */}
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
              Primera exposición imaginaria
            </h3>

            {lowestAnxietySituation && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1.25rem',
                  borderLeft: '3px solid var(--color-sage)',
                }}
              >
                <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', margin: '0 0 0.5rem' }}>
                  Situación con menor ansiedad ({lowestAnxietySituation.level}/10)
                </p>
                <p style={{ color: 'var(--color-deep)', margin: 0, lineHeight: 1.6 }}>
                  {lowestAnxietySituation.text}
                </p>
              </div>
            )}

            <p style={{ color: 'var(--color-deep)', margin: 0, lineHeight: 1.6 }}>
              Cierra los ojos e imagina que estás en esa situación. Cuando lo hayas hecho, cuéntame:
            </p>

            <textarea
              value={exposureReflection}
              onChange={e => setExposureReflection(e.target.value)}
              placeholder="¿Qué observaste? ¿Qué pasó con tu ansiedad?"
              autoFocus
              rows={6}
              style={textareaStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />

            <motion.button
              type="button"
              onClick={handleFinalAdvance}
              disabled={exposureReflection.trim().length === 0}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                ...btnStyle,
                opacity: exposureReflection.trim().length === 0 ? 0.4 : 1,
                cursor: exposureReflection.trim().length === 0 ? 'not-allowed' : 'pointer',
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
