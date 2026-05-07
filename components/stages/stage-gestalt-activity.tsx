'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, ExplorationRecord } from '@/lib/types';
import { synthesizeExploration } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { useLanguage } from '@/contexts/language-context';

type Props = {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  onAdvance: (record: ExplorationRecord) => void;
  onUpdate: (session: PatientSession) => void;
};

const FALLBACK = {
  title: 'Awareness Corporal',
  description: 'Exploración consciente de las sensaciones del cuerpo',
  prompt: 'Cierra los ojos. ¿Dónde sientes esto en tu cuerpo? ¿Qué forma tiene?',
};

export function StageGestaltActivity({ session, patient, priorSessions = [], onAdvance, onUpdate: _onUpdate }: Props) {
  const shouldReduce = useReducedMotion();
  const { locale, t } = useLanguage();
  const [step, setStep] = useState(0);
  const [step1Text, setStep1Text] = useState('');
  const [step2Text, setStep2Text] = useState('');
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);

  const activity = session.gestaltActivity ?? FALLBACK;

  const lastExploration = [...priorSessions]
    .reverse()
    .find(s => s.explorationRecord?.framework === 'gestalt')?.explorationRecord
    ?? [...priorSessions].reverse().find(s => s.explorationRecord)?.explorationRecord;

  const handleFinalAdvance = async () => {
    const rawData = [
      `Actividad Gestalt: ${activity.title}`,
      `Prompt explorado: ${activity.prompt}`,
      `Respuesta del paciente: ${step1Text}`,
      `Integración: ${step2Text}`,
    ].join('\n\n');
    setSynthesisState('loading');
    try {
      const priorExplorations = priorSessions.filter(s => s.explorationRecord).map(s => s.explorationRecord!);
      const record = await synthesizeExploration({
        rawData,
        patient,
        conflicts: session.conflicts,
        frameworkKey: 'gestalt',
        frameworkName: session.frameworkMatches[0]?.name ?? 'Terapia Gestalt',
        stage3Type: 'gestalt_activity',
        sessionNumber: session.sessionNumber,
        priorExplorations,
        locale,
      });
      setExplorationRecord(record);
      setSynthesisState('done');
    } catch {
      setSynthesisState('idle');
      onAdvance({ sessionNumber: session.sessionNumber, framework: 'gestalt', frameworkName: session.frameworkMatches[0]?.name ?? 'Terapia Gestalt', stage3Type: 'gestalt_activity', insights: [], aiReflection: '', completedAt: Date.now() });
    }
  };

  const stepVariants = {
    initial: shouldReduce ? {} : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduce ? {} : { opacity: 0, y: -12 },
  };

  const transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

  const { title, description, prompt } = activity;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          {t('gestalt.label')}
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

      {/* Continuity banner */}
      {lastExploration && lastExploration.insights.length > 0 && synthesisState === 'idle' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)' }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            {t('gestalt.prior.title').replace('{n}', String(lastExploration.sessionNumber))}
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
          <AIThinking phrases={[t('gestalt.synthesis.loading.1'), t('gestalt.synthesis.loading.2'), t('gestalt.synthesis.loading.3')]} />
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
              {t('gestalt.synthesis.emerged')}
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
                  {t('gestalt.synthesis.accumulate')}
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
            {t('gestalt.advance')}
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
                {t('gestalt.therapist.guides')}
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
              {t('gestalt.step0.cta')}
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
              placeholder={t('gestalt.step1.placeholder')}
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
                  {t('gestalt.step1.cta')}
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
              {t('gestalt.step2.question')}
            </p>

            <textarea
              value={step2Text}
              onChange={e => setStep2Text(e.target.value)}
              placeholder={t('gestalt.step2.placeholder')}
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
              onClick={handleFinalAdvance}
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
              {t('gestalt.step2.cta')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>}
    </div>
  );
}
