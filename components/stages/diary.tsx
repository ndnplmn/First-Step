'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, DiaryEntry, DiaryEmotion } from '@/lib/types';
import { db } from '@/lib/db';
import { generateId } from '@/lib/id';
import { ArrowLeft, Plus, X, CaretLeft, CaretRight, BookOpen, Lightning, Clipboard, Check } from '@phosphor-icons/react';
import { detectCrisis } from '@/lib/crisis';
import { CrisisScreen } from '@/components/ui/crisis-screen';
import { useLanguage } from '@/contexts/language-context';

/* ── constants ─────────────────────────────────────────── */

const EMOTIONS_ES: DiaryEmotion[] = [
  'Alegría', 'Tristeza', 'Ansiedad', 'Calma',
  'Enojo', 'Miedo', 'Esperanza', 'Frustración',
  'Gratitud', 'Soledad', 'Confusión', 'Alivio',
];

const EMOTION_KEY_MAP: Record<DiaryEmotion, string> = {
  'Alegría': 'alegria',
  'Tristeza': 'tristeza',
  'Ansiedad': 'ansiedad',
  'Calma': 'calma',
  'Enojo': 'enojo',
  'Miedo': 'miedo',
  'Esperanza': 'esperanza',
  'Frustración': 'frustracion',
  'Gratitud': 'gratitud',
  'Soledad': 'soledad',
  'Confusión': 'confusion',
  'Alivio': 'alivio',
};

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

const EMOTION_RAW: Record<DiaryEmotion, string> = {
  'Alegría': '61,107,71',
  'Tristeza': '107,94,158',
  'Ansiedad': '180,110,69',
  'Calma': '61,107,71',
  'Enojo': '180,110,69',
  'Miedo': '107,94,158',
  'Esperanza': '61,107,71',
  'Frustración': '180,110,69',
  'Gratitud': '61,107,71',
  'Soledad': '107,94,158',
  'Confusión': '100,100,100',
  'Alivio': '61,107,71',
};

