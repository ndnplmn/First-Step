# First Step Completion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all missing features of the First Step clinical flow — redesigned Stage 5 with 3 action cards, multi-session support, full patient record view for therapist, AI-generated reflection questions, and unmapped phrases display.

**Architecture:** All features are client-side (localStorage). The completion action from Stage 5 is typed (`'dashboard' | 'record' | 'new-session'`) and flows up through SessionView → page.tsx. New `PatientRecord` component reads all sessions for a patient and renders the complete clinical record. One new server action `generateReflectionQuestions` added to Groq.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, motion/react, Phosphor Icons, Groq SDK (llama-3.3-70b-versatile), existing design tokens (`--color-sage`, `--color-deep`, etc.)

---

## Task 1: Update Types

**Files:**
- Modify: `lib/types.ts`

**Step 1: Add `reflectionQuestions` to `PatientSession` and `'RECORD'` to `AppView`**

In `lib/types.ts`, make these two changes:

```typescript
// In PatientSession, add after `unmappedPhrases`:
reflectionQuestions?: string[];   // 3 preguntas generadas por IA tras el cierre

// Replace AppView with:
export type AppView =
  | 'WELCOME'
  | 'DASHBOARD'
  | 'INTAKE'
  | 'SESSION'
  | 'RECORD';
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add reflectionQuestions to PatientSession, RECORD to AppView"
```

---

## Task 2: Add `generateReflectionQuestions` Server Action

**Files:**
- Modify: `actions/ai.ts`

**Step 1: Add the new action at the end of `actions/ai.ts`**

```typescript
// --- ACTION 5: Generar preguntas de reflexion ---
export async function generateReflectionQuestions(params: {
  conflicts: Conflict[];
  theoryMatch: TheoryMatch;
  closure: string;
}): Promise<string[]> {
  const { conflicts, theoryMatch, closure } = params;

  const prompt = `
    Eres un psicoterapeuta que acaba de completar una sesion con un paciente.

    El paciente trabajó con la teoria ${theoryMatch.name} (${theoryMatch.subCategory}).
    Sus conflictos principales fueron: ${conflicts.map(c => c.synthesized).join(', ')}.
    El cierre simbolico que recibio fue:
    "${closure}"

    Genera exactamente 3 preguntas de reflexion profunda y personalizada para que el paciente
    lleve consigo despues de la sesion. Las preguntas deben:
    - Surgir directamente de sus conflictos y teoria especifica
    - Invitar a la contemplacion sin requerir respuesta inmediata
    - Usar segunda persona singular ("¿Que sientes cuando...", "¿En que momentos...")
    - Ser abiertas, no retorias ni con respuesta obvia
    - Tener entre 10 y 25 palabras cada una

    Responde SOLO con un objeto JSON: { "questions": ["...", "...", "..."] }
  `;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });
    content = response.choices[0]?.message?.content || '{"questions":[]}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : [];
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add actions/ai.ts
git commit -m "feat: add generateReflectionQuestions server action"
```

---

## Task 3: Redesign `stage-closure.tsx`

**Files:**
- Modify: `components/stages/stage-closure.tsx`

This is the most impactful task. Replace the entire file with the new design.

**Step 1: Read the current file first, then replace with this implementation**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { PatientSession, Closure } from '@/lib/types';
import { generateClosure, generateReflectionQuestions } from '@/actions/ai';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowCounterClockwise, Users, ArrowsClockwise, House } from '@phosphor-icons/react';

const THINKING_PHRASES = [
  'Preparando tu cierre...',
  'Destilando lo esencial...',
  'Abriendo un nuevo camino...',
];

type ClosureAction = 'dashboard' | 'record' | 'new-session';

