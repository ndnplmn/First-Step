'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { Patient, PatientSession } from '@/lib/types';
import { ArrowLeft, Clock, User, Export, Check, Printer } from '@phosphor-icons/react';
import {
  PHQ9_SEVERITY_COLORS,
  GAD7_SEVERITY_COLORS,
} from '@/lib/clinical';
import { useLanguage } from '@/contexts/language-context';

const FRAMEWORK_COLORS: Record<string, { bg: string; text: string }> = {
  freudiano:    { bg: 'rgba(122,110,158,0.12)', text: 'var(--color-violet)' },
  bioenergetico: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
  adleriano:    { bg: 'rgba(196,163,90,0.12)', text: 'var(--color-terracotta)' },
  gestalt:      { bg: 'rgba(193,127,89,0.12)', text: 'var(--color-terracotta)' },
  conductual:   { bg: 'rgba(107,94,82,0.1)', text: 'var(--color-deep)' },
};

function formatDate(timestamp: number, locale: string): string {
  const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', ru: 'ru-RU' };
  return new Date(timestamp).toLocaleDateString(localeMap[locale] ?? 'es-ES', {
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

function WellbeingDots({ value, max = 5, color }: { value: number; max?: number; color?: string }) {
  const fill = color ?? 'var(--color-sage)';
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: i < value ? fill : 'var(--color-border)',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

interface PatientRecordProps {
  patient: Patient;
  sessions: PatientSession[];
  onBack: () => void;
}

function buildExportText(
  patient: Patient,
  session: PatientSession,
  labels: {
    wellbeing: Record<number, string>;
    share_title: string;
    section_focus: string;
    section_wellbeing: string;
    wellbeing_before: string;
    wellbeing_after: string;
    section_conflicts: string;
    section_interpretation: string;
    section_closure: string;
    section_reflections: string;
    section_clinical: string;
    severity: (key: string) => string;
    locale: string;
  }
): string {
  const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', ru: 'ru-RU' };
  const fmtLocale = localeMap[labels.locale] ?? 'es-ES';
  const lines: string[] = [];
  lines.push(labels.share_title);
  lines.push(`${patient.name} · ${new Date(session.createdAt).toLocaleDateString(fmtLocale, { day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push('');

  if (session.narrativeSummary) {
    lines.push(labels.section_focus.toUpperCase());
    lines.push(session.narrativeSummary);
    lines.push('');
  }
  if (session.wellbeingBefore || session.wellbeingAfter) {
    lines.push(labels.section_wellbeing.toUpperCase());
    if (session.wellbeingBefore) lines.push(`${labels.wellbeing_before}: ${labels.wellbeing[session.wellbeingBefore]}`);
    if (session.wellbeingAfter) lines.push(`${labels.wellbeing_after}: ${labels.wellbeing[session.wellbeingAfter]}`);
    lines.push('');
  }
  if (session.conflicts.length > 0) {
    lines.push(labels.section_conflicts.toUpperCase());
    session.conflicts.forEach(c => lines.push(`· ${c.synthesized}`));
    lines.push('');
  }
  if (session.interpretation?.text) {
    lines.push(labels.section_interpretation.toUpperCase());
    lines.push(session.interpretation.text);
    lines.push('');
  }
  if (session.closure?.text) {
    lines.push(labels.section_closure.toUpperCase());
    lines.push(session.closure.text);
    lines.push('');
  }
  if (session.reflectionQuestions && session.reflectionQuestions.length > 0) {
    lines.push(labels.section_reflections.toUpperCase());
    session.reflectionQuestions.forEach(q => lines.push(`· ${q}`));
    lines.push('');
  }
  if (session.phq9 || session.gad7) {
    lines.push(labels.section_clinical.toUpperCase());
    if (session.phq9) {
      lines.push(`PHQ-9: ${session.phq9.score}/27 — ${labels.severity(session.phq9.severity)}`);
    }
    if (session.gad7) {
      lines.push(`GAD-7: ${session.gad7.score}/21 — ${labels.severity(session.gad7.severity)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildTherapistReport(patient: Patient, sessions: PatientSession[], locale: string): string {
  const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', ru: 'ru-RU' };
  const fmtLocale = localeMap[locale] ?? 'es-ES';
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

  const isEs = locale === 'es';
  const isRu = locale === 'ru';

  const translateGender = (v: string) => {
    const es: Record<string, string> = { 'female': 'Femenino', 'male': 'Masculino', 'other': 'Otro' };
    const en: Record<string, string> = { 'female': 'Female', 'male': 'Male', 'other': 'Other' };
    const ru: Record<string, string> = { 'female': 'Женский', 'male': 'Мужской', 'other': 'Другой' };
    return (isRu ? ru : isEs ? es : en)[v] ?? v;
  };
  const translateMarital = (v: string) => {
    const es: Record<string, string> = { 'single': 'Soltero/a', 'partnered': 'En pareja', 'married': 'Casado/a', 'divorced': 'Divorciado/a', 'widowed': 'Viudo/a', 'separated': 'Separado/a' };
    const en: Record<string, string> = { 'single': 'Single', 'partnered': 'In a relationship', 'married': 'Married', 'divorced': 'Divorced', 'widowed': 'Widowed', 'separated': 'Separated' };
    const ru: Record<string, string> = { 'single': 'Одинок/а', 'partnered': 'В отношениях', 'married': 'Женат/Замужем', 'divorced': 'В разводе', 'widowed': 'Вдовец/Вдова', 'separated': 'В разлуке' };
    return (isRu ? ru : isEs ? es : en)[v] ?? v;
  };
  const translateLiving = (v: string) => {
    const es: Record<string, string> = { 'alone': 'Solo/a', 'with-partner': 'Con pareja', 'with-family': 'Con familia', 'with-housemates': 'Con compañeros', 'with-parents': 'Con padres', 'other': 'Otro' };
    const en: Record<string, string> = { 'alone': 'Alone', 'with-partner': 'With partner', 'with-family': 'With family', 'with-housemates': 'With housemates', 'with-parents': 'With parents', 'other': 'Other' };
    const ru: Record<string, string> = { 'alone': 'Один/Одна', 'with-partner': 'С партнёром', 'with-family': 'С семьёй', 'with-housemates': 'С сожителями', 'with-parents': 'С родителями', 'other': 'Другое' };
    return (isRu ? ru : isEs ? es : en)[v] ?? v;
  };

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8" />
<title>${isRu ? 'Отчёт' : isEs ? 'Informe' : 'Report'} — ${patient.name} — Tend</title>
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
  <h1>${isRu ? 'Отчёт о процессе' : isEs ? 'Informe de proceso' : 'Process report'} — ${patient.name}</h1>
  <p class="subtitle">${isRu ? 'Создано с помощью Tend' : 'Generated with Tend'} · ${new Date().toLocaleDateString(fmtLocale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>

  <h2>${isRu ? 'Данные пациента' : isEs ? 'Datos del paciente' : 'Patient data'}</h2>
  <p><strong>${isRu ? 'Имя' : isEs ? 'Nombre' : 'Name'}:</strong> ${patient.name} · <strong>${isRu ? 'Возраст' : isEs ? 'Edad' : 'Age'}:</strong> ${patient.age} · <strong>${isRu ? 'Пол' : isEs ? 'Género' : 'Gender'}:</strong> ${translateGender(patient.gender)}</p>
  <p><strong>${isRu ? 'Семейное положение' : isEs ? 'Estado civil' : 'Marital status'}:</strong> ${translateMarital(patient.maritalStatus)} · <strong>${isRu ? 'Ситуация' : isEs ? 'Situación' : 'Situation'}:</strong> ${translateLiving(patient.livingSituation)}</p>
  <p><strong>${isRu ? 'Предыдущая терапия' : isEs ? 'Terapia previa' : 'Prior therapy'}:</strong> ${patient.previousTherapy ? `${isRu ? 'Да' : isEs ? 'Sí' : 'Yes'}${patient.previousTherapyDetail ? ` (${patient.previousTherapyDetail})` : ''}` : (isRu ? 'Нет' : isEs ? 'No' : 'No')}</p>
  <p><strong>${isRu ? 'Медикаменты' : isEs ? 'Medicación' : 'Medication'}:</strong> ${patient.takingMedication ? `${isRu ? 'Да' : isEs ? 'Sí' : 'Yes'}${patient.medicationDetail ? ` (${patient.medicationDetail})` : ''}` : (isRu ? 'Нет' : isEs ? 'No' : 'No')}</p>

  <h2>${isRu ? 'Причина обращения' : isEs ? 'Motivo de consulta' : 'Reason for consultation'}</h2>
  <p>${patient.consultationReason}</p>

  ${frameworks ? `<h2>${isRu ? 'Использованные терапевтические подходы' : isEs ? 'Enfoques terapéuticos utilizados' : 'Therapeutic frameworks used'}</h2><p>${frameworks}</p>` : ''}
  ${avgWellbeing ? `<h2>${isRu ? 'Среднее самочувствие (шкала 1-5)' : isEs ? 'Bienestar promedio (escala 1-5)' : 'Average wellbeing (scale 1-5)'}</h2><p>${avgWellbeing} / 5</p>` : ''}

  <h2>${isRu ? 'Завершённые сессии' : isEs ? 'Sesiones completadas' : 'Completed sessions'} (${completed.length})</h2>
  ${completed.map(s => `
  <div class="session-block">
    <p><strong>${isRu ? 'Сессия' : isEs ? 'Sesión' : 'Session'} ${s.sessionNumber}</strong> · ${new Date(s.createdAt).toLocaleDateString(fmtLocale, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
    ${s.wellbeingBefore || s.wellbeingAfter
      ? `<p class="wellbeing">${isRu ? 'Самочувствие' : isEs ? 'Bienestar' : 'Wellbeing'}: ${s.wellbeingBefore ?? '—'} → ${s.wellbeingAfter ?? '—'}</p>`
      : ''}
    ${s.phq9 ? `<p class="wellbeing">PHQ-9: ${s.phq9.score}/27 (${s.phq9.severity})</p>` : ''}
    ${s.gad7 ? `<p class="wellbeing">GAD-7: ${s.gad7.score}/21 (${s.gad7.severity})</p>` : ''}
    ${s.conflicts.length > 0
      ? `<p style="margin-top:6px"><strong>${isRu ? 'Конфликты' : isEs ? 'Conflictos' : 'Conflicts'}:</strong> ${s.conflicts.map(c => c.synthesized).join(' · ')}</p>`
      : ''}
    ${s.interpretation?.text
      ? `<p style="margin-top:6px;font-style:italic;color:#555">${s.interpretation.text.slice(0, 300)}${s.interpretation.text.length > 300 ? '…' : ''}</p>`
      : ''}
  </div>
  `).join('')}

  <p class="footer">${isRu
    ? 'Этот отчёт создан автоматически приложением Tend. Он не является клиническим диагнозом.'
    : isEs
    ? 'Este informe fue generado automáticamente por Tend. No constituye un diagnóstico clínico.'
    : 'This report was generated automatically by Tend. It does not constitute a clinical diagnosis.'
  }</p>
</body>
</html>`;
}

export function PatientRecord({ patient, sessions, onBack }: PatientRecordProps) {
  const { t, locale } = useLanguage();
  const [activeSessionIdx, setActiveSessionIdx] = useState(sessions.length > 0 ? sessions.length - 1 : 0);
  const [copied, setCopied] = useState(false);
  const session = sessions[activeSessionIdx];

  const WELLBEING_LABELS: Record<number, string> = {
    1: t('record.wellbeing.1'), 2: t('record.wellbeing.2'), 3: t('record.wellbeing.3'),
    4: t('record.wellbeing.4'), 5: t('record.wellbeing.5'),
  };

  const primaryFramework = session?.frameworkMatches?.[0];
  const primaryColor = primaryFramework ? FRAMEWORK_COLORS[primaryFramework.key] : null;

  const handleTherapistHandoff = () => {
    const html = buildTherapistReport(patient, sessions, locale);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const handleExport = async () => {
    if (!session) return;
    const exportLabels = {
      wellbeing: WELLBEING_LABELS,
      share_title: t('record.share.title'),
      section_focus: t('record.section.approach'),
      section_wellbeing: t('record.section.wellbeing'),
      wellbeing_before: t('record.section.wellbeing.before'),
      wellbeing_after: t('record.section.wellbeing.after'),
      section_conflicts: t('record.section.conflicts'),
      section_interpretation: t('record.section.interpretation'),
      section_closure: t('record.section.closure'),
      section_reflections: t('record.section.reflections'),
      section_clinical: t('record.section.clinical'),
      severity: (key: string) => t(`clinical.severity.${key}`),
      locale,
    };
    const text = buildExportText(patient, session, exportLabels);
    if (navigator.share) {
      try {
        await navigator.share({ title: t('record.share.title'), text });
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
          {t('record.back')}
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
              aria-label={t('record.therapist.aria')}
            >
              <Printer size={14} aria-hidden="true" />
              {t('record.therapist.btn')}
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
                aria-label={copied ? t('record.copied.aria') : t('record.share.aria')}
                aria-live="polite"
              >
                {copied ? <Check size={14} weight="bold" aria-hidden="true" /> : <Export size={14} aria-hidden="true" />}
                {copied ? t('record.copied') : t('record.share.btn')}
              </motion.button>
            )}
          </div>
        )}
      </header>

      <main className="max-w-[680px] mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-wrap gap-3">
          {[
            { icon: <User size={13} />, label: t('record.age').replace('{n}', String(patient.age)) + ', ' + (patient.gender === 'female' ? t('intake.gender.female') : patient.gender === 'male' ? t('intake.gender.male') : t('intake.gender.other')) },
            { icon: <Clock size={13} />, label: formatDate(patient.createdAt, locale) },
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

        {sessions.length > 1 && (
          <div
            className="flex gap-2 pb-1 -mx-1 px-1"
            style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {sessions.map((s, i) => {
              const delta = (s.wellbeingAfter != null && s.wellbeingBefore != null)
                ? s.wellbeingAfter - s.wellbeingBefore
                : null;
              const isActive = activeSessionIdx === i;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSessionIdx(i)}
                  className="flex-shrink-0 px-4 py-2.5 rounded-[var(--radius-inner)] text-left"
                  style={{
                    background: isActive ? 'var(--color-deep)' : 'var(--color-surface)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'all 0.15s ease',
                    border: isActive ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: isActive ? 'white' : 'var(--color-deep)',
                      lineHeight: 1.2,
                    }}
                  >
                    {t('record.process').replace('{n}', String(s.sessionNumber))}
                  </p>
                  <p
                    style={{
                      fontSize: '0.6375rem',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 3,
                      color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--color-muted)',
                    }}
                  >
                    {new Date(s.createdAt).toLocaleDateString(
                      locale === 'es' ? 'es-ES' : locale === 'ru' ? 'ru-RU' : 'en-US',
                      { day: 'numeric', month: 'short' }
                    )}
                    {delta !== null && (
                      <span
                        style={{
                          marginLeft: 6,
                          color: delta > 0
                            ? (isActive ? '#86efac' : 'var(--color-sage)')
                            : delta < 0
                              ? 'var(--color-terracotta)'
                              : isActive ? 'rgba(255,255,255,0.5)' : 'var(--color-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '='}
                      </span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {!session && (
          <p style={{ color: 'var(--color-muted)' }}>{t('record.empty')}</p>
        )}

        {session && (
          <>
          {/* Session hero */}
          <motion.div
            key={`hero-${session.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="p-5 rounded-[var(--radius-card)]"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.5rem, 4.5vw, 2.125rem)',
                    color: 'var(--color-deep)',
                    lineHeight: 1.1,
                  }}
                >
                  {t('record.process').replace('{n}', String(session.sessionNumber))}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    color: 'var(--color-muted)',
                    marginTop: 5,
                    letterSpacing: '0.02em',
                  }}
                >
                  {formatDate(session.createdAt, locale)}
                </p>
              </div>

              {primaryFramework && primaryColor && (
                <span
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: primaryColor.bg,
                    color: primaryColor.text,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {primaryFramework.name}
                </span>
              )}
            </div>

            {(session.wellbeingBefore != null || session.wellbeingAfter != null) && (
              <div
                className="mt-4 pt-4 flex items-end gap-5"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                {session.wellbeingBefore != null && (
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.5625rem',
                        color: 'var(--color-muted)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                      }}
                    >
                      {t('record.section.wellbeing.before')}
                    </p>
                    <WellbeingDots value={session.wellbeingBefore} color="var(--color-muted)" />
                  </div>
                )}

                {session.wellbeingBefore != null && session.wellbeingAfter != null && (
                  <div
                    style={{
                      fontSize: '1rem',
                      color: 'var(--color-border)',
                      marginBottom: 3,
                      lineHeight: 1,
                    }}
                    aria-hidden="true"
                  >
                    →
                  </div>
                )}

                {session.wellbeingAfter != null && (
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.5625rem',
                        color: 'var(--color-muted)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                      }}
                    >
                      {t('record.section.wellbeing.after')}
                    </p>
                    <WellbeingDots value={session.wellbeingAfter} />
                  </div>
                )}

                {session.wellbeingBefore != null && session.wellbeingAfter != null && (() => {
                  const delta = session.wellbeingAfter - session.wellbeingBefore;
                  const col = delta > 0 ? 'var(--color-sage)' : delta < 0 ? 'var(--color-terracotta)' : 'var(--color-muted)';
                  return (
                    <div style={{ marginLeft: 'auto' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8125rem',
                          color: col,
                          fontWeight: 700,
                        }}
                      >
                        {delta > 0 ? `+${delta}` : delta === 0 ? '=' : `${delta}`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>

          <div className="space-y-6">
            {patient.consultationReason && (
              <Section label={t('record.section.consultation')}>
                <div
                  className="px-5 py-4 rounded-[var(--radius-inner)]"
                  style={{
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-card)',
                    borderLeft: '3px solid var(--color-terracotta)',
                  }}
                >
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-deep)', fontStyle: 'italic' }}
                  >
                    &quot;{patient.consultationReason}&quot;
                  </p>
                </div>
              </Section>
            )}

            {session.narrativeSummary && (
              <Section label={t('record.section.approach')}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                  {session.narrativeSummary}
                </p>
              </Section>
            )}

            {session.conflicts.length > 0 && (
              <Section label={t('record.section.conflicts')}>
                <div className="space-y-2">
                  {session.conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-[var(--radius-inner)]"
                      style={{
                        background: 'var(--color-surface)',
                        boxShadow: 'var(--shadow-card)',
                        borderLeft: `3px solid ${FRAMEWORK_COLORS[c.frameworkKey]?.text ?? 'var(--color-muted)'}`,
                      }}
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

                  {session.unmappedPhrases.length > 0 && (
                    <div
                      className="p-4 rounded-[var(--radius-inner)]"
                      style={{ border: '1px dashed var(--color-border)' }}
                    >
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                        {t('record.section.unmapped')}
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

            {session.memories.length > 0 && (
              <Section label={t('record.section.memories')}>
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
                            {t('record.section.memory.then')}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-deep)' }}>{m.feelingThen}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                            {t('record.section.memory.now')}
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

            {session.interpretation && (
              <Section label={t('record.section.interpretation')}>
                <div
                  className="p-5 rounded-[var(--radius-inner)] space-y-3"
                  style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-deep)' }}>
                    {session.interpretation.text}
                  </p>
                  {session.interpretation.resonatedAt && (
                    <p className="text-xs" style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-mono)' }}>
                      {t('record.interpretation.resonated')}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {session.gestaltActivity && (
              <Section label={t('record.section.gestalt')}>
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

            {session.closure && (
              <Section label={t('record.section.closure')}>
                <div
                  className="rounded-[var(--radius-card)] overflow-hidden"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  {/* Letter header strip */}
                  <div
                    className="px-6 py-3 flex items-center gap-2"
                    style={{
                      background: 'rgba(61,107,71,0.08)',
                      borderBottom: '1px solid rgba(61,107,71,0.15)',
                    }}
                  >
                    <span
                      style={{ color: 'var(--color-sage)', fontSize: '0.875rem', lineHeight: 1 }}
                      aria-hidden="true"
                    >
                      ✦
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6875rem',
                        color: 'var(--color-sage)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                      }}
                    >
                      {t('record.section.closure')}
                    </span>
                  </div>

                  {/* Letter body — display italic font */}
                  <div
                    className="px-6 pt-6 pb-7"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    <p
                      className="leading-[1.85] whitespace-pre-wrap"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
                        color: 'var(--color-deep)',
                      }}
                    >
                      {session.closure.text}
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {session.reflectionQuestions && session.reflectionQuestions.length > 0 && (
              <Section label={t('record.section.reflections')}>
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

            {(session.phq9 || session.gad7) && (
              <Section label={t('record.section.clinical')}>
                <div className="grid grid-cols-2 gap-3">
                  {session.phq9 && (() => {
                    const c = PHQ9_SEVERITY_COLORS[session.phq9!.severity];
                    return (
                      <div
                        className="p-4 rounded-[var(--radius-inner)] space-y-1"
                        style={{ background: c.bg }}
                      >
                        <p
                          className="text-[10px] font-medium uppercase tracking-wider"
                          style={{ color: c.text, fontFamily: 'var(--font-mono)' }}
                        >
                          PHQ-9 · {t('progress.clinical.phq9').split('·')[1]?.trim() ?? 'Depression'}
                        </p>
                        <p className="text-2xl font-semibold leading-none" style={{ color: c.text }}>
                          {session.phq9!.score}
                          <span className="text-xs font-normal ml-1" style={{ opacity: 0.7 }}>/ 27</span>
                        </p>
                        <p className="text-xs" style={{ color: c.text, opacity: 0.85 }}>
                          {t(`clinical.severity.${session.phq9!.severity}`)}
                        </p>
                      </div>
                    );
                  })()}
                  {session.gad7 && (() => {
                    const c = GAD7_SEVERITY_COLORS[session.gad7!.severity];
                    return (
                      <div
                        className="p-4 rounded-[var(--radius-inner)] space-y-1"
                        style={{ background: c.bg }}
                      >
                        <p
                          className="text-[10px] font-medium uppercase tracking-wider"
                          style={{ color: c.text, fontFamily: 'var(--font-mono)' }}
                        >
                          GAD-7 · {t('progress.clinical.gad7').split('·')[1]?.trim() ?? 'Anxiety'}
                        </p>
                        <p className="text-2xl font-semibold leading-none" style={{ color: c.text }}>
                          {session.gad7!.score}
                          <span className="text-xs font-normal ml-1" style={{ opacity: 0.7 }}>/ 21</span>
                        </p>
                        <p className="text-xs" style={{ color: c.text, opacity: 0.85 }}>
                          {t(`clinical.severity.${session.gad7!.severity}`)}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </Section>
            )}
          </div>
          </>
        )}
      </main>
    </div>
  );
}
