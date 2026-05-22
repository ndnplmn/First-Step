'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { ArrowLeft, ChartLine, CaretDown } from '@phosphor-icons/react';
import {
  PHQ9_SEVERITY_COLORS,
  GAD7_SEVERITY_COLORS,
} from '@/lib/clinical';
import { useLanguage } from '@/contexts/language-context';

const FRAMEWORK_COLORS: Record<string, { bg: string; text: string }> = {
  freudiano:     { bg: 'rgba(122,110,158,0.12)', text: 'var(--color-violet)' },
  bioenergetico: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
  adleriano:     { bg: 'rgba(196,163,90,0.12)',  text: 'var(--color-terracotta)' },
  gestalt:       { bg: 'rgba(193,127,89,0.12)',  text: 'var(--color-terracotta)' },
  conductual:    { bg: 'rgba(107,94,82,0.1)',    text: 'var(--color-deep)' },
};

/* ── helpers ─────────────────────────────────────────────── */

function formatDate(timestamp: number, locale: string): string {
  const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', ru: 'ru-RU' };
  return new Date(timestamp).toLocaleDateString(localeMap[locale] ?? 'es-ES', {
    day: 'numeric', month: 'short',
  });
}

/* ── WellbeingSpark ─────────────────────────────────────── */

function WellbeingSpark({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const W = 100;
  const H = 52;
  const PAD_X = 4;
  const PAD_Y = 6;
  const minY = 1;
  const maxY = 5;
  const xs = points.map((_, i) =>
    PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2)
  );
  const ys = points.map(v =>
    PAD_Y + (1 - (v - minY) / (maxY - minY)) * (H - PAD_Y * 2)
  );
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: H, display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wb-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-sage)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-sage)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#wb-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-sage)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {xs.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={ys[i]}
          r="2.5"
          fill="var(--color-sage)"
        />
      ))}
    </svg>
  );
}

/* ── ClinicalSpark ──────────────────────────────────────── */

interface ClinicalSparkProps {
  points: number[];
  maxY: number;
  color: string;
  id: string;
}

