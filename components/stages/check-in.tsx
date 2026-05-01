'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { FloatingBar } from '@/components/ui/floating-bar';
import { VoiceFillButton } from '@/components/ui/voice-fill-button';
import { TendLogo } from '@/components/ui/logo';
import { Gear } from '@phosphor-icons/react';
import { useLanguage } from '@/contexts/language-context';

const TOTAL_STEPS = 2;

/* ── types ─────────────────────────────────────────────── */

interface CheckInProps {
  patient: Patient;
  session: PatientSession;
  onComplete: (session: PatientSession) => void;
  onViewSettings: () => void;
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

export function CheckIn({ patient, session, onComplete, onViewSettings }: CheckInProps) {
  const shouldReduce = useReducedMotion();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  // Step 0
  const [wellbeing, setWellbeing] = useState<number | null>(null);
  // Step 1
  const [lifeChanges, setLifeChanges] = useState<string[]>([]);
  const [lifeDetail, setLifeDetail] = useState('');

  const WELLBEING_OPTIONS = [
    { value: 1, label: t('checkin.wellbeing.1') },
    { value: 2, label: t('checkin.wellbeing.2') },
    { value: 3, label: t('checkin.wellbeing.3') },
    { value: 4, label: t('checkin.wellbeing.4') },
    { value: 5, label: t('checkin.wellbeing.5') },
  ];

  const LIFE_CHANGE_OPTIONS = [
    t('checkin.lifechange.work'),
    t('checkin.lifechange.home'),
    t('checkin.lifechange.relationship'),
    t('checkin.lifechange.health'),
    t('checkin.lifechange.loss'),
    t('checkin.lifechange.family'),
    t('checkin.lifechange.money'),
    t('checkin.lifechange.other'),
  ];

  function getStepQuestion(s: number): string {
    switch (s) {
      case 0: return t('checkin.step0.question');
      case 1: return t('checkin.step1.question');
      default: return '';
    }
  }

  function getStepAnswer(
    s: number,
    wb: number | null,
    lc: string[],
    ld: string,
  ): string | null {
    switch (s) {
      case 0: return wb ? WELLBEING_OPTIONS.find(o => o.value === wb)?.label ?? null : null;
      case 1: {
        if (lc.length === 0) return t('checkin.lifechange.none');
        return lc.join(', ') + (ld.trim() ? ` — ${ld.trim()}` : '');
      }
      default: return null;
    }
  }

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
    <div className="min-h-dvh flex flex-col">
      {/* Sticky glass header — matches Dashboard */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--color-glass-heavy)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
          <TendLogo size={26} />
          <motion.button
            type="button"
            onClick={onViewSettings}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            aria-label="Ajustes"
            style={{ color: 'var(--color-muted)', padding: '0.5rem' }}
          >
            <Gear size={18} aria-hidden="true" />
          </motion.button>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-[680px] mx-auto w-full px-6 pt-6 pb-48">
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
          const answer = getStepAnswer(i, wellbeing, lifeChanges, lifeDetail);
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
                {getStepQuestion(i)}
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
              {getStepQuestion(step)}
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
                      <div style={{ position: 'relative' }}>
                        <textarea
                          value={lifeDetail}
                          onChange={e => setLifeDetail(e.target.value)}
                          placeholder={t('checkin.lifechange.detail')}
                          rows={3}
                          className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)', paddingBottom: '2.75rem' }}
                          onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                        />
                        <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}>
                          <VoiceFillButton onFill={text => setLifeDetail(prev => prev ? prev + ' ' + text : text)} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
            {step === TOTAL_STEPS - 1 ? t('checkin.start') : t('checkin.next')}
          </motion.button>
          {step === 1 && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('checkin.skip')}
            </button>
          )}
        </div>
      </FloatingBar>
      </div>
    </div>
  );
}
