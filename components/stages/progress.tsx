'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { ArrowLeft } from '@phosphor-icons/react';
import {
  PHQ9_SEVERITY_LABELS, PHQ9_SEVERITY_COLORS,
  GAD7_SEVERITY_LABELS, GAD7_SEVERITY_COLORS,
} from '@/lib/clinical';

/* ── constants ─────────────────────────────────────────── */

const WELLBEING_LABELS: Record<number, string> = {
  1: 'Muy mal', 2: 'Mal', 3: 'Regular', 4: 'Bien', 5: 'Muy bien',
};

const FRAMEWORK_COLORS: Record<string, { bg: string; text: string }> = {
  freudiano:    { bg: 'rgba(122,110,158,0.12)', text: 'var(--color-violet)' },
  bioenergetico: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
  adleriano:    { bg: 'rgba(196,163,90,0.12)', text: 'var(--color-terracotta)' },
  gestalt:      { bg: 'rgba(193,127,89,0.12)', text: 'var(--color-terracotta)' },
  conductual:   { bg: 'rgba(107,94,82,0.1)', text: 'var(--color-deep)' },
};

/* ── helpers ───────────────────────────────────────────── */

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ── component ─────────────────────────────────────────── */

interface ProgressProps {
  patient: Patient;
  sessions: PatientSession[];
  onBack: () => void;
}

