'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, DiaryEntry, DiaryEmotion } from '@/lib/types';
import { db } from '@/lib/db';
import { generateId } from '@/lib/id';
import { ArrowLeft, Plus, X } from '@phosphor-icons/react';
import { detectCrisis } from '@/lib/crisis';
import { CrisisScreen } from '@/components/ui/crisis-screen';
import { useLanguage } from '@/contexts/language-context';

/* ── constants ─────────────────────────────────────────── */

const EMOTIONS_ES: DiaryEmotion[] = [
  'Alegría', 'Tristeza', 'Ansiedad', 'Calma',
  'Enojo', 'Miedo', 'Esperanza', 'Frustración',
  'Gratitud', 'Soledad', 'Confusión', 'Alivio',
];

const EMOTION_COLORS: Record<DiaryEmotion, string> = {
  'Alegría': 'var(--color-sage)',
  'Tristeza': 'var(--color-violet)',
  'Ansiedad': 'var(--color-terracotta)',
  'Calma': 'var(--color-sage)',
  'Enojo': 'var(--color-terracotta)',
  'Miedo': 'var(--color-violet)',
  'Esperanza': 'var(--color-sage)',
  'Frustración': 'var(--color-terracotta)',
  'Gratitud': 'var(--color-sage)',
  'Soledad': 'var(--color-violet)',
  'Confusión': 'var(--color-muted)',
  'Alivio': 'var(--color-sage)',
};

/* ── helpers ───────────────────────────────────────────── */

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatMonthYear(date: Date, locale: string): string {
  const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', ru: 'ru-RU' };
  return date.toLocaleDateString(localeMap[locale] ?? 'es-ES', { month: 'long', year: 'numeric' });
}

/* ── component ─────────────────────────────────────────── */

interface DiaryProps {
  patient: Patient;
  onBack: () => void;
}

