'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { ArrowLeft, Clock, User } from '@phosphor-icons/react';

const FRAMEWORK_COLORS: Record<string, { bg: string; text: string }> = {
  tcc: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
  tg3: { bg: 'rgba(107,94,82,0.1)', text: 'var(--color-deep)' },
  dbt: { bg: 'rgba(196,163,90,0.12)', text: 'var(--color-terracotta)' },
  apego_trauma: { bg: 'var(--color-violet-light)', text: 'var(--color-violet)' },
  psicodinamico: { bg: 'rgba(122,110,158,0.12)', text: 'var(--color-violet)' },
  integrativo: { bg: 'rgba(107,94,82,0.1)', text: 'var(--color-deep)' },
  gestalt: { bg: 'rgba(193,127,89,0.12)', text: 'var(--color-terracotta)' },
};

const ROLE_LABELS: Record<string, string> = {
  primary: 'Principal',
  secondary: 'Apoyo',
  gestalt: 'Gestalt',
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

  const primaryFramework = session?.frameworkMatches?.find(m => m.role === 'primary');
  const primaryColor = primaryFramework ? FRAMEWORK_COLORS[primaryFramework.key] : null;

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
          Mis sesiones
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
                Proceso {s.sessionNumber}
              </button>
            ))}
          </div>
        )}

        {!session && (
          <p style={{ color: 'var(--color-muted)' }}>Aún no has completado ningún proceso.</p>
        )}

        {session && (
          <div className="space-y-6">
            {/* Marcos terapéuticos */}
            {session.frameworkMatches.length > 0 && (
              <Section label="Combinación de marcos terapéuticos">
                <div className="space-y-2">
                  {session.frameworkMatches.map((fm) => {
                    const color = FRAMEWORK_COLORS[fm.key] ?? { bg: 'var(--color-surface)', text: 'var(--color-muted)' };
                    return (
                      <div key={fm.key} className="flex flex-wrap gap-2 items-center">
                        <span
                          className="px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {ROLE_LABELS[fm.role] ?? fm.role}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                          {fm.name}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                          {fm.focus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Conflictos */}
            {session.conflicts.length > 0 && (
              <Section label="Lo que trajiste a sesión">
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
                      <p className="text-xs mt-1" style={{ color: FRAMEWORK_COLORS[c.frameworkKey]?.text ?? 'var(--color-muted)' }}>
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
              <Section label="Recuerdos que exploraste">
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
                              style={{ background: primaryColor?.bg ?? 'var(--color-sage-light)', color: primaryColor?.text ?? 'var(--color-sage)' }}
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
              <Section label="Lo que la IA encontró en ti">
                <div
                  className="p-5 rounded-xl space-y-3"
                  style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-deep)' }}>
                    {session.interpretation.text}
                  </p>
                  {session.interpretation.resonatedAt && (
                    <p className="text-xs" style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-mono)' }}>
                      ♥ Marcaste que esto te resonó
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* Actividad Gestalt */}
            {session.gestaltActivity && (
              <Section label="Actividad experiencial">
                <div
                  className="p-5 rounded-xl space-y-3"
                  style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-violet)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                    {session.gestaltActivity.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    {session.gestaltActivity.description}
                  </p>
                  <div className="rounded-xl p-3" style={{ background: 'var(--color-violet-light)' }}>
                    <p className="text-sm italic" style={{ color: 'var(--color-deep)' }}>
                      {session.gestaltActivity.prompt}
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* Cierre */}
            {session.closure && (
              <Section label="Tu cierre">
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
              <Section label="Para llevar contigo">
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