export function Progress({ patient, sessions, onBack }: ProgressProps) {
  const shouldReduce = useReducedMotion();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort sessions most recent first
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  // Stats
  const completedSessions = sorted.filter(s => s.stage === 6);
  const avgWellbeing = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + (s.wellbeingAfter ?? 0), 0) /
      completedSessions.filter(s => s.wellbeingAfter).length
    : 0;
  const avgLabel = avgWellbeing > 0 ? WELLBEING_LABELS[Math.round(avgWellbeing)] ?? '' : '';

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
            <span className="text-sm">Mis sesiones</span>
          </motion.button>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)' }}
          >
            {patient.name}
          </p>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-6 pt-8 pb-16">
        {/* Title */}
        <div className="mb-8">
          <h1
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 6vw, 48px)',
              color: 'var(--color-deep)',
            }}
          >
            Tu camino
          </h1>
          <p
            className="mt-1"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-muted)' }}
          >
            {sorted.length} {sorted.length === 1 ? 'sesión' : 'sesiones'}
            {avgLabel ? ` · Promedio: ${avgLabel}` : ''}
          </p>
        </div>

        {/* Timeline */}
        {sorted.length === 0 ? (
          <div className="text-center pt-12 space-y-3">
            <p style={{ color: 'var(--color-muted)' }}>Aún no tienes sesiones completadas</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Cada sesión será un paso en tu camino
            </p>
          </div>
        ) : (
          <div>
            {sorted.map((session, i) => {
              const isLast = i === sorted.length - 1;
              const isExpanded = expandedId === session.id;
              const primary = session.frameworkMatches?.[0];
              const primaryColor = primary ? FRAMEWORK_COLORS[primary.key] : null;

              const wbBefore = session.wellbeingBefore ? WELLBEING_LABELS[session.wellbeingBefore] : null;
              const wbAfter = session.wellbeingAfter ? WELLBEING_LABELS[session.wellbeingAfter] : null;

              const improved = (session.wellbeingAfter ?? 0) > (session.wellbeingBefore ?? 0);
              const declined = (session.wellbeingAfter ?? 0) < (session.wellbeingBefore ?? 0);

              return (
                <motion.div
                  key={session.id}
                  initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
                  className="flex gap-4"
                >
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-1">
                    <div
                      className="w-3 h-3 rounded-full border-2"
                      style={{
                        borderColor: session.stage === 6 ? 'var(--color-sage)' : 'var(--color-muted)',
                        background: session.stage === 6 ? 'var(--color-sage)' : 'transparent',
                      }}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 min-h-[40px]" style={{ background: 'var(--color-border)' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <motion.button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      whileTap={shouldReduce ? {} : { scale: 0.99 }}
                      className="w-full text-left"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)' }}
                        >
                          Sesión {session.sessionNumber}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          {formatDate(session.createdAt)}
                        </p>
                      </div>
                    </motion.button>

                    {/* Wellbeing arrow */}
                    {(wbBefore || wbAfter) && (
                      <p className="text-xs mt-1.5" style={{
                        color: improved ? 'var(--color-sage)' : declined ? 'var(--color-terracotta)' : 'var(--color-muted)',
                      }}>
                        {wbBefore ?? '—'} → {wbAfter ?? '—'}
                      </p>
                    )}

                    {/* Conflict chips */}
                    {session.conflicts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {session.conflicts.slice(0, 3).map(c => (
                          <span
                            key={c.id}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: FRAMEWORK_COLORS[c.frameworkKey]?.bg ?? 'var(--color-surface)',
                              color: FRAMEWORK_COLORS[c.frameworkKey]?.text ?? 'var(--color-muted)',
                            }}
                          >
                            {c.synthesized}
                          </span>
                        ))}
                        {session.conflicts.length > 3 && (
                          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            +{session.conflicts.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Primary framework */}
                    {primary && (
                      <p className="text-xs mt-1.5" style={{ color: primaryColor?.text ?? 'var(--color-muted)' }}>
                        {primary.name}
                      </p>
                    )}

                    {/* Clinical score badges */}
                    {(session.phq9 || session.gad7) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {session.phq9 && (() => {
                          const c = PHQ9_SEVERITY_COLORS[session.phq9.severity];
                          return (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: c.bg, color: c.text }}
                            >
                              PHQ-9: {session.phq9.score} · {PHQ9_SEVERITY_LABELS[session.phq9.severity]}
                            </span>
                          );
                        })()}
                        {session.gad7 && (() => {
                          const c = GAD7_SEVERITY_COLORS[session.gad7.severity];
                          return (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: c.bg, color: c.text }}
                            >
                              GAD-7: {session.gad7.score} · {GAD7_SEVERITY_LABELS[session.gad7.severity]}
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-3 p-4 rounded-[var(--radius-inner)] space-y-3"
                            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                          >
                            {session.narrativeSummary && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-widest mb-1"
                                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                                  Resumen
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                                  {session.narrativeSummary}
                                </p>
                              </div>
                            )}
                            {session.interpretation?.text && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-widest mb-1"
                                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                                  Interpretación
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                                  {session.interpretation.text.length > 200
                                    ? session.interpretation.text.slice(0, 200) + '...'
                                    : session.interpretation.text}
                                </p>
                              </div>
                            )}
                            {session.reflectionQuestions && session.reflectionQuestions.length > 0 && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-widest mb-1"
                                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                                  Reflexiones
                                </p>
                                {session.reflectionQuestions.map((q, qi) => (
                                  <p key={qi} className="text-sm leading-relaxed pl-3 mt-1"
                                    style={{ color: 'var(--color-deep)', borderLeft: '2px solid var(--color-sage)' }}>
                                    {q}
                                  </p>
                                ))}
                              </div>
                            )}

                            {(session.phq9 || session.gad7) && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-widest mb-2"
                                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                                  Evaluación clínica
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {session.phq9 && (() => {
                                    const c = PHQ9_SEVERITY_COLORS[session.phq9.severity];
                                    return (
                                      <div className="p-3 rounded-xl" style={{ background: c.bg }}>
                                        <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
                                          style={{ color: c.text, fontFamily: 'var(--font-mono)' }}>
                                          PHQ-9 · Depresión
                                        </p>
                                        <p className="text-xl font-semibold" style={{ color: c.text }}>
                                          {session.phq9.score}
                                          <span className="text-xs font-normal ml-1" style={{ opacity: 0.8 }}>/ 27</span>
                                        </p>
                                        <p className="text-xs" style={{ color: c.text, opacity: 0.85 }}>
                                          {PHQ9_SEVERITY_LABELS[session.phq9.severity]}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  {session.gad7 && (() => {
                                    const c = GAD7_SEVERITY_COLORS[session.gad7.severity];
                                    return (
                                      <div className="p-3 rounded-xl" style={{ background: c.bg }}>
                                        <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
                                          style={{ color: c.text, fontFamily: 'var(--font-mono)' }}>
                                          GAD-7 · Ansiedad
                                        </p>
                                        <p className="text-xl font-semibold" style={{ color: c.text }}>
                                          {session.gad7.score}
                                          <span className="text-xs font-normal ml-1" style={{ opacity: 0.8 }}>/ 21</span>
                                        </p>
                                        <p className="text-xs" style={{ color: c.text, opacity: 0.85 }}>
                                          {GAD7_SEVERITY_LABELS[session.gad7.severity]}
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