interface StageClosureProps {
  session: PatientSession;
  onComplete: (action: ClosureAction) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageClosure({ session, onComplete, onUpdate }: StageClosureProps) {
  const [fullClosure, setFullClosure] = useState<Closure | null>(session.closure ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>(
    session.reflectionQuestions ?? []
  );
  const { text, isStreaming, isDone, startStream } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.closure) {
      startStream(session.closure.text);
      // Load existing questions if available
      if (session.reflectionQuestions?.length) {
        setReflectionQuestions(session.reflectionQuestions);
      }
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullClosure(null);
    setReflectionQuestions([]);
    try {
      const result = await generateClosure({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
        interpretation: session.interpretation!.text,
      });
      setFullClosure(result);
      onUpdate({ closure: result });
      startStream(result.text);

      // Generate reflection questions after closure
      const questions = await generateReflectionQuestions({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        closure: result.text,
      });
      setReflectionQuestions(questions);
      onUpdate({ closure: result, reflectionQuestions: questions });
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const displayText = shouldReduce ? (fullClosure?.text ?? '') : text;
  const showContent = shouldReduce ? !!fullClosure : (isDone || isStreaming);
  const showActions = isDone || (!!shouldReduce && !!fullClosure);

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 5 — Cierre
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          Un nuevo comienzo
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Antes de cerrar, quiero dejarte con algo que llevar contigo.
        </p>
      </div>

      {isGenerating && <AIThinking phrases={THINKING_PHRASES} />}

      {isError && !isGenerating && (
        <div
          className="rounded-2xl p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Hubo un problema al generar el cierre.
          </p>
          <button
            type="button"
            onClick={generate}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}
          >
            <ArrowCounterClockwise size={14} />
            Intentar de nuevo
          </button>
        </div>
      )}

      {showContent && (
        <AICard sources={[]} actions={null}>
          <p className="leading-relaxed whitespace-pre-wrap">
            {displayText}
            {isStreaming && !shouldReduce && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ color: 'var(--color-sage)', marginLeft: 1 }}
              >
                |
              </motion.span>
            )}
          </p>
        </AICard>
      )}

      {/* Preguntas de reflexion */}
      <AnimatePresence>
        {showActions && reflectionQuestions.length > 0 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              Para llevar contigo
            </p>
            <div className="space-y-3">
              {reflectionQuestions.map((q, i) => (
                <motion.p
                  key={i}
                  initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="text-sm leading-relaxed pl-3"
                  style={{
                    color: 'var(--color-deep)',
                    borderLeft: '2px solid var(--color-sage)',
                  }}
                >
                  {q}
                </motion.p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarjetas de accion */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-3"
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              ¿Qué quieres hacer ahora?
            </p>

            {/* Tarjeta 2: Compartir con terapeuta */}
            <motion.button
              type="button"
              onClick={() => onComplete('record')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-violet-light)' }}
              >
                <Users size={18} style={{ color: 'var(--color-violet)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                  Ver expediente con tu terapeuta
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Tu expediente completo está listo para revisarlo juntos
                </p>
              </div>
            </motion.button>

            {/* Tarjeta 3: Nuevo proceso */}
            <motion.button
              type="button"
              onClick={() => onComplete('new-session')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-sage-light)' }}
              >
                <ArrowsClockwise size={18} style={{ color: 'var(--color-sage)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                  Iniciar nuevo proceso
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Explora otro conflicto con una nueva sesión
                </p>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingBar visible={showActions}>
        <motion.button
          type="button"
          onClick={() => onComplete('dashboard')}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-3.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)' }}
        >
          <House size={16} />
          Volver al inicio
        </motion.button>
      </FloatingBar>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ Compiled successfully` (TypeScript will flag the `onComplete` type mismatch with session-view.tsx — that's expected and fixed in Task 4)

**Step 3: Commit**

```bash
git add components/stages/stage-closure.tsx
git commit -m "feat: redesign stage-closure with 3 action cards and AI reflection questions"
```

---

## Task 4: Update `session-view.tsx` — Pass Through Typed `onComplete`

**Files:**
- Modify: `components/stages/session-view.tsx`

**Step 1: Change the `onComplete` prop type and pass it through**

```typescript
// Change interface:
interface SessionViewProps {
  patient: Patient;
  session: PatientSession;
  onSessionUpdate: (session: PatientSession) => void;
  onComplete: (action: 'dashboard' | 'record' | 'new-session') => void;  // changed
}

// In the StageClosure render (line ~112), onComplete already passes through correctly
// since we're just forwarding: onComplete={onComplete}
// No other changes needed in this file.
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: TypeScript error on `page.tsx` because `handleComplete` still has old signature. That's fixed in Task 7.

**Step 3: Commit**

```bash
git add components/stages/session-view.tsx
git commit -m "feat: update SessionView onComplete signature to typed action"
```

---

## Task 5: Add Unmapped Phrases Section to `stage-conflicts.tsx`

**Files:**
- Modify: `components/stages/stage-conflicts.tsx`

**Step 1: Read the full file, then add the unmapped phrases section**

After the line that renders the synthesized conflicts cards (the `result.conflicts.map(...)` block), add this section — it should appear between the conflicts list and the `FloatingBar`:

```tsx
{/* Frases sin mapear */}
{result.unmapped.length > 0 && (
  <UnmappedSection unmapped={result.unmapped} shouldReduce={!!shouldReduce} />
)}
```

Add this component above the `StageConflicts` function declaration:

```tsx
function UnmappedSection({ unmapped, shouldReduce }: { unmapped: string[]; shouldReduce: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px dashed var(--color-border)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: 'transparent' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
          Pendiente de análisis ({unmapped.length})
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'var(--color-muted)' }}
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                Estas frases no encajaron claramente en una teoría. Tu terapeuta puede explorarlas contigo.
              </p>
              {unmapped.map((phrase, i) => (
                <p
                  key={i}
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{
                    color: 'var(--color-muted)',
                    background: 'var(--color-surface)',
                    fontStyle: 'italic',
                  }}
                >
                  "{phrase}"
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

Make sure `useState` is already imported (it is). `AnimatePresence` is already imported from `motion/react`.

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add components/stages/stage-conflicts.tsx
git commit -m "feat: add collapsible unmapped phrases section in stage-conflicts"
```

---

## Task 6: Create `patient-record.tsx` — Full Clinical Record View

**Files:**
- Create: `components/stages/patient-record.tsx`

**Step 1: Create the full component**

```tsx
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

interface PatientRecordProps {
  patient: Patient;
  sessions: PatientSession[];
  onBack: () => void;
}

export function PatientRecord({ patient, sessions, onBack }: PatientRecordProps) {
  const [activeSessionIdx, setActiveSessionIdx] = useState(sessions.length - 1);
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
        {/* Patient info */}
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
          <div className="flex gap-2">
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
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                    >
                      <div className="flex-1">
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
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add components/stages/patient-record.tsx
git commit -m "feat: create PatientRecord component with full clinical view"
```

---

## Task 7: Update `app/page.tsx` — Wire All New Features

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace the entire file with this implementation**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Welcome } from '@/components/stages/welcome';
import { Dashboard } from '@/components/stages/dashboard';
import { Intake } from '@/components/stages/intake';
import { SessionView } from '@/components/stages/session-view';
import { PatientRecord } from '@/components/stages/patient-record';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/id';
import type { Patient, PatientSession, AppView } from '@/lib/types';

export default function Home() {
  const [view, setView] = useState<AppView>('WELCOME');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeSession, setActiveSession] = useState<PatientSession | null>(null);
  const [recordPatient, setRecordPatient] = useState<Patient | null>(null);
  const [recordSessions, setRecordSessions] = useState<PatientSession[]>([]);

  useEffect(() => {
    setPatients(storage.getPatients());
  }, []);

  const createNewSession = (patient: Patient): PatientSession => {
    const existingSessions = storage.getSessions(patient.id);
    return {
      id: generateId(),
      patientId: patient.id,
      sessionNumber: existingSessions.length + 1,
      stage: 2,
      conflicts: [],
      theoryMatch: null,
      memories: [],
      interpretation: null,
      closure: null,
      unmappedPhrases: [],
      reflectionQuestions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  };

  const handlePatientSelect = (patient: Patient) => {
    setActivePatient(patient);
    const session = storage.getActiveSession(patient.id);
    if (session) {
      setActiveSession(session);
      setView('SESSION');
    } else {
      // Patient completed their process — start a new session directly
      const newSession = createNewSession(patient);
      storage.saveSession(newSession);
      setActiveSession(newSession);
      setView('SESSION');
    }
  };

  const handleViewRecord = (patient: Patient) => {
    const sessions = storage.getSessions(patient.id);
    setRecordPatient(patient);
    setRecordSessions(sessions);
    setView('RECORD');
  };

  const handleIntakeComplete = (patient: Patient, session: PatientSession) => {
    storage.savePatient(patient);
    storage.saveSession(session);
    setPatients(storage.getPatients());
    setActivePatient(patient);
    setActiveSession(session);
    setView('SESSION');
  };

  const handleSessionUpdate = (updated: PatientSession) => {
    storage.saveSession(updated);
    setActiveSession(updated);
  };

  const handleComplete = (action: 'dashboard' | 'record' | 'new-session') => {
    setPatients(storage.getPatients());

    if (action === 'dashboard') {
      setView('DASHBOARD');
    } else if (action === 'record' && activePatient) {
      handleViewRecord(activePatient);
    } else if (action === 'new-session' && activePatient) {
      const newSession = createNewSession(activePatient);
      storage.saveSession(newSession);
      setActiveSession(newSession);
      setView('SESSION');
    }
  };

  if (view === 'WELCOME') {
    return (
      <Welcome
        hasExistingPatients={patients.length > 0}
        onStart={() => setView('INTAKE')}
        onContinue={() => setView('DASHBOARD')}
      />
    );
  }

  if (view === 'DASHBOARD') {
    return (
      <Dashboard
        patients={patients}
        onSelect={handlePatientSelect}
        onViewRecord={handleViewRecord}
        onNew={() => setView('INTAKE')}
        onBack={() => setView('WELCOME')}
      />
    );
  }

  if (view === 'INTAKE') {
    return (
      <Intake
        onComplete={handleIntakeComplete}
        onBack={() => setView('WELCOME')}
      />
    );
  }

  if (view === 'SESSION' && activePatient && activeSession) {
    return (
      <SessionView
        patient={activePatient}
        session={activeSession}
        onSessionUpdate={handleSessionUpdate}
        onComplete={handleComplete}
      />
    );
  }

  if (view === 'RECORD' && recordPatient) {
    return (
      <PatientRecord
        patient={recordPatient}
        sessions={recordSessions}
        onBack={() => setView('DASHBOARD')}
      />
    );
  }

  return null;
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: TypeScript error about `Dashboard` missing `onViewRecord` prop — fix in Task 8.

**Step 3: Commit (even with the expected error)**

Skip commit until Task 8 fixes the Dashboard prop.

---

## Task 8: Update `dashboard.tsx` — Add `onViewRecord` and Eye Icon

**Files:**
- Modify: `components/stages/dashboard.tsx`

**Step 1: Read the full `dashboard.tsx`, then make these changes:**

1. Add `onViewRecord: (patient: Patient) => void` to `DashboardProps` interface.

2. Add it as a parameter in the function signature.

3. On each patient card (the `motion.button`), add an "eye" icon button for completed patients (those whose active session is at stage 5 or have no active session). The eye button calls `onViewRecord(patient)` and stops propagation so the card click doesn't also trigger.

Find the patient card section and add this inside the card, visible only when the patient has a completed session:

```tsx
// At the top of the component, after sessionMap useMemo:
// Check if patient has any sessions at all (to know if they have a record to view)
const hasRecord = (patientId: string) => {
  const session = sessionMap.get(patientId);
  return session !== undefined; // has at least started a session
};
```

Then inside each patient `motion.button`, before the closing tag, add:

```tsx
{hasRecord(patient.id) && (
  <motion.button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onViewRecord(patient);
    }}
    whileTap={{ scale: 0.9 }}
    className="absolute top-4 right-4 p-2 rounded-lg"
    style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}
    title="Ver expediente"
  >
    <Eye size={14} />
  </motion.button>
)}
```

Add `Eye` to the Phosphor Icons import: `import { Plus, ArrowLeft, Eye } from '@phosphor-icons/react';`

Add `position: 'relative'` to the patient card's `motion.button` style so the absolute positioning works.

**Step 2: Verify full build passes**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Generating static pages (4/4)` with no errors.

**Step 3: Commit everything**

```bash
git add app/page.tsx components/stages/dashboard.tsx
git commit -m "feat: wire RECORD view, multi-session, and therapist eye icon in dashboard"
```

---

## Task 9: Final Push to Vercel

**Step 1: Verify complete build one more time**

```bash
npm run build 2>&1 | tail -10
```
Expected: Clean build, `○ (Static)  prerendered as static content`

**Step 2: Push to trigger Vercel deploy**

```bash
git push origin main
```

**Step 3: Verify on Vercel**
- Welcome screen loads ✓
- Create a patient through intake ✓
- Complete full flow through all 5 stages ✓
- Stage 5 shows 3 action cards + reflection questions ✓
- "Ver expediente" opens PatientRecord with all sections ✓
- "Iniciar nuevo proceso" creates a new session (stage 2) ✓
- Dashboard shows eye icon on patients with sessions ✓
- Eye icon opens PatientRecord ✓
