'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { ArrowLeft, Brain, Clock, User } from '@phosphor-icons/react';

const THEORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  psychoanalytic: { bg: 'var(--color-violet-light)', text: 'var(--color-violet)', label: 'Psicoanalítica' },
  cbt: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)', label: 'Cognitivo-Conductual' },
  gestalt: { bg: 'rgba(193,127,89,0.12)', text: 'var(--color-terracotta)', label: 'Gestalt' },
  systemic: { bg: 'rgba(107,94,82,0.1)', text: 'var(--color-deep)', label: 'Sistémica Familiar' },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <h3
        className="text-xs font-medium uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
      >
        {label}
      </h3>
      {children}
    </motion.section>
  );
}

interface PatientRecordProps {
  patient: Patient;
  sessions: PatientSession[];
  onBack: () => void;
}

export function PatientRecord({ patient, sessions, onBack }: PatientRecordProps) {
  const [activeSessionIdx, setActiveSessionIdx] = useState(sessions.length > 0 ? sessions.length - 1 : 0);
  const session = sessions[activeSessionIdx];

  const theory = session?.theoryMatch ? THEORY_COLORS[session.theoryMatch.key] : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-base)' }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-40 px-6 py-4 flex items-center gap-4"
        style={{
          background: 'var(--color-glass)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <motion.button
          type="button"
          onClick={onBack}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          <ArrowLeft size={16} />
          Expedientes
        </motion.button>

        <div className="flex-1">
          <h1
            className="leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(18px, 3vw, 24px)',
              color: 'var(--color-deep)',
            }}
          >
            {patient.name}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            {patient.id}
          </p>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-6 py-8 space-y-8">
        {/* Patient info chips */}
        <div className="flex flex-wrap gap-3">
          {[
            { icon: <User size={13} />, label: `${patient.age} años, ${patient.gender}` },
            { icon: <Clock size={13} />, label: formatDate(patient.createdAt) },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)' }}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>

        {/* Session tabs — only if multiple sessions */}
        {sessions.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {sessions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSessionIdx(i)}
                className="px-4 py-2 rounded-full text-xs font-medium transition-all"
                style={{
                  background: activeSessionIdx === i ? 'var(--color-deep)' : 'var(--color-surface)',
                  color: activeSessionIdx === i ? 'white' : 'var(--color-muted)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                Sesión {s.sessionNumber}
              </button>
            ))}
          </div>
        )}

        {!session && (
          <p style={{ color: 'var(--color-muted)' }}>No hay sesiones registradas.</p>
        )}

        {session && (
          <div className="space-y-6">
            {/* Teoria dominante */}
            {session.theoryMatch && theory && (
              <Section label="Teoría dominante">
                <div className="flex flex-wrap gap-3 items-center">
                  <span
                    className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                    style={{ background: theory.bg, color: theory.text }}
                  >
                    <Brain size={14} />
                    {theory.label}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                    {session.theoryMatch.subCategory}
                  </span>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {Math.round(session.theoryMatch.confidence * 100)}% confianza
                  </span>
                </div>
              </Section>
            )}

            {/* Conflictos */}
            {session.conflicts.length > 0 && (
              <Section label="Conflictos">
                <div className="space-y-2">
                  {session.conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl"
                      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                        {c.synthesized}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                        "{c.raw}"
                      </p>
                      <p className="text-xs mt-1" style={{ color: theory?.text ?? 'var(--color-muted)' }}>
                        {c.subCategory}
                      </p>
                    </div>
                  ))}

                  {/* Frases sin mapear */}
                  {session.unmappedPhrases.length > 0 && (
                    <div
                      className="p-4 rounded-xl"
                      style={{ border: '1px dashed var(--color-border)' }}
                    >
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                        Pendiente de análisis
                      </p>
                      {session.unmappedPhrases.map((u, i) => (
                        <p key={i} className="text-sm" style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                          "{u.text}"
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Recuerdos */}
            {session.memories.length > 0 && (
              <Section label="Recuerdos">
                <div className="space-y-3">
                  {session.memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl space-y-3"
                      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                    >
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                        {m.raw}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                            Entonces
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-deep)' }}>{m.feelingThen}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                            Ahora
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-deep)' }}>{m.feelingNow}</p>
                        </div>
                      </div>
                      {m.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: theory?.bg ?? 'var(--color-sage-light)', color: theory?.text ?? 'var(--color-sage)' }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Interpretacion */}
            {session.interpretation && (
              <Section label="Interpretación clínica">
                <div
                  className="p-5 rounded-xl space-y-3"
                  style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-deep)' }}>
                    {session.interpretation.text}
                  </p>
                  {session.interpretation.resonatedAt && (
                    <p className="text-xs" style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-mono)' }}>
                      ♥ El paciente marcó que esto le resonó
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* Cierre */}
            {session.closure && (
              <Section label="Cierre simbólico">
                <div
                  className="p-5 rounded-xl"
                  style={{
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-card)',
                    borderLeft: '3px solid var(--color-sage)',
                  }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-deep)' }}>
                    {session.closure.text}
                  </p>
                </div>
              </Section>
            )}

            {/* Preguntas de reflexion */}
            {session.reflectionQuestions && session.reflectionQuestions.length > 0 && (
              <Section label="Preguntas de reflexión">
                <div className="space-y-3">
                  {session.reflectionQuestions.map((q, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed pl-4"
                      style={{
                        color: 'var(--color-deep)',
                        borderLeft: '2px solid var(--color-sage)',
                      }}
                    >
                      {q}
                    </p>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
