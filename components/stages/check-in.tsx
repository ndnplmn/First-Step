'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, DiaryEntry } from '@/lib/types';
import { FloatingBar } from '@/components/ui/floating-bar';
import { VoiceFillButton } from '@/components/ui/voice-fill-button';
import { TendLogo } from '@/components/ui/logo';
import { Gear } from '@phosphor-icons/react';
import { useLanguage } from '@/contexts/language-context';

const BASE_STEPS = 4;
const ALIGNMENT_SESSION_NUMBERS = [3, 6, 9];

/* ── types ─────────────────────────────────────────────── */

interface CheckInProps {
  patient: Patient;
  session: PatientSession;
  priorSessions?: PatientSession[];
  lastDiaryEntry?: DiaryEntry | null;
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

export function CheckIn({ patient, session, priorSessions = [], lastDiaryEntry, onComplete, onViewSettings }: CheckInProps) {
  const shouldReduce = useReducedMotion();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const showAlignment = ALIGNMENT_SESSION_NUMBERS.includes(session.sessionNumber);
  const TOTAL_STEPS = showAlignment ? BASE_STEPS + 1 : BASE_STEPS;

  const lastCommitment = priorSessions
    .filter(s => s.stage >= 6 && s.explorationRecord?.actionCommitment)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.explorationRecord?.actionCommitment ?? null;

  const lastMissedIntention = priorSessions
    .filter(s => s.stage >= 6 && s.intentionOutcome === 'no' && s.sessionIntention)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.sessionIntention ?? null;

  const lastReflectionQuestion = priorSessions
    .filter(s => s.stage >= 6 && s.reflectionQuestions?.length)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.reflectionQuestions?.[0] ?? null;

  // Step 0
  const [wellbeing, setWellbeing] = useState<number | null>(null);
  // Step 1
  const [lifeChanges, setLifeChanges] = useState<string[]>([]);
  const [lifeDetail, setLifeDetail] = useState('');
  // Step 2 — commitment follow-up (only shown when there's a lastCommitment)
  const [commitmentStatus, setCommitmentStatus] = useState<'yes' | 'partial' | 'no' | null>(null);
  const [commitmentNote, setCommitmentNote] = useState('');
  // Step 3 — session intention
  const [sessionIntention, setSessionIntention] = useState('');
  // Step 4 — consultation alignment (only on sessions 3/6/9)
  const [consultationAlignment, setConsultationAlignment] = useState<'yes' | 'partial' | 'no' | null>(null);

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
      case 2: return t('checkin.step2.question');
      case 3: return t('checkin.step3.question');
      case 4: return t('checkin.alignment.question');
      default: return '';
    }
  }

  function getStepAnswer(
    s: number,
    wb: number | null,
    lc: string[],
    ld: string,
    cs: 'yes' | 'partial' | 'no' | null,
    cn: string,
    si: string,
  ): string | null {
    switch (s) {
      case 0: return wb ? WELLBEING_OPTIONS.find(o => o.value === wb)?.label ?? null : null;
      case 1: {
        if (lc.length === 0) return t('checkin.lifechange.none');
        return lc.join(', ') + (ld.trim() ? ` — ${ld.trim()}` : '');
      }
      case 2: {
        if (!cs) return null;
        const label = cs === 'yes' ? t('checkin.commitment.yes')
          : cs === 'partial' ? t('checkin.commitment.partial')
          : t('checkin.commitment.no');
        return cn.trim() ? `${label} — ${cn.trim()}` : label;
      }
      case 3: return si.trim() || t('checkin.intention.placeholder').replace('... (opcional)', '').replace('... (optional)', '').replace('... (необязательно)', '') || null;
      case 4: {
        if (!consultationAlignment) return null;
        return consultationAlignment === 'yes' ? t('checkin.alignment.yes')
          : consultationAlignment === 'partial' ? t('checkin.alignment.partial')
          : t('checkin.alignment.no');
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
    if (step === 2 && lastCommitment) return commitmentStatus !== null;
    return true; // steps 1, 3, 4 and skipped-2 are skippable
  };

  const buildUpdatedSession = (): PatientSession => ({
    ...session,
    wellbeingBefore: wellbeing ?? undefined,
    lifeChanges: lifeChanges.length > 0
      ? { categories: lifeChanges, detail: lifeDetail.trim() || undefined }
      : undefined,
    commitmentFollowUp: commitmentStatus
      ? { status: commitmentStatus, note: commitmentNote.trim() || undefined }
      : undefined,
    sessionIntention: sessionIntention.trim() || undefined,
    consultationAlignment: consultationAlignment ?? undefined,
  });

  const advanceStep = () => {
    if (step === 1 && !lastCommitment) {
      // skip commitment follow-up step if there's no prior commitment
      if (step + 2 < TOTAL_STEPS) {
        setStep(s => s + 2);
      } else {
        onComplete(buildUpdatedSession());
      }
    } else if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      onComplete(buildUpdatedSession());
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    advanceStep();
  };

  const handleSkip = () => {
    advanceStep();
  };

  const handleQuickSession = () => {
    onComplete({
      ...session,
      wellbeingBefore: wellbeing ?? undefined,
      quickSession: true,
    });
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        if ((e.target as HTMLElement).matches('textarea, input, button')) return;
        if (canProceed()) handleNext();
      }}
    >
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
            aria-label={t('dashboard.settings.aria')}
            style={{ color: 'var(--color-muted)', padding: '0.5rem' }}
          >
            <Gear size={18} aria-hidden="true" />
          </motion.button>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-[680px] mx-auto w-full px-6 pt-6 pb-48">

      {/* Prior session commitment */}
      {lastCommitment && (() => {
        const isStructured = lastCommitment.startsWith('Obstáculo:') && lastCommitment.includes(' → ');
        const parts = isStructured ? lastCommitment.split(' → ') : null;
        const obstacleText = parts ? parts[0].replace('Obstáculo: ', '') : null;
        const experimentText = parts ? parts.slice(1).join(' → ') : null;
        return (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 p-4 rounded-[var(--radius-card)] space-y-2"
            style={{ background: 'rgba(61,107,71,0.07)', borderLeft: '3px solid var(--color-sage)' }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)' }}
            >
              {t('stage3.prior.commitment')}
            </p>
            {isStructured ? (
              <div className="space-y-1.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                    {t('checkin.commitment.obstacle')}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>{obstacleText}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                    {t('checkin.commitment.experiment')}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>{experimentText}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                {lastCommitment}
              </p>
            )}
          </motion.div>
        );
      })()}

      {/* Prior session unworked intention */}
      {lastMissedIntention && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: lastCommitment ? 0.08 : 0 }}
          className="mb-6 p-4 rounded-[var(--radius-card)] space-y-1"
          style={{ background: 'rgba(107,94,158,0.06)', borderLeft: '3px solid var(--color-violet)' }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)' }}
          >
            {t('checkin.prior_intention.label')}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
            {lastMissedIntention}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {t('checkin.prior_intention.missed')}
          </p>
        </motion.div>
      )}

      {/* Recent diary entry */}
      {lastDiaryEntry && (() => {
        const daysAgo = Math.floor((Date.now() - lastDiaryEntry.createdAt) / (1000 * 60 * 60 * 24));
        if (daysAgo > 3) return null;
        return (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="mb-4 p-4 rounded-[var(--radius-card)] space-y-1"
            style={{ background: 'rgba(180,110,69,0.06)', borderLeft: '3px solid var(--color-terracotta)' }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-terracotta)' }}
            >
              {t('checkin.diary.recent.label')} · {t('checkin.diary.recent.sub').replace('{n}', String(daysAgo || 1))}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
              {lastDiaryEntry.emotion}{lastDiaryEntry.note ? ` — ${lastDiaryEntry.note}` : ''}
            </p>
          </motion.div>
        );
      })()}

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
          const answer = getStepAnswer(i, wellbeing, lifeChanges, lifeDetail, commitmentStatus, commitmentNote, sessionIntention);
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

            {/* Step 2: Commitment follow-up */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  {([
                    { status: 'yes' as const, label: t('checkin.commitment.yes') },
                    { status: 'partial' as const, label: t('checkin.commitment.partial') },
                    { status: 'no' as const, label: t('checkin.commitment.no') },
                  ]).map(({ status, label }) => (
                    <Chip
                      key={status}
                      label={label}
                      active={commitmentStatus === status}
                      onClick={() => setCommitmentStatus(status)}
                      reduce={shouldReduce}
                    />
                  ))}
                </div>
                <AnimatePresence>
                  {commitmentStatus !== null && (
                    <motion.div
                      initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={commitmentNote}
                        onChange={e => setCommitmentNote(e.target.value)}
                        placeholder={t('checkin.commitment.note')}
                        rows={2}
                        className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step 4: Consultation alignment (sessions 3/6/9) */}
            {step === 4 && showAlignment && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                  {t('checkin.alignment.step')}
                </p>
                {patient.consultationReason && (
                  <div
                    className="p-3 rounded-[var(--radius-inner)] space-y-1"
                    style={{ background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)' }}
                  >
                    <p className="text-xs font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('checkin.alignment.reason_label')}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-deep)', lineHeight: 1.5 }}>
                      {patient.consultationReason}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {([
                    { value: 'yes' as const, label: t('checkin.alignment.yes') },
                    { value: 'partial' as const, label: t('checkin.alignment.partial') },
                    { value: 'no' as const, label: t('checkin.alignment.no') },
                  ]).map(({ value, label }) => (
                    <Chip
                      key={value}
                      label={label}
                      active={consultationAlignment === value}
                      onClick={() => setConsultationAlignment(value)}
                      reduce={shouldReduce}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Session intention */}
            {step === 3 && (
              <div className="space-y-3">
                {lastReflectionQuestion && !sessionIntention && (
                  <motion.div
                    initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="p-4 rounded-[var(--radius-inner)] space-y-2"
                    style={{ background: 'rgba(61,107,71,0.06)', borderLeft: '3px solid var(--color-sage)' }}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)' }}>
                      {t('checkin.reflection.label')}
                    </p>
                    <p className="text-sm leading-relaxed italic" style={{ color: 'var(--color-deep)' }}>
                      {lastReflectionQuestion}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSessionIntention(lastReflectionQuestion)}
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-sage)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.125rem 0' }}
                    >
                      {t('checkin.reflection.use')} →
                    </button>
                  </motion.div>
                )}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={sessionIntention}
                    onChange={e => setSessionIntention(e.target.value)}
                    placeholder={t('checkin.intention.placeholder')}
                    rows={3}
                    className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)', paddingBottom: '2.75rem' }}
                  />
                  <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}>
                    <VoiceFillButton onFill={text => setSessionIntention(prev => prev ? prev + ' ' + text : text)} />
                  </div>
                </div>
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
          {(step === 1 || step === 3 || step === 4) && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('checkin.skip')}
            </button>
          )}
          {step === 0 && wellbeing !== null && wellbeing <= 2 && priorSessions.some(s => s.selectedWorkCard) && (
            <div className="pt-1 space-y-1">
              <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
                {t('checkin.quick.offer')}
              </p>
              <button
                type="button"
                onClick={handleQuickSession}
                className="w-full py-2.5 text-sm font-medium text-center rounded-xl border hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-sage)', borderColor: 'var(--color-sage)', background: 'transparent' }}
              >
                {t('checkin.quick.cta')}
              </button>
              <p className="text-[10px] text-center" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('checkin.quick.note')}
              </p>
            </div>
          )}
        </div>
      </FloatingBar>
      </div>
    </div>
  );
}