function ClinicalSpark({ points, maxY, color, id }: ClinicalSparkProps) {
  if (points.length < 2) return null;
  const W = 100;
  const H = 36;
  const PAD_X = 4;
  const PAD_Y = 4;
  // Invert Y so lower score (improvement) renders higher on the chart
  const xs = points.map((_, i) =>
    PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2)
  );
  const ys = points.map(v =>
    PAD_Y + (v / maxY) * (H - PAD_Y * 2)
  );
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;
  const gradId = `cs-fill-${id}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: H, display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {xs.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={ys[i]}
          r="2"
          fill={color}
        />
      ))}
    </svg>
  );
}

/* ── component ─────────────────────────────────────────── */

interface ProgressProps {
  patient: Patient;
  sessions: PatientSession[];
  onBack: () => void;
  isLoading?: boolean;
}

export function Progress({ patient, sessions, onBack, isLoading }: ProgressProps) {
  const shouldReduce = useReducedMotion();
  const { t, locale } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const WELLBEING_LABELS: Record<number, string> = {
    1: t('progress.wellbeing.1'),
    2: t('progress.wellbeing.2'),
    3: t('progress.wellbeing.3'),
    4: t('progress.wellbeing.4'),
    5: t('progress.wellbeing.5'),
  };

  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  const completedSessions = sorted.filter(s => s.stage === 6);

  const chronological = useMemo(
    () => [...completedSessions].sort((a, b) => a.createdAt - b.createdAt),
    [completedSessions]
  );

  const wellbeingPoints = useMemo(
    () => chronological.filter(s => s.wellbeingAfter).map(s => s.wellbeingAfter!),
    [chronological]
  );

  const phq9Points = useMemo(
    () => [...sorted].reverse().filter(s => s.phq9).map(s => s.phq9!.score),
    [sorted]
  );

  const gad7Points = useMemo(
    () => [...sorted].reverse().filter(s => s.gad7).map(s => s.gad7!.score),
    [sorted]
  );

  const avgWellbeing = wellbeingPoints.length > 0
    ? wellbeingPoints.reduce((s, v) => s + v, 0) / wellbeingPoints.length
    : 0;

  const netImprovement = wellbeingPoints.length > 1
    ? wellbeingPoints[wellbeingPoints.length - 1] - wellbeingPoints[0]
    : null;

  const latestPHQ9 = sorted.find(s => s.phq9)?.phq9 ?? null;
  const latestGAD7 = sorted.find(s => s.gad7)?.gad7 ?? null;

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
        <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
          <motion.button
            type="button"
            onClick={onBack}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="flex items-center gap-2"
            style={{ color: 'var(--color-muted)' }}
          >
            <ArrowLeft size={16} />
            <span className="text-sm">{t('progress.back')}</span>
          </motion.button>
          <p
            className="text-sm"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
          >
            {patient.name}
          </p>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-6 pt-8 pb-16">

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
            {t('progress.title')}
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
            {sorted.length === 1
              ? t('progress.sessions.one')
              : t('progress.sessions.many').replace('{n}', String(sorted.length))}
          </p>
        </motion.div>

        {/* Stats strip */}
        {completedSessions.length > 0 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
            className="grid grid-cols-3 gap-3 mb-5"
          >
            {/* Sessions */}
            <div
              className="rounded-[var(--radius-card)] p-4 flex flex-col gap-1"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {t('progress.stats.sessions')}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  color: 'var(--color-deep)',
                  lineHeight: 1,
                  fontWeight: 600,
                }}
              >
                {completedSessions.length}
              </p>
            </div>

            {/* Avg wellbeing */}
            <div
              className="rounded-[var(--radius-card)] p-4 flex flex-col gap-1"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {t('progress.stats.wellbeing')}
              </p>
              {avgWellbeing > 0 ? (
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    color: 'var(--color-sage)',
                    lineHeight: 1,
                    fontWeight: 600,
                  }}
                >
                  {avgWellbeing.toFixed(1)}
                  <span style={{ fontSize: '0.875rem', opacity: 0.6, fontFamily: 'var(--font-body)', fontWeight: 400 }}> / 5</span>
                </p>
              ) : (
                <p style={{ fontSize: '1.5rem', color: 'var(--color-muted)', lineHeight: 1 }}>—</p>
              )}
            </div>

            {/* Net improvement */}
            <div
              className="rounded-[var(--radius-card)] p-4 flex flex-col gap-1"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {t('progress.stats.improvement')}
              </p>
              {netImprovement !== null ? (
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    lineHeight: 1,
                    fontWeight: 600,
                    color: netImprovement > 0
                      ? 'var(--color-sage)'
                      : netImprovement < 0
                        ? 'var(--color-terracotta)'
                        : 'var(--color-muted)',
                  }}
                >
                  {netImprovement > 0 ? '+' : ''}{netImprovement}
                </p>
              ) : (
                <p style={{ fontSize: '1.5rem', color: 'var(--color-muted)', lineHeight: 1 }}>—</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Wellbeing sparkline */}
        {wellbeingPoints.length >= 2 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.13, ease: 'easeOut' }}
            className="rounded-[var(--radius-card)] px-5 pt-4 pb-3 mb-5"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {t('progress.trend.label')}
              </p>
              <div className="flex items-center gap-1.5">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)' }}>
                  {wellbeingPoints[0]}
                </span>
                <div style={{ width: 16, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-sage)' }}>
                  {wellbeingPoints[wellbeingPoints.length - 1]}
                </span>
              </div>
            </div>
            <WellbeingSpark points={wellbeingPoints} />
          </motion.div>
        )}

        {/* Latest clinical scores */}
        {(latestPHQ9 || latestGAD7) && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.17, ease: 'easeOut' }}
            className="mb-8 grid grid-cols-2 gap-3"
          >
            {latestPHQ9 && (() => {
              const c = PHQ9_SEVERITY_COLORS[latestPHQ9.severity];
              const pct = (latestPHQ9.score / 27) * 100;
              return (
                <div
                  className="p-4 rounded-[var(--radius-card)]"
                  style={{ background: c.bg, boxShadow: 'var(--shadow-card)' }}
                >
                  <p
                    className="mb-2"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: c.text, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >
                    {t('progress.clinical.phq9')}
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: c.text, lineHeight: 1 }}>
                    {latestPHQ9.score}
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.65 }}> /27</span>
                  </p>
                  <div className="mt-2 mb-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.text, opacity: 0.5 }} />
                  </div>
                  {phq9Points.length >= 2 && (
                    <div className="mt-2 mb-1">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: c.text, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                        {t('progress.clinical.trend')}
                      </p>
                      <ClinicalSpark points={phq9Points} maxY={27} color={c.text} id="phq9" />
                    </div>
                  )}
                  <p style={{ fontSize: '0.6875rem', color: c.text, opacity: 0.85 }}>
                    {t(`clinical.severity.${latestPHQ9.severity}`)}
                  </p>
                </div>
              );
            })()}
            {latestGAD7 && (() => {
              const c = GAD7_SEVERITY_COLORS[latestGAD7.severity];
              const pct = (latestGAD7.score / 21) * 100;
              return (
                <div
                  className="p-4 rounded-[var(--radius-card)]"
                  style={{ background: c.bg, boxShadow: 'var(--shadow-card)' }}
                >
                  <p
                    className="mb-2"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: c.text, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >
                    {t('progress.clinical.gad7')}
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: c.text, lineHeight: 1 }}>
                    {latestGAD7.score}
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.65 }}> /21</span>
                  </p>
                  <div className="mt-2 mb-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.text, opacity: 0.5 }} />
                  </div>
                  {gad7Points.length >= 2 && (
                    <div className="mt-2 mb-1">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: c.text, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                        {t('progress.clinical.trend')}
                      </p>
                      <ClinicalSpark points={gad7Points} maxY={21} color={c.text} id="gad7" />
                    </div>
                  )}
                  <p style={{ fontSize: '0.6875rem', color: c.text, opacity: 0.85 }}>
                    {t(`clinical.severity.${latestGAD7.severity}`)}
                  </p>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Timeline */}
        {sorted.length === 0 ? (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center text-center pt-16 pb-8"
          >
            <div
              className="flex items-center justify-center mb-6"
              style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(61,107,71,0.1)' }}
            >
              <ChartLine size={28} style={{ color: 'var(--color-sage)' }} />
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
              {t('progress.empty.title')}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)', maxWidth: 260 }}>
              {t('progress.empty.body')}
            </p>
          </motion.div>
        ) : (
          <div>
            {sorted.map((session, i) => {
              const isLast = i === sorted.length - 1;
              const isExpanded = expandedId === session.id;
              const isComplete = session.stage === 6;
              const primary = session.frameworkMatches?.[0];
              const fwColor = primary ? FRAMEWORK_COLORS[primary.key] : null;

              const wbBefore = session.wellbeingBefore ?? null;
              const wbAfter = session.wellbeingAfter ?? null;
              const delta = wbBefore && wbAfter ? wbAfter - wbBefore : null;

              const insight = session.interpretation?.text ?? session.narrativeSummary ?? '';
              const snippet = insight.length > 90 ? insight.slice(0, 90).trimEnd() + '…' : insight;

              return (
                <motion.div
                  key={session.id}
                  initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 280, damping: 22 }}
                  className="flex gap-4"
                >
                  {/* Timeline axis */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-4">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: isComplete ? 'var(--color-sage)' : 'transparent',
                        border: `2px solid ${isComplete ? 'var(--color-sage)' : 'var(--color-border)'}`,
                        flexShrink: 0,
                      }}
                    />
                    {!isLast && (
                      <div
                        className="w-px flex-1 min-h-[48px] mt-1"
                        style={{
                          background: `linear-gradient(to bottom, ${isComplete ? 'var(--color-sage)' : 'var(--color-border)'} 0%, var(--color-border) 100%)`,
                          opacity: isComplete ? 0.35 : 1,
                        }}
                      />
                    )}
                  </div>

                  {/* Session card */}
                  <div className="flex-1 pb-5">
                    <motion.button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      whileTap={shouldReduce ? {} : { scale: 0.99 }}
                      className="w-full text-left"
                    >
                      <div
                        className="rounded-[var(--radius-card)] p-4"
                        style={{
                          background: 'var(--color-surface)',
                          boxShadow: 'var(--shadow-card)',
                          borderLeft: isComplete ? '3px solid var(--color-sage)' : '3px solid var(--color-border)',
                        }}
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontSize: '1rem',
                                color: 'var(--color-deep)',
                                lineHeight: 1.2,
                              }}
                            >
                              {t('progress.session.label').replace('{n}', String(session.sessionNumber))}
                            </p>
                            {!isComplete && (
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
                                {t('progress.session.progress')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.625rem',
                                color: 'var(--color-muted)',
                              }}
                            >
                              {formatDate(session.createdAt, locale)}
                            </p>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CaretDown size={12} style={{ color: 'var(--color-muted)' }} />
                            </motion.div>
                          </div>
                        </div>

                        {/* Meta row: framework + wellbeing delta */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {primary && (
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-medium"
                              style={{
                                background: fwColor?.bg ?? 'var(--color-surface)',
                                color: fwColor?.text ?? 'var(--color-muted)',
                              }}
                            >
                              {primary.name}
                            </span>
                          )}
                          {delta !== null && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--color-muted)' }}>
                                {wbBefore}
                              </span>
                              <span style={{ color: 'var(--color-border)', fontSize: '0.625rem' }}>→</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--color-deep)' }}>
                                {wbAfter}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                  color: delta > 0
                                    ? 'var(--color-sage)'
                                    : delta < 0
                                      ? 'var(--color-terracotta)'
                                      : 'var(--color-muted)',
                                }}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Insight snippet */}
                        {snippet && !isExpanded && (
                          <p
                            className="text-xs leading-relaxed mt-2.5"
                            style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}
                          >
                            {snippet}
                          </p>
                        )}
                      </div>
                    </motion.button>

                    {/* Expanded panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-2 p-4 rounded-[var(--radius-inner)] space-y-4"
                            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                          >
                            {session.narrativeSummary && (
                              <div>
                                <p
                                  className="mb-1.5"
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                                >
                                  {t('progress.section.summary')}
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                                  {session.narrativeSummary}
                                </p>
                              </div>
                            )}

                            {session.interpretation?.text && (
                              <div>
                                <p
                                  className="mb-1.5"
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                                >
                                  {t('progress.section.interpretation')}
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                                  {session.interpretation.text}
                                </p>
                              </div>
                            )}

                            {session.reflectionQuestions && session.reflectionQuestions.length > 0 && (
                              <div>
                                <p
                                  className="mb-2"
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                                >
                                  {t('progress.section.reflections')}
                                </p>
                                <div className="space-y-2">
                                  {session.reflectionQuestions.map((q, qi) => (
                                    <p
                                      key={qi}
                                      className="text-sm leading-relaxed pl-3"
                                      style={{
                                        color: 'var(--color-deep)',
                                        borderLeft: '2px solid var(--color-sage)',
                                      }}
                                    >
                                      {q}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(session.phq9 || session.gad7) && (
                              <div>
                                <p
                                  className="mb-2"
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                                >
                                  {t('progress.section.clinical')}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {session.phq9 && (() => {
                                    const c = PHQ9_SEVERITY_COLORS[session.phq9.severity];
                                    return (
                                      <div className="p-3 rounded-xl" style={{ background: c.bg }}>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: c.text, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                                          PHQ-9
                                        </p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: c.text, lineHeight: 1 }}>
                                          {session.phq9.score}
                                          <span style={{ fontSize: '0.625rem', fontWeight: 400, opacity: 0.7 }}>/27</span>
                                        </p>
                                        <p style={{ fontSize: '0.6875rem', color: c.text, opacity: 0.85, marginTop: 2 }}>
                                          {t(`clinical.severity.${session.phq9.severity}`)}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  {session.gad7 && (() => {
                                    const c = GAD7_SEVERITY_COLORS[session.gad7.severity];
                                    return (
                                      <div className="p-3 rounded-xl" style={{ background: c.bg }}>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: c.text, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                                          GAD-7
                                        </p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: c.text, lineHeight: 1 }}>
                                          {session.gad7.score}
                                          <span style={{ fontSize: '0.625rem', fontWeight: 400, opacity: 0.7 }}>/21</span>
                                        </p>
                                        <p style={{ fontSize: '0.6875rem', color: c.text, opacity: 0.85, marginTop: 2 }}>
                                          {t(`clinical.severity.${session.gad7.severity}`)}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
