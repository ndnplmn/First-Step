'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { ArrowLeft, Clock, User, Export, Check, Printer } from '@phosphor-icons/react';

const WELLBEING_LABELS: Record<number, string> = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Regular',
  4: 'Bien',
  5: 'Muy bien',
};

const FRAMEWORK_COLORS: Record<string, { bg: string; text: string }> = {
  freudiano:    { bg: 'rgba(122,110,158,0.12)', text: 'var(--color-violet)' },
  bioenergetico: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
  adleriano:    { bg: 'rgba(196,163,90,0.12)', text: 'var(--color-terracotta)' },
  gestalt:      { bg: 'rgba(193,127,89,0.12)', text: 'var(--color-terracotta)' },
  conductual:   { bg: 'rgba(107,94,82,0.1)', text: 'var(--color-deep)' },
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

const WELLBEING_EXPORT_LABELS: Record<number, string> = {
  1: 'Muy mal', 2: 'Mal', 3: 'Regular', 4: 'Bien', 5: 'Muy bien',
};

function buildExportText(patient: Patient, session: PatientSession): string {
  const lines: string[] = [];
  lines.push(`Tend — Mi resumen de sesión`);
  lines.push(`${patient.name} · ${new Date(session.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push('');

  if (session.narrativeSummary) {
    lines.push('ENFOQUE');
    lines.push(session.narrativeSummary);
    lines.push('');
  }
  if (session.wellbeingBefore || session.wellbeingAfter) {
    lines.push('BIENESTAR');
    if (session.wellbeingBefore) lines.push(`Al inicio: ${WELLBEING_EXPORT_LABELS[session.wellbeingBefore]}`);
    if (session.wellbeingAfter) lines.push(`Al final: ${WELLBEING_EXPORT_LABELS[session.wellbeingAfter]}`);
    lines.push('');
  }
  if (session.conflicts.length > 0) {
    lines.push('LO QUE TRAJE A SESIÓN');
    session.conflicts.forEach(c => lines.push(`· ${c.synthesized}`));
    lines.push('');
  }
  if (session.interpretation?.text) {
    lines.push('INTERPRETACIÓN');
    lines.push(session.interpretation.text);
    lines.push('');
  }
  if (session.closure?.text) {
    lines.push('CARTA DE CIERRE');
    lines.push(session.closure.text);
    lines.push('');
  }
  if (session.reflectionQuestions && session.reflectionQuestions.length > 0) {
    lines.push('PARA LLEVAR CONMIGO');
    session.reflectionQuestions.forEach(q => lines.push(`· ${q}`));
    lines.push('');
  }
  return lines.join('\n');
}

function buildTherapistReport(patient: Patient, sessions: PatientSession[]): string {
  const completed = sessions.filter(s => s.stage >= 6).sort((a, b) => a.createdAt - b.createdAt);
  const frameworks = Array.from(new Set(
    sessions.flatMap(s => s.frameworkMatches.map(f => f.name))
  )).join(', ');

  const wellbeingTrend = completed
    .filter(s => s.wellbeingAfter)
    .map(s => s.wellbeingAfter ?? 0);
  const avgWellbeing = wellbeingTrend.length
    ? (wellbeingTrend.reduce((a, b) => a + b, 0) / wellbeingTrend.length).toFixed(1)
    : null;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Informe — ${patient.name} — Tend</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 11pt; color: #19160F; padding: 48px; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 22pt; font-style: italic; margin-bottom: 4px; }
  .subtitle { font-size: 9pt; color: #888; font-family: monospace; margin-bottom: 32px; }
  h2 { font-size: 8pt; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 8px; margin-top: 28px; }
  p { line-height: 1.65; margin-bottom: 8px; }
  .chip { display: inline-block; background: #f0ede9; padding: 2px 10px; border-radius: 99px; font-size: 9pt; margin: 2px; }
  .session-block { border-left: 2px solid #3D6B47; padding: 8px 16px; margin-bottom: 16px; }
  .wellbeing { font-size: 9pt; color: #666; font-family: monospace; margin-top: 4px; }
  .footer { margin-top: 48px; font-size: 8pt; color: #bbb; font-family: monospace; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
  <h1>Informe de proceso — ${patient.name}</h1>
  <p class="subtitle">Generado con Tend · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

  <h2>Datos del paciente</h2>
  <p><strong>Nombre:</strong> ${patient.name} · <strong>Edad:</strong> ${patient.age} años · <strong>Género:</strong> ${patient.gender}</p>
  <p><strong>Estado civil:</strong> ${patient.maritalStatus} · <strong>Situación:</strong> ${patient.livingSituation}</p>
  <p><strong>Terapia previa:</strong> ${patient.previousTherapy ? `Sí${patient.previousTherapyDetail ? ` (${patient.previousTherapyDetail})` : ''}` : 'No'}</p>
  <p><strong>Medicación:</strong> ${patient.takingMedication ? `Sí${patient.medicationDetail ? ` (${patient.medicationDetail})` : ''}` : 'No'}</p>

  <h2>Motivo de consulta</h2>
  <p>${patient.consultationReason}</p>

  ${frameworks ? `<h2>Enfoques terapéuticos utilizados</h2><p>${frameworks}</p>` : ''}
  ${avgWellbeing ? `<h2>Bienestar promedio (escala 1-5)</h2><p>${avgWellbeing} / 5 — basado en ${wellbeingTrend.length} sesión${wellbeingTrend.length !== 1 ? 'es' : ''}</p>` : ''}

  <h2>Sesiones completadas (${completed.length})</h2>
  ${completed.map(s => `
  <div class="session-block">
    <p><strong>Sesión ${s.sessionNumber}</strong> · ${new Date(s.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
    ${s.wellbeingBefore || s.wellbeingAfter
      ? `<p class="wellbeing">Bienestar: ${s.wellbeingBefore ?? '—'} → ${s.wellbeingAfter ?? '—'}</p>`
      : ''}
    ${s.conflicts.length > 0
      ? `<p style="margin-top:6px"><strong>Conflictos:</strong> ${s.conflicts.map(c => c.synthesized).join(' · ')}</p>`
      : ''}
    ${s.interpretation?.text
      ? `<p style="margin-top:6px;font-style:italic;color:#555">${s.interpretation.text.slice(0, 300)}${s.interpretation.text.length > 300 ? '…' : ''}</p>`
      : ''}
  </div>
  `).join('')}

  <p class="footer">Este informe fue generado automáticamente por Tend. No constituye un diagnóstico clínico. La información aquí contenida es de uso exclusivo del profesional de salud mental designado por el paciente.</p>
</body>
</html>`;
}

export function PatientRecord({ patient, sessions, onBack }: PatientRecordProps) {
  const [activeSessionIdx, setActiveSessionIdx] = useState(sessions.length > 0 ? sessions.length - 1 : 0);
  const [copied, setCopied] = useState(false);
  const session = sessions[activeSessionIdx];

  const primaryFramework = session?.frameworkMatches?.[0];
  const primaryColor = primaryFramework ? FRAMEWORK_COLORS[primaryFramework.key] : null;

  const handleTherapistHandoff = () => {
    const html = buildTherapistReport(patient, sessions);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const handleExport = async () => {
    if (!session) return;
    const text = buildExportText(patient, session);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mi resumen — Tend', text });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-base)' }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-40 px-6 py-4 flex items-center gap-4"
        style={{
          background: 'var(--color-glass-heavy)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
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

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={handleTherapistHandoff}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-inner)] text-xs font-medium"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-muted)',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--color-border)',
              }}
              aria-label="Generar informe para terapeuta"
            >
              <Printer size={14} aria-hidden="true" />
              Terapeuta
            </motion.button>
            {session && (
              <motion.button
                type="button"
                onClick={handleExport}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-inner)] text-xs font-medium"
                style={{
                  background: copied ? 'rgba(61,107,71,0.1)' : 'var(--color-surface)',
                  color: copied ? 'var(--color-sage)' : 'var(--color-muted)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border)',
                }}
                aria-label={copied ? 'Sesión copiada al portapapeles' : 'Compartir resumen de sesión'}
                aria-live="polite"
              >
                {copied ? <Check size={14} weight="bold" aria-hidden="true" /> : <Export size={14} aria-hidden="true" />}
                {copied ? 'Copiado' : 'Compartir'}
              </motion.button>
            )}
          </div>
        )}
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
            {/* Enfoque del proceso */}
            {session.narrativeSummary && (
              <Section label="Enfoque de tu proceso">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                  {session.narrativeSummary}
                </p>
              </Section>
            )}

            {/* Bienestar */}
            {(session.wellbeingBefore || session.wellbeingAfter) && (
              <Section label="Tu bienestar">
                <div className="flex gap-6">
                  {session.wellbeingBefore && (
                    <div>
                      <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                        Al inicio
                      </p>
                      <p className="text-lg font-medium" style={{ color: 'var(--color-deep)' }}>
                        {WELLBEING_LABELS[session.wellbeingBefore] ?? session.wellbeingBefore}
                      </p>
                    </div>
                  )}
                  {session.wellbeingAfter && (
                    <div>
                      <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                        Al final
                      </p>
                      <p className="text-lg font-medium" style={{ color: 'var(--color-deep)' }}>
                        {WELLBEING_LABELS[session.wellbeingAfter] ?? session.wellbeingAfter}
                      </p>
                    </div>
                  )}
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
                      className="p-4 rounded-[var(--radius-inner)]"
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
                      className="p-4 rounded-[var(--radius-inner)]"
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
                      className="p-4 rounded-[var(--radius-inner)] space-y-3"
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
                  className="p-5 rounded-[var(--radius-inner)] space-y-3"
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
                  className="p-5 rounded-[var(--radius-inner)] space-y-3"
                  style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-violet)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                    {session.gestaltActivity.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    {session.gestaltActivity.description}
                  </p>
                  <div className="rounded-[var(--radius-inner)] p-3" style={{ background: 'var(--color-violet-light)' }}>
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
                  className="p-5 rounded-[var(--radius-inner)]"
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