/* ── helpers ─────────────────────────────────────────────── */

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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const INTENSITY_LABELS = [
    t('diary.intensity.1'),
    t('diary.intensity.2'),
    t('diary.intensity.3'),
    t('diary.intensity.4'),
    t('diary.intensity.5'),
  ];

  const WEEKDAY_LABELS = t('diary.weekdays').split(',');

  const emotionDisplay = useCallback(
    (em: DiaryEmotion): string => {
      const key = EMOTION_KEY_MAP[em];
      return key ? t(`diary.emotion.${key}`) : em;
    },
    [t]
  );

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

  const dayEmotionMap = useMemo(() => {
    const map = new Map<string, DiaryEmotion>();
    for (const e of entries) {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, e.emotion);
    }
    return map;
  }, [entries]);

  const entryDatesSet = useMemo(() => new Set(dayEmotionMap.keys()), [dayEmotionMap]);

  const emotionFrequency = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const counts: Partial<Record<DiaryEmotion, number>> = {};
    for (const e of entries) {
      if (e.createdAt < cutoff) continue;
      counts[e.emotion] = (counts[e.emotion] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const topEmotions = useMemo(
    () =>
      Object.entries(emotionFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) as [DiaryEmotion, number][],
    [emotionFrequency]
  );

  const maxCount = topEmotions[0]?.[1] ?? 1;

  const getDayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const hasEntryOnDay = (d: Date) => entryDatesSet.has(getDayKey(d));
  const emotionOnDay = (d: Date): DiaryEmotion | undefined => dayEmotionMap.get(getDayKey(d));

  /* ── copy to clipboard ── */
  const copyEntry = (entry: DiaryEntry) => {
    const parts = [
      emotionDisplay(entry.emotion),
      INTENSITY_LABELS[entry.intensity - 1],
      entry.triggers,
      entry.note,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join('\n')).then(() => {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  /* ── form logic ── */
  const startAdding = () => { setDraft({}); setAddStep(0); setIsAdding(true); };
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
    return true;
  };

  const handleNext = () => {
    const textToCheck = [draft.triggers, draft.note].filter(Boolean).join(' ');
    if (textToCheck && detectCrisis(textToCheck)) { setShowCrisis(true); return; }
    if (addStep === 3) { handleSubmit(); return; }
    setAddStep(s => s + 1);
  };

  /* ── form steps ── */
  const renderFormStep = () => {
    switch (addStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.125rem' }}>
              {t('diary.form.step0')}
            </p>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS_ES.map(em => {
                const selected = draft.emotion === em;
                const color = EMOTION_COLORS[em];
                const raw = EMOTION_RAW[em];
                return (
                  <motion.button
                    key={em}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, emotion: em }))}
                    whileTap={shouldReduce ? {} : { scale: 0.95 }}
                    className="px-4 py-2.5 rounded-full text-sm font-medium"
                    style={{
                      background: selected ? color : `rgba(${raw}, 0.08)`,
                      color: selected ? 'white' : color,
                      border: `1px solid rgba(${raw}, ${selected ? 0 : 0.2})`,
                      boxShadow: selected ? 'var(--shadow-glow-sage)' : 'none',
                    }}
                  >
                    {emotionDisplay(em)}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.125rem' }}>
              {t('diary.form.step1')}
            </p>
            <div className="space-y-2">
              {INTENSITY_LABELS.map((label, i) => {
                const value = i + 1;
                const selected = draft.intensity === value;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, intensity: value }))}
                    whileTap={shouldReduce ? {} : { scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: selected ? 'rgba(61,107,71,0.08)' : 'var(--color-base)',
                      border: `1px solid ${selected ? 'var(--color-sage)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(value / 5) * 100}%`,
                          background: selected ? 'var(--color-sage)' : 'var(--color-muted)',
                          opacity: selected ? 1 : 0.5,
                        }}
                      />
                    </div>
                    <span className="text-sm w-24 text-right" style={{ color: selected ? 'var(--color-sage)' : 'var(--color-muted)' }}>
                      {label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.125rem' }}>
              {t('diary.form.step2')}
            </p>
            <textarea
              value={draft.triggers || ''}
              onChange={e => setDraft(d => ({ ...d, triggers: e.target.value }))}
              placeholder={t('diary.form.placeholder2')}
              rows={4}
              className="w-full rounded-[var(--radius-inner)] px-4 py-3 text-sm resize-none"
              style={{
                background: 'var(--color-base)',
                color: 'var(--color-deep)',
                border: '1px solid var(--color-border)',
                outline: 'none',
                lineHeight: 1.7,
              }}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.125rem' }}>
              {t('diary.form.step3')}
            </p>
            <textarea
              value={draft.note || ''}
              onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
              placeholder={t('diary.form.placeholder3')}
              rows={4}
              className="w-full rounded-[var(--radius-inner)] px-4 py-3 text-sm resize-none"
              style={{
                background: 'var(--color-base)',
                color: 'var(--color-deep)',
                border: '1px solid var(--color-border)',
                outline: 'none',
                lineHeight: 1.7,
                fontStyle: 'italic',
              }}
            />
          </div>
        );
    }
  };

  const entryCountLabel =
    entries.length === 0
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
              className="text-sm"
              style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            >
              {patient.name}
            </p>
          </div>
        </header>

        <main className="max-w-[680px] mx-auto px-6 pt-8 pb-24">

          {/* Editorial title */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <div
              style={{
                width: 28,
                height: 2,
                background: 'var(--color-sage)',
                opacity: 0.55,
                marginBottom: 14,
                borderRadius: 2,
              }}
            />
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 'clamp(2rem, 7vw, 3rem)',
                color: 'var(--color-deep)',
                lineHeight: 1.1,
              }}
            >
              {t('diary.title')}
            </h1>
            <p
              className="mt-2"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--color-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {entryCountLabel}
            </p>
          </motion.div>

          {/* Emotion trend (last 30 days) */}
          {topEmotions.length > 0 && (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
              className="rounded-[var(--radius-card)] p-5 mb-5"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <p
                className="mb-4"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {t('diary.trend.label')}
              </p>
              <div className="space-y-3">
                {topEmotions.map(([emotion, count], idx) => (
                  <div key={emotion} className="flex items-center gap-3">
                    <span
                      className="text-xs font-medium flex-shrink-0"
                      style={{ color: EMOTION_COLORS[emotion], width: 92 }}
                    >
                      {emotionDisplay(emotion)}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <motion.div
                        initial={shouldReduce ? false : { width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ duration: 0.7, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ background: EMOTION_COLORS[emotion] }}
                      />
                    </div>
                    <span
                      className="text-xs w-5 text-right flex-shrink-0"
                      style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Calendar strip */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
            className="rounded-[var(--radius-card)] p-4 mb-6"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <motion.button
                type="button"
                onClick={() => setWeekOffset(w => w - 1)}
                whileTap={shouldReduce ? {} : { scale: 0.9 }}
                className="w-7 h-7 flex items-center justify-center rounded-full"
                style={{ color: 'var(--color-muted)', background: 'var(--color-base)' }}
                aria-label={t('diary.week.prev')}
              >
                <CaretLeft size={14} weight="bold" />
              </motion.button>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
                aria-live="polite"
              >
                {formatMonthYear(weekDays[0], locale)}
              </p>
              <motion.button
                type="button"
                onClick={() => setWeekOffset(w => w + 1)}
                whileTap={shouldReduce ? {} : { scale: 0.9 }}
                className="w-7 h-7 flex items-center justify-center rounded-full"
                style={{
                  color: weekOffset >= 0 ? 'var(--color-border)' : 'var(--color-muted)',
                  background: 'var(--color-base)',
                }}
                disabled={weekOffset >= 0}
                aria-label={t('diary.week.next')}
              >
                <CaretRight size={14} weight="bold" />
              </motion.button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, today);
                const hasEntry = hasEntryOnDay(d);
                const em = emotionOnDay(d);
                const dotColor = em ? EMOTION_COLORS[em] : 'var(--color-sage)';
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.5625rem',
                        color: 'var(--color-muted)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {WEEKDAY_LABELS[i]}
                    </span>
                    <span
                      className="w-8 h-8 flex items-center justify-center rounded-full"
                      style={{
                        background: isToday ? 'var(--color-deep)' : 'transparent',
                        color: isToday ? 'white' : 'var(--color-deep)',
                        fontSize: '0.8125rem',
                        fontWeight: isToday ? 600 : 400,
                      }}
                    >
                      {d.getDate()}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: hasEntry ? dotColor : 'transparent',
                        transition: 'transform 0.2s',
                        transform: hasEntry ? 'scale(1)' : 'scale(0)',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Add form */}
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={shouldReduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="rounded-[var(--radius-card)] p-6 mb-6"
                style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map(s => (
                      <motion.div
                        key={s}
                        animate={{ width: s === addStep ? 24 : s < addStep ? 16 : 8 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="h-1 rounded-full"
                        style={{
                          background: s <= addStep ? 'var(--color-sage)' : 'var(--color-border)',
                          opacity: s < addStep ? 0.45 : 1,
                        }}
                      />
                    ))}
                  </div>
                  <motion.button
                    type="button"
                    onClick={cancelAdding}
                    whileTap={shouldReduce ? {} : { scale: 0.95 }}
                    className="w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ color: 'var(--color-muted)', background: 'var(--color-base)' }}
                  >
                    <X size={16} />
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

                <div className="flex items-center justify-between mt-6">
                  <div className="flex gap-1">
                    {addStep > 0 && (
                      <motion.button
                        type="button"
                        onClick={() => setAddStep(s => s - 1)}
                        whileTap={shouldReduce ? {} : { scale: 0.97 }}
                        className="text-sm px-3 py-2"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {t('diary.form.back')}
                      </motion.button>
                    )}
                    {(addStep === 2 || addStep === 3) && (
                      <motion.button
                        type="button"
                        onClick={handleNext}
                        whileTap={shouldReduce ? {} : { scale: 0.97 }}
                        className="text-sm px-3 py-2"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {t('diary.form.skip')}
                      </motion.button>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    className="px-6 py-2.5 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
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
            {entries.map((entry, i) => {
              const emotionColor = EMOTION_COLORS[entry.emotion];
              const emotionRaw = EMOTION_RAW[entry.emotion];
              const isCopied = copiedId === entry.id;
              return (
                <motion.div
                  key={entry.id}
                  initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 280, damping: 22 }}
                  className="rounded-[var(--radius-card)] overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, rgba(${emotionRaw}, 0.05) 0%, var(--color-surface) 55%)`,
                    boxShadow: 'var(--shadow-card)',
                    borderLeft: `3px solid ${emotionColor}`,
                  }}
                >
                  <div className="p-4">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: '1.0625rem',
                          color: emotionColor,
                          lineHeight: 1.2,
                        }}
                      >
                        {emotionDisplay(entry.emotion)}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                        <p
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.625rem',
                            color: 'var(--color-muted)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {formatRelativeTime(entry.createdAt)}
                        </p>
                        <motion.button
                          type="button"
                          onClick={() => copyEntry(entry)}
                          whileTap={shouldReduce ? {} : { scale: 0.9 }}
                          className="w-6 h-6 flex items-center justify-center rounded-md"
                          style={{
                            color: isCopied ? 'var(--color-sage)' : 'var(--color-muted)',
                            background: 'rgba(0,0,0,0.04)',
                          }}
                          aria-label={t('diary.entry.copy')}
                        >
                          {isCopied ? <Check size={12} weight="bold" /> : <Clipboard size={12} />}
                        </motion.button>
                      </div>
                    </div>

                    {/* Intensity bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="flex-1 h-1 rounded-full overflow-hidden"
                        style={{ background: 'var(--color-border)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(entry.intensity / 5) * 100}%`,
                            background: emotionColor,
                            opacity: 0.65,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.5625rem',
                          color: 'var(--color-muted)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          flexShrink: 0,
                        }}
                      >
                        {INTENSITY_LABELS[entry.intensity - 1]}
                      </span>
                    </div>

                    {/* Triggers */}
                    {entry.triggers && (
                      <div className="flex items-start gap-2 mb-1.5">
                        <Lightning
                          size={11}
                          weight="fill"
                          style={{ color: emotionColor, opacity: 0.65, marginTop: 3, flexShrink: 0 }}
                        />
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                          {entry.triggers}
                        </p>
                      </div>
                    )}

                    {/* Note */}
                    {entry.note && (
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          color: 'var(--color-muted)',
                          fontStyle: 'italic',
                          paddingLeft: entry.triggers ? 19 : 0,
                          marginTop: entry.triggers ? 0 : 0,
                        }}
                      >
                        {entry.note}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Empty state */}
          {entries.length === 0 && !isAdding && (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center text-center pt-16 pb-8"
            >
              <div
                className="flex items-center justify-center mb-6"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(61,107,71,0.1)',
                }}
              >
                <BookOpen size={28} style={{ color: 'var(--color-sage)' }} />
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: '1.25rem',
                  color: 'var(--color-deep)',
                  marginBottom: 8,
                }}
              >
                {t('diary.empty.title')}
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-muted)', maxWidth: 260 }}
              >
                {t('diary.empty.body')}
              </p>
            </motion.div>
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
