# Therapist Flow Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reescribir `Dashboard` e `Intake` del terapeuta al nivel "Cinematic Intimacy" — header sticky glass, tarjetas con barra de progreso cinematográfica y hover elevado, estado vacío SVG animado, intake con preguntas en 3ra persona y transición lateral, overlay de confirmación al crear expediente.

**Architecture:** Reescritura completa de dos archivos existentes. No se crean nuevos componentes. Se reutilizan: `ChapterProgress`, `ChapterTransition`, `FloatingBar`, CSS custom properties, `useReducedMotion`. La función `formatRelativeTime` se define localmente en `dashboard.tsx` — no se extrae a utils (YAGNI).

**Tech Stack:** Next.js 15 App Router, motion/react (`motion`, `AnimatePresence`, `useReducedMotion`), CSS custom properties, `@phosphor-icons/react`, TypeScript

---

### Task 1: Dashboard "El Archivo Vivo"

**Files:**
- Modify: `components/stages/dashboard.tsx` (reescritura completa)

**Context para el implementador:**

El Dashboard actual es funcional pero sin calidez. Necesita:
1. Header sticky glass (igual que `session-header.tsx` pero con back + new buttons)
2. Título fluido `clamp(40px, 7vw, 64px)` con caption de conteo
3. Tarjetas elevadas con `ChapterProgress` visible, hover `y: -2`, nombre en display font
4. Tiempo relativo ("hace 2 días", "ayer") calculado desde `session.updatedAt`
5. Estado vacío con SVG path animado y CTA directo
6. `useReducedMotion` en TODAS las animaciones

El `ChapterProgress` existente en `components/ui/chapter-progress.tsx` ya acepta `currentStage: 1 | 2 | 3 | 4 | 5` y renderiza los 5 segmentos. Úsalo tal cual.

El `storage.getActiveSession(patient.id)` de `@/lib/storage` retorna `PatientSession | null`. Si null, el paciente completó el proceso.

**Step 1: Reemplazar `components/stages/dashboard.tsx` con el código completo**

