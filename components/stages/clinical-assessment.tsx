'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { scorePHQ9, scoreGAD7 } from '@/lib/clinical';
import { useLanguage } from '@/contexts/language-context';
import type { PatientSession } from '@/lib/types';

interface ClinicalAssessmentProps {
  session: PatientSession;
  onComplete: (updated: PatientSession) => void;
}

type Phase = 'intro' | 'phq9' | 'gad7';

function AnswerRow({
  selected,
  onSelect,
  shouldReduce,
  labels,
}: {
  selected: number | null;
  onSelect: (v: number) => void;
  shouldReduce: boolean | null;
  labels: { short: string; label: string }[];
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 mt-3">
      {labels.map((opt, value) => {
        const active = selected === value;
        return (
          <motion.button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
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
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>('intro');
  const [phq9Answers, setPhq9Answers] = useState<(number | null)[]>(Array(9).fill(null));
  const [gad7Answers, setGad7Answers] = useState<(number | null)[]>(Array(7).fill(null));

  const freqLabels = [
    { short: t('assessment.freq.0.short'), label: t('assessment.freq.0.label') },
    { short: t('assessment.freq.1.short'), label: t('assessment.freq.1.label') },
    { short: t('assessment.freq.2.short'), label: t('assessment.freq.2.label') },
    { short: t('assessment.freq.3.short'), label: t('assessment.freq.3.label') },
  ];

  const phq9Questions = [
    t('assessment.phq9.q0'), t('assessment.phq9.q1'), t('assessment.phq9.q2'),
    t('assessment.phq9.q3'), t('assessment.phq9.q4'), t('assessment.phq9.q5'),
    t('assessment.phq9.q6'), t('assessment.phq9.q7'), t('assessment.phq9.q8'),
  ];
  const gad7Questions = [
    t('assessment.gad7.q0'), t('assessment.gad7.q1'), t('assessment.gad7.q2'),
    t('assessment.gad7.q3'), t('assessment.gad7.q4'), t('assessment.gad7.q5'),
    t('assessment.gad7.q6'),
  ];

  const phaseConfig = {
    phq9: {
      index: 1, total: 2,
      title: t('assessment.phq9.title'),
      subtitle: t('assessment.phq9.subtitle'),
      instruction: t('assessment.phq9.instruction'),
      questions: phq9Questions,
    },
    gad7: {
      index: 2, total: 2,
      title: t('assessment.gad7.title'),
      subtitle: t('assessment.gad7.subtitle'),
      instruction: t('assessment.gad7.instruction'),
      questions: gad7Questions,
    },
  };

  const config = phase !== 'intro' ? phaseConfig[phase] : null;
  const answers = phase === 'phq9' ? phq9Answers : gad7Answers;
  const setAnswer = (i: number, v: number) => {
    if (phase === 'phq9') setPhq9Answers(prev => { const n = [...prev]; n[i] = v; return n; });
    else setGad7Answers(prev => { const n = [...prev]; n[i] = v; return n; });
  };

  const allAnswered = phase !== 'intro' && answers.every(a => a !== null);
  const answeredCount = phase !== 'intro' ? answers.filter(a => a !== null).length : 0;

  const handleContinue = () => {
    if (phase === 'intro') { setPhase('phq9'); return; }
    if (!allAnswered) return;
    if (phase === 'phq9') { setPhase('gad7'); return; }
    const phq9Result = scorePHQ9(phq9Answers as number[]);
    const gad7Result = scoreGAD7(gad7Answers as number[]);
    onComplete({ ...session, phq9: phq9Result, gad7: gad7Result });
  };

  if (phase === 'intro') {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--color-base)' }}
      >
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-[480px] w-full space-y-6"
        >
          <div
            className="p-6 rounded-[var(--radius-card)] space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {t('assessment.intro.title')}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                color: 'var(--color-deep)',
                lineHeight: 1.3,
              }}
            >
              {t('assessment.intro.body')}
            </p>
          </div>
          <motion.button
            type="button"
            onClick={handleContinue}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
            style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
          >
            {t('assessment.intro.cta')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-base)' }}>
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
          <div className="flex gap-1 mb-2">
            {(['phq9', 'gad7'] as const).map((p, i) => (
              <div
                key={p}
                className="h-[3px] flex-1 rounded-full transition-all duration-400"
                style={{
                  background: i < (['phq9', 'gad7'].indexOf(phase as 'phq9' | 'gad7'))
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
              {config!.title}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {config!.index} {t('assessment.of')} {config!.total}
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
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {config!.subtitle}
            </p>
            <p
              className="text-base leading-snug mb-6"
              style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)' }}
            >
              {config!.instruction}
            </p>

            <div className="space-y-5">
              {config!.questions.map((q, i) => (
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
                    labels={freqLabels}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4"
        style={{ background: 'linear-gradient(to top, var(--color-base) 80%, transparent)' }}
      >
        <div className="max-w-[680px] mx-auto space-y-2">
          {!allAnswered && (
            <p
              className="text-xs text-center"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {t('assessment.answered')
                .replace('{n}', String(answeredCount))
                .replace('{count}', String(config!.questions.length))}
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
            {phase === 'phq9' ? t('assessment.next') : t('assessment.start')}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
