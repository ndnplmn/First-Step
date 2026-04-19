'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  PHQ9_QUESTIONS, GAD7_QUESTIONS, FREQUENCY_OPTIONS,
  scorePHQ9, scoreGAD7,
} from '@/lib/clinical';
import type { PatientSession } from '@/lib/types';

interface ClinicalAssessmentProps {
  session: PatientSession;
  onComplete: (updated: PatientSession) => void;
}

type Phase = 'phq9' | 'gad7';

const PHASE_CONFIG = {
  phq9: {
    id: 'phq9' as Phase,
    index: 1,
    total: 2,
    title: 'Bienestar emocional',
    subtitle: 'PHQ-9 — Estado de ánimo',
    instruction: 'Durante las últimas 2 semanas, ¿con qué frecuencia te han molestado los siguientes problemas?',
    questions: PHQ9_QUESTIONS as readonly string[],
    count: PHQ9_QUESTIONS.length,
  },
  gad7: {
    id: 'gad7' as Phase,
    index: 2,
    total: 2,
    title: 'Ansiedad',
    subtitle: 'GAD-7 — Nivel de ansiedad',
    instruction: 'Durante las últimas 2 semanas, ¿con qué frecuencia te han molestado los siguientes problemas?',
    questions: GAD7_QUESTIONS as readonly string[],
    count: GAD7_QUESTIONS.length,
  },
};

function AnswerRow({
  selected,
  onSelect,
  shouldReduce,
}: {
  selected: number | null;
  onSelect: (v: number) => void;
  shouldReduce: boolean | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 mt-3">
      {FREQUENCY_OPTIONS.map(opt => {
        const active = selected === opt.value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            whileTap={shouldReduce ? {} : { scale: 0.94 }}
            className="flex flex-col items-center py-3 rounded-xl text-center transition-all"
            style={{
              background: active ? 'var(--color-sage)' : 'var(--color-surface)',
              boxShadow: active ? 'var(--shadow-glow-sage)' : 'var(--shadow-card)',
              border: active ? 'none' : '1px solid var(--color-border)',
              transition: 'background 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <span
              className="text-lg font-semibold leading-none"
              style={{ color: active ? 'white' : 'var(--color-deep)' }}
            >
              {opt.short}
            </span>
            <span
              className="text-[9px] leading-tight mt-1 px-1"
              style={{ color: active ? 'rgba(255,255,255,0.85)' : 'var(--color-muted)' }}
            >
              {opt.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function ClinicalAssessment({ session, onComplete }: ClinicalAssessmentProps) {
  const shouldReduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('phq9');
  const [phq9Answers, setPhq9Answers] = useState<(number | null)[]>(
    Array(PHQ9_QUESTIONS.length).fill(null)
  );
  const [gad7Answers, setGad7Answers] = useState<(number | null)[]>(
    Array(GAD7_QUESTIONS.length).fill(null)
  );

  const config = PHASE_CONFIG[phase];
  const answers = phase === 'phq9' ? phq9Answers : gad7Answers;
  const setAnswer = phase === 'phq9'
    ? (i: number, v: number) => setPhq9Answers(prev => { const n = [...prev]; n[i] = v; return n; })
    : (i: number, v: number) => setGad7Answers(prev => { const n = [...prev]; n[i] = v; return n; });

  const allAnswered = answers.every(a => a !== null);
  const answeredCount = answers.filter(a => a !== null).length;

  const handleContinue = () => {
    if (!allAnswered) return;
    if (phase === 'phq9') {
      setPhase('gad7');
      return;
    }
    // Both complete — score and finish
    const phq9Result = scorePHQ9(phq9Answers as number[]);
    const gad7Result = scoreGAD7(gad7Answers as number[]);
    onComplete({ ...session, phq9: phq9Result, gad7: gad7Result });
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--color-glass-heavy)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-[680px] mx-auto px-6 py-3">
          {/* Phase progress */}
          <div className="flex gap-1 mb-2">
            {(['phq9', 'gad7'] as Phase[]).map((p, i) => (
              <div
                key={p}
                className="h-[3px] flex-1 rounded-full transition-all duration-400"
                style={{
                  background: i < (['phq9', 'gad7'].indexOf(phase))
                    ? 'var(--color-deep)'
                    : p === phase
                    ? 'var(--color-sage)'
                    : 'var(--color-border)',
                }}
              />
            ))}
          </div>
          <div className="flex items-baseline justify-between">
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)' }}
            >
              {config.title}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {config.index} de {config.total}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-6 pt-6 pb-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={shouldReduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            {/* Instrument label */}
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {config.subtitle}
            </p>
            <p
              className="text-base leading-snug mb-6"
              style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)' }}
            >
              {config.instruction}
            </p>

            {/* Questions */}
            <div className="space-y-5">
              {config.questions.map((q, i) => (
                <motion.div
                  key={`${phase}-${i}`}
                  initial={shouldReduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-[var(--radius-card)]"
                  style={{
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-card)',
                    border: answers[i] !== null ? '1px solid var(--color-sage)' : '1px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <p className="text-sm leading-snug" style={{ color: 'var(--color-deep)' }}>
                    <span
                      className="text-xs mr-1.5"
                      style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {i + 1}.
                    </span>
                    {q}
                  </p>
                  <AnswerRow
                    selected={answers[i]}
                    onSelect={v => setAnswer(i, v)}
                    shouldReduce={shouldReduce}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4"
        style={{
          background: 'linear-gradient(to top, var(--color-base) 80%, transparent)',
        }}
      >
        <div className="max-w-[680px] mx-auto space-y-2">
          {!allAnswered && (
            <p
              className="text-xs text-center"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {answeredCount} de {config.count} respondidas
            </p>
          )}
          <motion.button
            type="button"
            onClick={handleContinue}
            disabled={!allAnswered}
            whileTap={allAnswered && !shouldReduce ? { scale: 0.97 } : {}}
            className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide disabled:opacity-40"
            style={{
              background: allAnswered ? 'var(--color-sage)' : 'var(--color-muted)',
              boxShadow: allAnswered ? 'var(--shadow-glow-sage)' : 'none',
              transition: 'background 0.2s, box-shadow 0.2s, opacity 0.2s',
            }}
          >
            {phase === 'phq9' ? 'Siguiente →' : 'Comenzar sesión →'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
