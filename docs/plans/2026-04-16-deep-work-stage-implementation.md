# Deep Work Stage (Integración) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Stage 5 "Trabajo Activo" between Interpretation and Closure — user picks one of 3 work cards, has a brief focused dialogue (2–3 exchanges), gets a synthesis, then moves to Closure (now stage 6).

**Architecture:** New `StageDeepWork` component inserted at stage 5; Closure shifts to stage 6. Two new AI actions (`generateWorkCards`, `getDeepWorkResponse`). `reflectionQuestions` generation moves from StageClosure to StageDeepWork. The `deepWork.synthesis` is passed into `generateClosure` to enrich the letter.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript · Groq llama-3.3-70b-versatile · motion/react · @phosphor-icons/react

---

## Task 1: Extend types in `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

**Step 1: Add WorkCard and DeepWorkSession types**

After the `Closure` type (line ~97), insert:

```typescript
export type WorkCard = {
  id: string;
  title: string;       // action-oriented: "Explorar por qué evitas el conflicto"
  subtitle: string;    // original reflection question shown in italics
  openingLine: string; // first therapist message when this card is selected
};

export type DeepWorkSession = {
  selectedCard: WorkCard;
  messages: { role: 'patient' | 'therapist'; text: string }[];
  synthesis: string;
};
```

**Step 2: Add deepWork field to PatientSession and extend stage union**

In `PatientSession`, change `stage: 1 | 2 | 3 | 4 | 5;` → `stage: 1 | 2 | 3 | 4 | 5 | 6;`

After `reflectionQuestions?: string[];`, add:
```typescript
deepWork?: DeepWorkSession;
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: 0 errors (stage cast in session-view.tsx will need updating — that's Task 4).

**Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add WorkCard, DeepWorkSession types and extend stage to 6"
```

---

## Task 2: Add AI actions to `actions/ai.ts`

**Files:**
- Modify: `actions/ai.ts`

**Step 1: Add WorkCard import at top of file**

Change the type import line to include the new types:
```typescript
import { Patient, Conflict, Memory, FrameworkMatch, GestaltActivity, Interpretation, Closure, LifeChanges, Stage3Type, WorkCard } from '@/lib/types';
```

**Step 2: Add `generateWorkCards` after `generateReflectionQuestions` (around line 355)**

```typescript
// --- ACTION 5b: Generar tarjetas de trabajo activo ---
export async function generateWorkCards(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  reflectionQuestions: string[];
  interpretation: string;
}): Promise<WorkCard[]> {
  const { conflicts, frameworkMatches, reflectionQuestions, interpretation } = params;

  const prompt = `
Eres un psicoterapeuta que acaba de entregar una interpretación a su paciente y ahora propone tres líneas de trabajo activo para la sesión.

Interpretación dada al paciente:
"${interpretation}"

Conflictos del paciente: ${conflicts.map(c => c.synthesized).join(', ')}

Marco terapéutico: ${formatFrameworks(frameworkMatches)}