export function Diary({ patient, onBack }: DiaryProps) {
  const shouldReduce = useReducedMotion();
  const { t, locale } = useLanguage();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  const INTENSITY_LABELS = [
    t('diary.intensity.1'),
    t('diary.intensity.2'),
    t('diary.intensity.3'),
    t('diary.intensity.4'),
    t('diary.intensity.5'),
  ];

  const WEEKDAY_LABELS = t('diary.weekdays').split(',');

  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    if (diff <= 0) return t('diary.time.now');
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return mins <= 1 ? t('diary.time.moment') : t('diary.time.mins').replace('{n}', String(mins));
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 24) return t('diary.time.hours').replace('{n}', String(hours));
    const days = Math.floor(diff / 86_400_000);
    if (days === 1) return t('diary.time.yesterday');
    return t('diary.time.days').replace('{n}', String(days));
  }

  useEffect(() => {
    db.getDiaryEntries().then(setEntries);
  }, []);
  const [isAdding, setIsAdding] = useState(false);
  const [addStep, setAddStep] = useState(0);
  const [draft, setDraft] = useState<Partial<DiaryEntry>>({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [showCrisis, setShowCrisis] = useState(false);

  const today = new Date();
  const refDate = new Date(today);
  refDate.setDate(today.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(refDate);

  const entryDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const d = new Date(e.createdAt);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [entries]);

  // Last 30 days emotion frequency
  const emotionFrequency = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const counts: Partial<Record<DiaryEmotion, number>> = {};
    for (const e of entries) {
      if (e.createdAt < cutoff) continue;
      counts[e.emotion] = (counts[e.emotion] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const topEmotions = useMemo(() => {
    return Object.entries(emotionFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as [DiaryEmotion, number][];
  }, [emotionFrequency]);

  const maxCount = topEmotions[0]?.[1] ?? 1;

  const hasEntryOnDay = (d: Date) => entryDatesSet.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

  /* ── form logic ── */

  const startAdding = () => {
    setDraft({});
    setAddStep(0);
    setIsAdding(true);
  };

  const cancelAdding = () => setIsAdding(false);

  const handleSubmit = async () => {
    if (!draft.emotion || !draft.intensity) return;
    const entry: DiaryEntry = {
      id: generateId(),
      patientId: patient.id,
      emotion: draft.emotion,
      intensity: draft.intensity,
      triggers: draft.triggers?.trim() || undefined,
      copingUsed: draft.copingUsed?.trim() || undefined,
      note: draft.note?.trim() || undefined,
      createdAt: Date.now(),
    };
    await db.saveDiaryEntry(entry);
    setEntries(prev => [entry, ...prev]);
    setIsAdding(false);
  };

  const canProceed = () => {
    if (addStep === 0) return !!draft.emotion;
    if (addStep === 1) return !!draft.intensity;
    return true; // steps 2, 3 are optional
  };

  const handleNext = () => {
    // Crisis check on text fields before advancing
    const textToCheck = [draft.triggers, draft.note].filter(Boolean).join(' ');
    if (textToCheck && detectCrisis(textToCheck)) {
      setShowCrisis(true);
      return;
    }
    if (addStep === 3) { handleSubmit(); return; }
    setAddStep(s => s + 1);
  };

  /* ── render form step ── */

  const renderFormStep = () => {
    switch (addStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              {t('diary.form.step0')}
            </p>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS_ES.map(em => (
                <motion.button
                  key={em}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, emotion: em }))}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: draft.emotion === em ? EMOTION_COLORS[em] : 'var(--color-surface)',
                    color: draft.emotion === em ? 'white' : 'var(--color-deep)',
                    boxShadow: draft.emotion === em ? 'var(--shadow-glow-sage)' : 'var(--shadow-card)',
                  }}
                >
                  {em}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              {t('diary.form.step1')}
            </p>
            <div className="flex flex-wrap gap-2">
              {INTENSITY_LABELS.map((label, i) => {
                const value = i + 1;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, intensity: value }))}
                    whileTap={shouldReduce ? {} : { scale: 0.95 }}
                    className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: draft.intensity === value ? 'var(--color-deep)' : 'var(--color-surface)',
                      color: draft.intensity === value ? 'white' : 'var(--color-deep)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              {t('diary.form.step2')}
            </p>
            <textarea
              value={draft.triggers || ''}
              onChange={e => setDraft(d => ({ ...d, triggers: e.target.value }))}
              placeholder={t('diary.form.placeholder2')}
              rows={3}
              className="w-full rounded-[var(--radius-inner)] px-4 py-3 text-sm resize-none"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-deep)',
                border: '1px solid var(--color-border)',
                outline: 'none',
              }}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              {t('diary.form.step3')}
            </p>
            <textarea
              value={draft.note || ''}
              onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
              placeholder={t('diary.form.placeholder3')}
              rows={3}
              className="w-full rounded-[var(--radius-inner)] px-4 py-3 text-sm resize-none"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-deep)',
                border: '1px solid var(--color-border)',
                outline: 'none',
              }}
            />
          </div>
        );
    }
  };

  const entryCountLabel = entries.length === 0
    ? t('diary.empty.count')
    : entries.length === 1
      ? t('diary.count.one')
      : t('diary.count.many').replace('{n}', String(entries.length));

  /* ── main render ── */

  return (
    <>
    <AnimatePresence>
      {showCrisis && <CrisisScreen onDismiss={() => setShowCrisis(false)} />}
    </AnimatePresence>
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
        <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
          <motion.button
            type="button"
            onClick={onBack}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="flex items-center gap-2"
            style={{ color: 'var(--color-muted)' }}
          >
            <ArrowLeft size={16} />
            <span className="text-sm">{t('diary.back')}</span>
          </motion.button>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)' }}
          >
            {patient.name}
          </p>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-6 pt-8 pb-24">
        {/* Title */}
        <div className="mb-6">
          <h1
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 6vw, 48px)',
              color: 'var(--color-deep)',
            }}
          >
            {t('diary.title')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
            {entryCountLabel}
          </p>
        </div>

        {/* Emotion trend (last 30 days) */}
        {topEmotions.length > 0 && (
          <div
            className="rounded-[var(--radius-card)] p-4 mb-6"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              {t('diary.trend.label')}
            </p>
            <div className="space-y-2.5">
              {topEmotions.map(([emotion, count]) => (
                <div key={emotion} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: EMOTION_COLORS[emotion] }}
                  />
                  <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--color-deep)' }}>
                    {emotion}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <motion.div
                      initial={shouldReduce ? false : { width: 0 }}
                      animate={{ width: `${(count / maxCount) * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full"
                      style={{ background: EMOTION_COLORS[emotion] }}
                    />
                  </div>
                  <span
                    className="text-xs w-4 text-right flex-shrink-0"
                    style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar strip */}
        <div
          className="rounded-[var(--radius-card)] p-4 mb-6"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <motion.button
              type="button"
              onClick={() => setWeekOffset(w => w - 1)}
              whileTap={shouldReduce ? {} : { scale: 0.95 }}
              className="text-sm px-2 py-1"
              style={{ color: 'var(--color-muted)' }}
              aria-label={t('diary.week.prev')}
            >
              <span aria-hidden="true">←</span>
            </motion.button>
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
              aria-live="polite"
              aria-atomic="true"
            >
              {formatMonthYear(weekDays[0], locale)}
            </p>
            <motion.button
              type="button"
              onClick={() => setWeekOffset(w => w + 1)}
              whileTap={shouldReduce ? {} : { scale: 0.95 }}
              className="text-sm px-2 py-1"
              style={{ color: weekOffset >= 0 ? 'var(--color-border)' : 'var(--color-muted)' }}
              disabled={weekOffset >= 0}
              aria-label={t('diary.week.next')}
              aria-disabled={weekOffset >= 0}
            >
              <span aria-hidden="true">→</span>
            </motion.button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, today);
              const hasEntry = hasEntryOnDay(d);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                    {WEEKDAY_LABELS[i]}
                  </span>
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
                    style={{
                      background: isToday ? 'var(--color-deep)' : 'transparent',
                      color: isToday ? 'white' : 'var(--color-deep)',
                    }}
                  >
                    {d.getDate()}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: hasEntry ? 'var(--color-sage)' : 'transparent' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Add form (overlay) */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="rounded-[var(--radius-card)] p-6 mb-6 space-y-5"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(s => (
                    <div
                      key={s}
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: s <= addStep ? '24px' : '8px',
                        background: s <= addStep ? 'var(--color-sage)' : 'var(--color-border)',
                      }}
                    />
                  ))}
                </div>
                <motion.button
                  type="button"
                  onClick={cancelAdding}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  style={{ color: 'var(--color-muted)' }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={addStep}
                  initial={shouldReduce ? false : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderFormStep()}
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-3 justify-end">
                {addStep > 0 && (
                  <motion.button
                    type="button"
                    onClick={() => setAddStep(s => s - 1)}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    className="px-4 py-2.5 rounded-[var(--radius-inner)] text-sm"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {t('diary.form.back')}
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  whileTap={shouldReduce ? {} : { scale: 0.97 }}
                  className="px-5 py-2.5 rounded-[var(--radius-inner)] text-sm font-semibold text-white transition-opacity"
                  style={{
                    background: 'var(--color-sage)',
                    boxShadow: 'var(--shadow-glow-sage)',
                    opacity: canProceed() ? 1 : 0.4,
                  }}
                >
                  {addStep === 3 ? t('diary.form.save') : t('diary.form.next')}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entry timeline */}
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={shouldReduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 280, damping: 22 }}
              className="p-4 rounded-[var(--radius-card)]"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: EMOTION_COLORS[entry.emotion] }}
                  />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                    {entry.emotion}
                  </p>
                </div>
                <p
                  className="text-xs flex-shrink-0"
                  style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {formatRelativeTime(entry.createdAt)}
                </p>
              </div>

              {/* Intensity dots */}
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <div
                    key={v}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: v <= entry.intensity ? EMOTION_COLORS[entry.emotion] : 'var(--color-border)',
                    }}
                  />
                ))}
              </div>

              {entry.triggers && (
                <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
                  {entry.triggers}
                </p>
              )}
              {entry.note && (
                <p className="text-sm mt-1 italic" style={{ color: 'var(--color-muted)' }}>
                  {entry.note}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {entries.length === 0 && !isAdding && (
          <div className="text-center pt-12 space-y-3">
            <p style={{ color: 'var(--color-muted)' }}>
              {t('diary.empty.title')}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {t('diary.empty.body')}
            </p>
          </div>
        )}
      </main>

      {/* FAB */}
      {!isAdding && (
        <motion.button
          type="button"
          onClick={startAdding}
          initial={shouldReduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
          whileTap={shouldReduce ? {} : { scale: 0.9 }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white z-50"
          style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
          aria-label={t('diary.fab.aria')}
        >
          <Plus size={24} weight="bold" />
        </motion.button>
      )}
    </div>
    </>
  );
}