```tsx
'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Patient } from '@/lib/types';
import { storage } from '@/lib/storage';
import { ArrowLeft, Plus } from '@phosphor-icons/react';
import { ChapterProgress } from '@/components/ui/chapter-progress';

const STAGE_NAMES: Record<number, string> = {
  1: 'Apertura',
  2: 'Conflictos',
  3: 'Recuerdos',
  4: 'Comprensión',
  5: 'Cierre',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return 'hace un momento';
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

interface DashboardProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  onNew: () => void;
  onBack: () => void;
}

export function Dashboard({ patients, onSelect, onNew, onBack }: DashboardProps) {
  const shouldReduce = useReducedMotion();

  const sessionMap = useMemo(() => {
    const map: Record<string, { stage: 1 | 2 | 3 | 4 | 5; updatedAt: number }> = {};
    for (const patient of patients) {
      const session = storage.getActiveSession(patient.id);
      if (session) {
        map[patient.id] = { stage: session.stage, updatedAt: session.updatedAt };
      }
    }
    return map;
  }, [patients]);

  const countLabel =
    patients.length === 0
      ? 'Aún no hay expedientes'
      : patients.length === 1
      ? '1 en proceso'
      : `${patients.length} en proceso`;

  return (
    <div className="min-h-screen">
      {/* Sticky glass header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--color-glass)',
          backdropFilter: 'blur(20px)',
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
            <span className="text-sm">Volver</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onNew}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--color-sage)' }}
          >
            <Plus size={16} />
            Nuevo paciente
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[680px] mx-auto px-6 pt-10 pb-16">
        {/* Title */}
        <div className="mb-8">
          <h1
            className="leading-tight breathe"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 7vw, 64px)',
              color: 'var(--color-deep)',
            }}
          >
            Expedientes
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-muted)',
            }}
          >
            {countLabel}
          </p>
        </div>

        {/* Patient list */}
        <div className="space-y-3">
          {patients.map((patient, i) => {
            const info = sessionMap[patient.id];
            const stage = info?.stage ?? 5;
            const stageName = STAGE_NAMES[stage] ?? 'Completado';
            const relativeTime = info ? formatRelativeTime(info.updatedAt) : '';

            return (
              <motion.button
                key={patient.id}
                type="button"
                onClick={() => onSelect(patient)}
                initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.06,
                  type: 'spring',
                  stiffness: 280,
                  damping: 22,
                }}
                whileHover={shouldReduce ? {} : { y: -2 }}
                whileTap={shouldReduce ? {} : { scale: 0.99 }}
                className="w-full p-5 rounded-2xl text-left"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '18px',
                        color: 'var(--color-deep)',
                      }}
                    >
                      {patient.name}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {patient.age} años · {patient.gender}
                    </p>
                    <p
                      className="mt-2"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-muted)',
                      }}
                    >
                      {stageName}{relativeTime ? ` · ${relativeTime}` : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0 pt-1">
                    <ChapterProgress currentStage={stage} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Empty state */}
        {patients.length === 0 && (
          <div className="flex flex-col items-center pt-20 gap-6">
            <svg width="320" height="80" viewBox="0 0 320 80" fill="none">
              <motion.path
                d="M 0 40 Q 80 0 160 40 Q 240 80 320 40"
                stroke="var(--color-sage)"
                strokeWidth="1.5"
                fill="none"
                initial={shouldReduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
            </svg>
            <div className="text-center space-y-3">
              <p style={{ color: 'var(--color-muted)' }}>Aún no hay expedientes</p>
              <motion.button
                type="button"
                onClick={onNew}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="text-sm font-medium"
                style={{ color: 'var(--color-sage)' }}
              >
                Crear el primero →
              </motion.button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 2: Verificar que compila sin errores**

```bash
npm run build 2>&1 | tail -20
```

Esperado: `✓ Compiled successfully` sin errores TypeScript.

Si hay error de tipo en `ChapterProgress currentStage={stage}`: asegurarse de que `stage` es `1 | 2 | 3 | 4 | 5`. El `sessionMap` lo tipea correctamente; para el fallback `?? 5`, añadir `as 1 | 2 | 3 | 4 | 5` si TypeScript se queja.

**Step 3: Commit**

```bash
git add components/stages/dashboard.tsx
git commit -m "feat: redesign Dashboard with glass header, elevated cards, ChapterProgress and animated empty state"
```

---

### Task 2: Intake "Apertura del Expediente"

**Files:**
- Modify: `components/stages/intake.tsx` (reescritura completa)

**Context para el implementador:**

El Intake actual usa preguntas en 2da persona ("¿Cómo te llamas?") y animaciones mínimas. Necesita:

1. Preguntas en **3ra persona** — es el terapeuta registrando a su paciente
2. Transición lateral entre pasos: entra por la derecha (`x: 24`), sale por la izquierda (`x: -16`)
3. Barra de 3 segmentos inline (no usar `ChapterProgress` — este tiene 5 segmentos)
4. Chips de género con spring entry y `whileTap`
5. Al finalizar paso 3: crear paciente/sesión, mostrar `ChapterTransition toStage={2}` (overlay "CONFLICTOS"), luego llamar `onComplete`
6. `useReducedMotion` en TODAS las animaciones

El `ChapterTransition` de `components/ui/chapter-transition.tsx` acepta `{ toStage: number; onComplete: () => void }`. Al recibir `toStage={2}`, muestra el overlay "II · CONFLICTOS" y llama `onComplete` después de ~1900ms. Úsalo dentro de `AnimatePresence`.

El `FloatingBar` de `components/ui/floating-bar.tsx` acepta `{ visible: boolean; children: ReactNode }`. Ya maneja el sticky bottom con glass effect.

`generatePatientId()` y `generateId()` de `@/lib/id` generan los IDs necesarios — no cambiar.

**Step 1: Reemplazar `components/stages/intake.tsx` con el código completo**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Gender } from '@/lib/types';
import { generatePatientId, generateId } from '@/lib/id';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { ArrowLeft } from '@phosphor-icons/react';

interface IntakeProps {
  onComplete: (patient: Patient, session: PatientSession) => void;
  onBack: () => void;
}

const QUESTIONS = [
  {
    field: 'name' as const,
    label: '¿Cómo se llama\ntu paciente?',
    type: 'text' as const,
    placeholder: 'Nombre completo',
  },
  {
    field: 'age' as const,
    label: '¿Cuántos años\ntiene?',
    type: 'number' as const,
    placeholder: 'Edad',
  },
  {
    field: 'gender' as const,
    label: '¿Cómo se\nidentifica?',
    type: 'select' as const,
    options: ['Femenino', 'Masculino', 'Otro'] as Gender[],
  },
];

export function Intake({ onComplete, onBack }: IntakeProps) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ name: '', age: '', gender: 'Femenino' as Gender });
  const [pendingData, setPendingData] = useState<{ patient: Patient; session: PatientSession } | null>(null);
  const [showTransition, setShowTransition] = useState(false);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const canProceed =
    (current.field === 'name' && values.name.trim().length > 0) ||
    (current.field === 'age' && parseInt(values.age) > 0 && parseInt(values.age) < 120) ||
    current.field === 'gender';

  const handleNext = () => {
    if (!canProceed) return;
    if (isLast) {
      const patient: Patient = {
        id: generatePatientId(),
        name: values.name,
        age: parseInt(values.age),
        gender: values.gender,
        createdAt: Date.now(),
      };
      const session: PatientSession = {
        id: generateId(),
        patientId: patient.id,
        sessionNumber: 1,
        stage: 2,
        conflicts: [],
        theoryMatch: null,
        memories: [],
        interpretation: null,
        closure: null,
        unmappedPhrases: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPendingData({ patient, session });
      setShowTransition(true);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    if (pendingData) {
      onComplete(pendingData.patient, pendingData.session);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-[680px] mx-auto px-6 pt-10 pb-48">
      {/* Back button */}
      <motion.button
        type="button"
        onClick={onBack}
        whileTap={shouldReduce ? {} : { scale: 0.97 }}
        className="flex items-center gap-2 mb-10 self-start"
        style={{ color: 'var(--color-muted)' }}
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Volver</span>
      </motion.button>

      {/* Step indicator */}
      <div className="mb-8 space-y-3">
        <p
          className="text-xs"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
        >
          Nuevo expediente · Paso {step + 1} de {QUESTIONS.length}
        </p>
        <div className="flex items-center gap-1">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="h-[3px] rounded-full transition-all duration-300"
              style={{
                width: 28,
                background:
                  i < step
                    ? 'var(--color-deep)'
                    : i === step
                    ? 'var(--color-sage)'
                    : 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={shouldReduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={
            shouldReduce
              ? { opacity: 0 }
              : { opacity: 0, x: -16, transition: { duration: 0.18 } }
          }
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="flex-1 space-y-8"
        >
          <h2
            className="leading-tight breathe whitespace-pre-line"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 6vw, 52px)',
              color: 'var(--color-deep)',
            }}
          >
            {current.label}
          </h2>

          {current.type === 'text' && (
            <input
              type="text"
              value={values.name}
              onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
              placeholder={current.placeholder}
              autoFocus
              className="w-full bg-transparent outline-none py-3 text-xl placeholder:opacity-40 border-b-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            />
          )}

          {current.type === 'number' && (
            <input
              type="number"
              value={values.age}
              onChange={e => setValues(v => ({ ...v, age: e.target.value }))}
              placeholder={current.placeholder}
              autoFocus
              min={1}
              max={120}
              className="w-full bg-transparent outline-none py-3 text-xl placeholder:opacity-40 border-b-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            />
          )}

          {current.type === 'select' && (
            <div className="flex flex-wrap gap-3">
              {current.options?.map((opt, i) => (
                <motion.button
                  key={opt}
                  type="button"
                  onClick={() => setValues(v => ({ ...v, gender: opt }))}
                  initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.06,
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  className="px-5 py-3 rounded-xl text-sm font-medium"
                  style={{
                    background:
                      values.gender === opt ? 'var(--color-sage)' : 'var(--color-surface)',
                    color: values.gender === opt ? 'white' : 'var(--color-deep)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* CTA */}
      <FloatingBar visible={canProceed}>
        <motion.button
          type="button"
          onClick={handleNext}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          {isLast ? 'Crear expediente' : 'Continuar →'}
        </motion.button>
      </FloatingBar>

      {/* Chapter transition overlay on completion */}
      <AnimatePresence>
        {showTransition && (
          <ChapterTransition toStage={2} onComplete={handleTransitionComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Verificar que compila sin errores**

```bash
npm run build 2>&1 | tail -20
```

Esperado: `✓ Compiled successfully` sin errores TypeScript.

Posible error: `ChapterTransition` podría no estar importado si el archivo fue modificado. Verificar que el import existe en `components/ui/chapter-transition.tsx`.

**Step 3: Verificación visual manual**

Abrir `npm run dev` y verificar:
- [ ] Dashboard: header sticky visible al hacer scroll, tarjetas muestran `ChapterProgress`, hover eleva la tarjeta
- [ ] Dashboard vacío: SVG line se dibuja, botón "Crear el primero →" funciona
- [ ] Intake: preguntas en 3ra persona, barra de 3 segmentos, transición lateral al avanzar
- [ ] Intake paso 3: chips de género con spring animation
- [ ] Intake finalizar: overlay `ChapterTransition` aparece antes de iniciar sesión

**Step 4: Commit**

```bash
git add components/stages/intake.tsx
git commit -m "feat: redesign Intake with third-person questions, lateral slide transitions, and ChapterTransition confirmation overlay"
```