Preguntas de reflexión base (una por tarjeta):
${reflectionQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Para cada pregunta de reflexión, genera una tarjeta de trabajo activo con:
- "title": frase de acción en infinitivo, 4-8 palabras, específica al conflicto (ej: "Explorar la culpa hacia tu madre", "Entender por qué evitas el conflicto")
- "subtitle": la pregunta de reflexión original, sin modificar
- "openingLine": primera frase del terapeuta al abrir este hilo de trabajo. Cálida, directa, invita a hablar. Máximo 20 palabras. Segunda persona singular. NO empieces con "¡"

Responde SOLO con JSON: { "cards": [ { "id": "1", "title": "...", "subtitle": "...", "openingLine": "..." }, ... ] }
  `;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });
    content = response.choices[0]?.message?.content || '{"cards":[]}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  const cards: WorkCard[] = Array.isArray(parsed.cards) ? parsed.cards.slice(0, 3) : [];
  return cards;
}
```

**Step 3: Add `getDeepWorkResponse` after `generateWorkCards`**

```typescript
// --- ACTION 5c: Respuesta terapéutica en modo resolutivo ---
export async function getDeepWorkResponse(params: {
  selectedCard: WorkCard;
  messages: { role: 'patient' | 'therapist'; text: string }[];
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  interpretation: string;
  patient: Patient;
}): Promise<{ done: boolean; response: string; synthesis?: string }> {
  const { selectedCard, messages, conflicts, frameworkMatches, interpretation, patient } = params;

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const forceClose = patientTurns >= 2;

  const history = messages.map(m =>
    `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`
  ).join('\n');

  const prompt = `
Eres un psicoterapeuta en una sesión activa. Ya conoces al paciente a fondo y acabas de darle una interpretación. Ahora estás trabajando un punto específico con él/ella.

Paciente: ${buildPatientContext(patient)}
Conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
Marco: ${formatFrameworks(frameworkMatches)}
Interpretación dada: "${interpretation}"

Línea de trabajo elegida por el paciente: "${selectedCard.title}"
Pregunta base: "${selectedCard.subtitle}"

Conversación hasta ahora:
${history || '(El paciente aún no ha respondido)'}

${forceClose
  ? `INSTRUCCIÓN: Han tenido suficientes intercambios. Genera la síntesis final ahora.
     Responde con: { "done": true, "response": "[síntesis de 2-3 oraciones: lo que el paciente llegó a ver o sentir en este trabajo, en segunda persona, sin lenguaje técnico, cálido]", "synthesis": "[mismo texto]" }`
  : `INSTRUCCIÓN: Estás en modo resolutivo — no exploración abierta. Haz UNA pregunta que lleve al paciente hacia un insight concreto sobre "${selectedCard.title}". Máximo 20 palabras. Segunda persona. No uses "¿Podrías...?" ni "¿Me puedes decir...?".
     Responde con: { "done": false, "response": "[tu pregunta]", "synthesis": null }`
}

Responde SOLO con JSON con esa estructura exacta.
  `;

  let content: string;
  try {
    const response = await getAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.65,
    });
    content = response.choices[0]?.message?.content || '{"done":true,"response":"","synthesis":""}';
  } catch (error) {
    handleAIError(error);
  }

  const parsed = JSON.parse(content);
  return {
    done: !!parsed.done,
    response: parsed.response ?? '',
    synthesis: parsed.synthesis ?? undefined,
  };
}
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Commit**

```bash
git add actions/ai.ts
git commit -m "feat: add generateWorkCards and getDeepWorkResponse AI actions"
```

---

## Task 3: Create `components/stages/stage-deep-work.tsx`

**Files:**
- Create: `components/stages/stage-deep-work.tsx`

**Step 1: Write the full component**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, WorkCard, DeepWorkSession } from '@/lib/types';
import { generateReflectionQuestions, generateWorkCards, getDeepWorkResponse } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowRight, ArrowCounterClockwise } from '@phosphor-icons/react';

const LOADING_PHRASES = [
  'Pensando en lo que más importa ahora...',
  'Eligiendo los hilos más vivos...',
  'Preparando algo concreto para ti...',
];

const WORKING_PHRASES = [
  'Escuchando...',
  'Pensando contigo...',
  'Un momento...',
];

type DeepWorkView = 'loading' | 'selecting' | 'working' | 'done';

interface StageDeepWorkProps {
  session: PatientSession;
  patient: Patient;
  onAdvance: (deepWork: DeepWorkSession) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageDeepWork({ session, patient, onAdvance, onUpdate }: StageDeepWorkProps) {
  const shouldReduce = useReducedMotion();

  const [view, setView] = useState<DeepWorkView>(() => {
    if (session.deepWork?.synthesis) return 'done';
    return 'loading';
  });

  const [cards, setCards] = useState<WorkCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<WorkCard | null>(
    session.deepWork?.selectedCard ?? null
  );
  const [messages, setMessages] = useState<{ role: 'patient' | 'therapist'; text: string }[]>(
    session.deepWork?.messages ?? []
  );
  const [synthesis, setSynthesis] = useState<string>(session.deepWork?.synthesis ?? '');
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isError, setIsError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (view === 'loading') {
      loadCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCards = async () => {
    setIsError(false);
    try {
      // Generate reflection questions if not already in session
      let questions = session.reflectionQuestions ?? [];
      if (questions.length === 0) {
        questions = await generateReflectionQuestions({
          conflicts: session.conflicts,
          frameworkMatches: session.frameworkMatches,
          closure: session.interpretation?.text ?? '',
        });
        onUpdate({ reflectionQuestions: questions });
      }

      const workCards = await generateWorkCards({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        reflectionQuestions: questions,
        interpretation: session.interpretation?.text ?? '',
      });

      setCards(workCards);
      setView('selecting');
    } catch (e) {
      console.error(e);
      setIsError(true);
    }
  };

  const handleSelectCard = async (card: WorkCard) => {
    setSelectedCard(card);
    setView('working');

    // Open with the card's opening line
    const openingMsg = { role: 'therapist' as const, text: card.openingLine };
    setMessages([openingMsg]);

    const partial: Partial<PatientSession> = {
      deepWork: { selectedCard: card, messages: [openingMsg], synthesis: '' },
    };
    onUpdate(partial);

    setTimeout(() => textareaRef.current?.focus(), 150);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (trimmed.length < 2 || !selectedCard) return;

    const patientMsg = { role: 'patient' as const, text: trimmed };
    const newMessages = [...messages, patientMsg];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      const result = await getDeepWorkResponse({
        selectedCard,
        messages: newMessages,
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        interpretation: session.interpretation?.text ?? '',
        patient,
      });

      const therapistMsg = { role: 'therapist' as const, text: result.response };
      const finalMessages = [...newMessages, therapistMsg];
      setMessages(finalMessages);

      if (result.done && result.synthesis) {
        setSynthesis(result.synthesis);
        const deepWork: DeepWorkSession = {
          selectedCard,
          messages: finalMessages,
          synthesis: result.synthesis,
        };
        onUpdate({ deepWork });
        setView('done');
      } else {
        onUpdate({
          deepWork: { selectedCard, messages: finalMessages, synthesis: '' },
        });
        setTimeout(() => textareaRef.current?.focus(), 150);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  const handleAdvance = () => {
    if (!selectedCard || !synthesis) return;
    onAdvance({
      selectedCard,
      messages,
      synthesis,
    });
  };

  return (
    <div className="space-y-8 pb-48">
      {/* Header */}
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Fase 3 — Integración
        </p>
        <AnimatePresence mode="wait">
          {view === 'loading' && (
            <motion.div key="h-loading"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                Preparando el trabajo
              </h2>
            </motion.div>
          )}
          {view === 'selecting' && (
            <motion.div key="h-selecting"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                ¿Qué quieres resolver hoy?
              </h2>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Elige uno. Lo trabajaremos juntos ahora mismo.
              </p>
            </motion.div>
          )}
          {(view === 'working' || view === 'done') && selectedCard && (
            <motion.div key="h-working"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[32px] leading-tight breathe"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                {selectedCard.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed italic"
                style={{ color: 'var(--color-muted)' }}>
                {selectedCard.subtitle}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading state */}
      {view === 'loading' && !isError && (
        <AIThinking phrases={LOADING_PHRASES} />
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-[var(--radius-card)] p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Hubo un problema al preparar el trabajo.
          </p>
          <button type="button" onClick={loadCards}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}>
            <ArrowCounterClockwise size={14} />
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Card selection */}
      <AnimatePresence>
        {view === 'selecting' && (
          <motion.div key="cards" className="space-y-3"
            initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => handleSelectCard(card)}
                initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileTap={shouldReduce ? {} : { scale: 0.98 }}
                className="w-full text-left p-5 rounded-[var(--radius-card)] space-y-1.5"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p className="font-medium text-[15px]" style={{ color: 'var(--color-deep)' }}>
                  {card.title}
                </p>
                <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  {card.subtitle}
                </p>
                <p className="text-xs font-medium mt-2" style={{ color: 'var(--color-sage)' }}>
                  Trabajar esto →
                </p>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue thread */}
      {(view === 'working' || view === 'done') && messages.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i}
                initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[85%] px-4 py-3.5 rounded-[18px]"
                  style={msg.role === 'patient' ? {
                    background: 'var(--color-sage)', color: 'white', borderBottomRightRadius: 6,
                  } : {
                    background: 'var(--color-surface)', color: 'var(--color-deep)',
                    borderBottomLeftRadius: 6, boxShadow: 'var(--shadow-card)',
                  }}>
                  <p className="leading-relaxed text-[15px]"
                    style={msg.role === 'therapist' ? { fontFamily: 'var(--font-display)' } : {}}>
                    {msg.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Thinking indicator */}
      {isThinking && <AIThinking phrases={WORKING_PHRASES} />}

      {/* Synthesis card — shown when done */}
      <AnimatePresence>
        {view === 'done' && synthesis && (
          <motion.div key="synthesis"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="rounded-[var(--radius-card)] p-6 space-y-3"
            style={{
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-card)',
              borderLeft: '3px solid var(--color-sage)',
            }}>
            <p className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)' }}>
              Lo que veo en lo que exploraste
            </p>
            <p className="text-base leading-relaxed"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
              {synthesis}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text input — only in working state */}
      <AnimatePresence>
        {view === 'working' && !isThinking && (
          <motion.div key="input-area"
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && input.trim().length >= 2) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe tu respuesta aquí…"
              rows={3}
              className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-terracotta)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FloatingBar */}
      <FloatingBar visible={true}>
        <div className="space-y-3">
          {view === 'working' && !isThinking && (
            <motion.button type="button"
              onClick={handleSend}
              disabled={input.trim().length < 2}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 tracking-wide"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}>
              Responder <ArrowRight size={16} />
            </motion.button>
          )}
          {view === 'done' && synthesis && (
            <motion.button type="button"
              onClick={handleAdvance}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 tracking-wide"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}>
              Continuar al cierre <ArrowRight size={16} />
            </motion.button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/stages/stage-deep-work.tsx
git commit -m "feat: add StageDeepWork component"
```

---

## Task 4: Update `session-view.tsx`

**Files:**
- Modify: `components/stages/session-view.tsx`

**Step 1: Add StageDeepWork import**

After the `StageInterpretation` import line, add:
```typescript
import { StageDeepWork } from './stage-deep-work';
```

**Step 2: Add gradient for stage 5**

In `STAGE_GRADIENTS`, add entry for stage 5 (use a warm terracotta tone to distinguish from stage 4):
```typescript
5: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(180,110,69,0.06), transparent)',
6: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(61,107,71,0.06), transparent)',
```
(Note: stage 5 takes the old stage 5 gradient; stage 6 uses what was stage 5's sage green)

**Step 3: Update advanceStage max**

Change:
```typescript
const nextStage = Math.min(session.stage + 1, 5);
```
To:
```typescript
const nextStage = Math.min(session.stage + 1, 6);
```

**Step 4: Update the stage cast in handleTransitionComplete**

Change:
```typescript
stage: targetStage as 1 | 2 | 3 | 4 | 5,
```
To:
```typescript
stage: targetStage as 1 | 2 | 3 | 4 | 5 | 6,
```

**Step 5: Add handleStage4Advance and route stages 5 and 6**

Add handler after `handleStage3ExposureAdvance`:
```typescript
const handleStage4Advance = (deepWork: import('@/lib/types').DeepWorkSession) => {
  advanceStage({ deepWork });
};
```

In the JSX, change the `session.stage === 4` block's `onAdvance` — interpretation currently advances directly to closure. Change the button from "Continuar al cierre →" to "Continuar →" by updating `stage-interpretation.tsx` (Step 6 below).

Add stage 5 routing (after stage 4 block):
```tsx
{session.stage === 5 && (
  <StageDeepWork
    session={session}
    patient={patient}
    onAdvance={handleStage4Advance}
    onUpdate={updateSession}
  />
)}
```

Change `session.stage === 5` for StageClosure to `session.stage === 6`:
```tsx
{session.stage === 6 && (
  <StageClosure
    session={session}
    patient={patient}
    onComplete={onComplete}
    onUpdate={updateSession}
  />
)}
```

**Step 6: Fix button text in `stage-interpretation.tsx`**

In `stage-interpretation.tsx`, line ~292, change the FloatingBar button text:
```tsx
// Before:
Continuar al cierre →
// After:
Continuar →
```

**Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 8: Commit**

```bash
git add components/stages/session-view.tsx components/stages/stage-interpretation.tsx
git commit -m "feat: route stage 5 to StageDeepWork, shift closure to stage 6"
```

---

## Task 5: Update `stage-closure.tsx`

**Files:**
- Modify: `components/stages/stage-closure.tsx`

**Step 1: Remove generateReflectionQuestions import**

In the import from `@/actions/ai`, remove `generateReflectionQuestions`:
```typescript
// Before:
import { generateClosure, generateReflectionQuestions, generateStrategies } from '@/actions/ai';
// After:
import { generateClosure, generateStrategies } from '@/actions/ai';
```

**Step 2: Remove reflectionQuestions state**

Delete these two lines:
```typescript
const [reflectionQuestions, setReflectionQuestions] = useState<string[]>(
  session.reflectionQuestions ?? []
);
```

**Step 3: Remove generateReflectionQuestions call from generate()**

Inside `generate()`, the `Promise.all` currently calls both `generateReflectionQuestions` and `generateStrategies`. Simplify to only `generateStrategies`:

```typescript
// Before:
const [questions, strats] = await Promise.all([
  generateReflectionQuestions({
    conflicts: session.conflicts,
    frameworkMatches: session.frameworkMatches,
    closure: result.text,
  }),
  generateStrategies({ ... }),
]);
setReflectionQuestions(questions);
setStrategies(strats);
const closureWithStrategies = { ...result, strategies: strats };
setFullClosure(closureWithStrategies);
onUpdate({ closure: closureWithStrategies, reflectionQuestions: questions });

// After:
const strats = await generateStrategies({ ... });
setStrategies(strats);
const closureWithStrategies = { ...result, strategies: strats };
setFullClosure(closureWithStrategies);
onUpdate({ closure: closureWithStrategies });
```

**Step 4: Remove useEffect condition for reflectionQuestions**

The `showActions` useEffect currently waits for `reflectionQuestions.length > 0`. Remove that condition:
```typescript
// Before:
if (isDone && reflectionQuestions.length > 0 && strategies.length > 0 && wellbeingAfter !== null) {
// After:
if (isDone && strategies.length > 0 && wellbeingAfter !== null) {
```

**Step 5: Remove the reflection questions AnimatePresence block**

Delete the entire section (approximately lines 186–220):
```tsx
{/* Preguntas de reflexión — con pausa después del cierre */}
<AnimatePresence>
  {showReady && reflectionQuestions.length > 0 && (
    <motion.div ...>
      <p ...>Antes de irte, tres preguntas para el camino</p>
      <div className="space-y-3">
        {reflectionQuestions.map((q, i) => ( ... ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**Step 6: Enrich generateClosure with deepWork synthesis**

In the `generate()` function, pass the deep work synthesis to `generateClosure`. First update the call:
```typescript
const result = await generateClosure({
  conflicts: session.conflicts,
  frameworkMatches: session.frameworkMatches,
  memories: session.memories,
  interpretation: session.interpretation!.text,
  gestaltActivity: session.gestaltActivity!,
  patient,
  deepWorkSynthesis: session.deepWork?.synthesis,  // NEW
});
```

In `actions/ai.ts`, update `generateClosure` signature to accept and use `deepWorkSynthesis`:
```typescript
export async function generateClosure(params: {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  memories: Memory[];
  interpretation: string;
  gestaltActivity: GestaltActivity | null;
  patient: Patient;
  deepWorkSynthesis?: string;  // NEW
}): Promise<Closure>
```

In the prompt, inject it after the interpretation line:
```typescript
${params.deepWorkSynthesis
  ? `\nEl paciente también trabajó activamente durante la sesión y llegó a esto:\n"${params.deepWorkSynthesis}"\nReconoce este trabajo activo en la carta — menciónalo como un logro concreto de esta sesión.`
  : ''}
```

**Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 8: Commit**

```bash
git add components/stages/stage-closure.tsx actions/ai.ts
git commit -m "feat: remove reflection questions from closure, inject deepWork synthesis into letter"
```

---

## Task 6: Final verification

**Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: EXIT 0.

**Step 2: Manual smoke test**

1. Start a session, go through stages 2 → 3 → 4 (interpretation)
2. Tap "Continuar →" → enters Stage 5 (loading cards)
3. 3 work cards appear → tap one
4. Dialogue opens with therapist opening line
5. Reply twice → synthesis appears automatically
6. Tap "Continuar al cierre" → enters Stage 6 (closure)
7. Closure letter generates — verify no "Antes de irte" section
8. Confirm strategies, wellbeing check-out, and action cards still work

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: stage 5 deep work integration complete"
```
