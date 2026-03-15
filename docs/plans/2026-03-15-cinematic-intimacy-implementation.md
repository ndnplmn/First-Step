# Cinematic Intimacy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Elevar la experiencia del paciente a nivel Awwwards 2026 con atmósferas de color por etapa, transiciones cinematográficas entre capítulos, streaming simulado de texto AI con cursor parpadeante, y micro-interacciones con peso físico.

**Architecture:** No new dependencies. Builds entirely on existing motion/react, CSS custom properties, and Next.js 15 Server Actions. Streaming is simulated client-side (full AI response → animated character-by-character reveal) to avoid streaming Server Action complexity while achieving identical visual result. Stage atmospheres use a CSS variable `--stage-bg` injected via inline style on the `SessionView` wrapper.

**Tech Stack:** Next.js 15, motion/react (useReducedMotion, AnimatePresence, motion), CSS custom properties, Tailwind CSS v4, @phosphor-icons/react

---

### Task 1: CSS Foundation — Grain animation, focus styles, reduced-motion, fluid type

**Files:**
- Modify: `app/globals.css`

**Context:** The current `globals.css` has a single static grain overlay (`body::before`), hardcoded font sizes, no `prefers-reduced-motion` support, and input focus handled via inline JS `onFocus`/`onBlur` events in components. This task adds: a second rotating grain layer, CSS-based input focus glow, reduced-motion safety, and fluid display type size.

**Step 1: Open the file and locate the existing `body::before` grain block**

Read: `app/globals.css` — find the `body::before` rule and the `@keyframes breathe` block.

**Step 2: Add the second grain layer and new keyframes**

After the existing `body::before` block, add:

```css
body::after {
  content: '';
  position: fixed;
  inset: -50%;
  width: 200%;
  height: 200%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
  animation: grain-drift 120s linear infinite;
}

@keyframes grain-drift {
  0%   { transform: rotate(0deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1.1); }
}
```

**Step 3: Add textarea and input focus styles via CSS**

After the existing scrollbar CSS, add:

```css
textarea:focus,
input:focus {
  outline: none;
  border-color: var(--color-sage) !important;
  box-shadow: 0 0 0 3px rgba(74, 103, 65, 0.12);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

textarea,
input {
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
```

**Step 4: Add prefers-reduced-motion block at end of file**

```css
@media (prefers-reduced-motion: reduce) {
  .breathe {
    animation: none;
  }
  body::after {
    animation: none;
  }
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 5: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully` with no TypeScript errors.

**Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat: add rotating grain layer, CSS focus styles, reduced-motion support"
```

---

### Task 2: Welcome Screen Redesign — Bicolor title, gradient bg, ghost CTA

**Files:**
- Modify: `components/stages/welcome.tsx`

**Context:** Current Welcome has a single-color title in `--color-deep` at ~72px with a breathe animation. Both CTAs are solid buttons in the FloatingBar. This task redesigns: title splits into two colors ("First" deep, "Step" terracotta), adds a warm radial gradient background, improves entrance animation easing, and makes the secondary CTA a ghost button.

**Step 1: Read the current file**

Read: `components/stages/welcome.tsx`

**Step 2: Replace the entire file content**

```tsx
'use client';

import { motion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';

interface WelcomeProps {
  hasExistingPatients: boolean;
  onStart: () => void;
  onContinue: () => void;
}

export function Welcome({ hasExistingPatients, onStart, onContinue }: WelcomeProps) {
  return (
    <div
      className="min-h-screen max-w-[680px] mx-auto px-6 pt-[20vh] pb-12 relative"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(193,127,89,0.13), transparent)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h1
          className="leading-[0.92] breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(64px, 14vw, 112px)',
            fontStyle: 'italic',
          }}
        >
          <span style={{ color: 'var(--color-deep)' }}>First</span>
          <br />
          <span style={{ color: 'var(--color-terracotta)' }}>Step</span>
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        className="mt-8 text-lg leading-relaxed max-w-[360px]"
        style={{ color: 'var(--color-muted)' }}
      >
        Tu primer paso hacia el autoconocimiento. Un espacio íntimo, guiado y tuyo.
      </motion.p>

      <FloatingBar visible>
        <motion.button
          onClick={onStart}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Comenzar sesión
        </motion.button>

        {hasExistingPatients && (
          <motion.button
            onClick={onContinue}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl font-medium text-sm"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              background: 'transparent',
            }}
          >
            Ver expedientes
          </motion.button>
        )}
      </FloatingBar>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add components/stages/welcome.tsx
git commit -m "feat: redesign Welcome with bicolor display title, gradient bg, ghost CTA"
```

---

### Task 3: AIThinking Redesign — Breathing orb + rotating phrases

**Files:**
- Modify: `components/ai/ai-thinking.tsx`

**Context:** Current AIThinking shows 3 bouncing dots with a pulsing ring. This task replaces it with a breathing orb (pulsing circle) and rotating contextual phrases using AnimatePresence. The component accepts an optional `phrases` prop so each stage can show relevant messages.

**Step 1: Replace the entire file content**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const DEFAULT_PHRASES = [
  'Analizando tu historia...',
  'Conectando perspectivas...',
  'Formulando comprensión...',
];

interface AIThinkingProps {
  phrases?: string[];
}

export function AIThinking({ phrases = DEFAULT_PHRASES }: AIThinkingProps) {
  const [index, setIndex] = useState(0);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (index >= phrases.length - 1) return;
    const t = setTimeout(() => setIndex(i => i + 1), 2500);
    return () => clearTimeout(t);
  }, [index, phrases.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-4 py-2"
    >
      <motion.div
        className="w-10 h-10 rounded-full flex-shrink-0"
        style={{ background: 'var(--color-sage)' }}
        animate={
          shouldReduce
            ? { opacity: 0.7 }
            : { scale: [1, 1.1, 1], opacity: [0.55, 0.85, 0.55] }
        }
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-sm italic"
          style={{ color: 'var(--color-muted)' }}
        >
          {phrases[index]}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add components/ai/ai-thinking.tsx
git commit -m "feat: redesign AIThinking with breathing orb and rotating contextual phrases"
```

---

### Task 4: ChapterProgress — Segment bar replacing dots

**Files:**
- Modify: `components/ui/chapter-progress.tsx`

**Context:** Current component shows 5 dots connected by lines. Replace with a row of 5 rectangular segment bars (32px × 4px each) with rounded corners. Completed = filled `--color-deep`. Active = filled `--color-sage` with pulse. Pending = `--color-border`. Stage name label remains.

**Step 1: Replace the entire file content**

```tsx
'use client';

import { motion, useReducedMotion } from 'motion/react';

const STAGES = [
  { number: 1, name: 'Apertura' },
  { number: 2, name: 'Conflictos' },
  { number: 3, name: 'Recuerdos' },
  { number: 4, name: 'Comprensión' },
  { number: 5, name: 'Cierre' },
];

interface ChapterProgressProps {
  currentStage: 1 | 2 | 3 | 4 | 5;
}

export function ChapterProgress({ currentStage }: ChapterProgressProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {STAGES.map((stage) => {
          const isDone = stage.number < currentStage;
          const isActive = stage.number === currentStage;

          return (
            <motion.div
              key={stage.number}
              className="h-[3px] rounded-full"
              style={{
                width: 28,
                background: isDone
                  ? 'var(--color-deep)'
                  : isActive
                  ? 'var(--color-sage)'
                  : 'var(--color-border)',
              }}
              animate={
                isActive && !shouldReduce
                  ? { opacity: [1, 0.6, 1] }
                  : { opacity: 1 }
              }
              transition={
                isActive
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0 }
              }
              layout
            />
          );
        })}
      </div>

      <motion.span
        key={currentStage}
        initial={{ opacity: 0, x: 4 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs"
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-muted)' }}
      >
        {STAGES[currentStage - 1].name}
      </motion.span>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add components/ui/chapter-progress.tsx
git commit -m "feat: replace ChapterProgress dots with cinematic segment bar"
```

---

### Task 5: ChapterTransition — Full-screen overlay between stages

**Files:**
- Create: `components/ui/chapter-transition.tsx`

**Context:** New component. When the patient advances between stages, a full-screen overlay appears for ~1.8 seconds showing: the color of the destination stage, a ghosted roman numeral, a line that draws left-to-right, and the stage name in mono uppercase. Then it fades out and `onComplete` fires.

**Step 1: Create the file**

```tsx
'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STAGE_META: Record<number, { roman: string; name: string; bg: string }> = {
  2: { roman: 'II',  name: 'CONFLICTOS',  bg: 'rgba(107, 94, 82, 1)' },
  3: { roman: 'III', name: 'RECUERDOS',   bg: 'rgba(80, 72, 110, 1)' },
  4: { roman: 'IV',  name: 'COMPRENSIÓN', bg: 'rgba(52, 78, 46, 1)'  },
  5: { roman: 'V',   name: 'CIERRE',      bg: 'rgba(130, 100, 50, 1)'},
};

interface ChapterTransitionProps {
  toStage: number;
  onComplete: () => void;
}

export function ChapterTransition({ toStage, onComplete }: ChapterTransitionProps) {
  const shouldReduce = useReducedMotion();
  const meta = STAGE_META[toStage] ?? STAGE_META[2];

  useEffect(() => {
    const delay = shouldReduce ? 300 : 1900;
    const t = setTimeout(onComplete, delay);
    return () => clearTimeout(t);
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <motion.div
        className="fixed inset-0 z-50"
        style={{ background: meta.bg }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: meta.bg }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 28 }}
    >
      {/* Ghosted roman numeral */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(120px, 22vw, 200px)',
          fontStyle: 'italic',
          color: 'white',
          lineHeight: 1,
          userSelect: 'none',
          position: 'absolute',
        }}
      >
        {meta.roman}
      </motion.div>

      {/* Centered label group */}
      <div className="relative flex flex-col items-center gap-4 z-10">
        {/* Drawing line */}
        <motion.div
          style={{ height: 1, background: 'rgba(255,255,255,0.4)' }}
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
        />

        {/* Stage name */}
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ delay: 0.65, duration: 0.35 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.2em',
            color: 'white',
          }}
        >
          {meta.name}
        </motion.span>
      </div>
    </motion.div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add components/ui/chapter-transition.tsx
git commit -m "feat: create ChapterTransition full-screen cinematic overlay between stages"
```

---

### Task 6: SessionView — Stage atmospheres + ChapterTransition integration

**Files:**
- Modify: `components/stages/session-view.tsx`

**Context:** SessionView currently switches stages immediately when `advanceStage` is called. This task adds: (1) a `pendingStage` state that holds the next stage while `ChapterTransition` is shown, (2) stage-specific gradient backgrounds applied to the wrapper div, (3) `AnimatePresence` wrapping the transition component. The `advanceStage` function now shows the transition first, then applies the stage change in `handleTransitionComplete`.

**Step 1: Read the current file**

Read: `components/stages/session-view.tsx`

**Step 2: Replace the entire file content**

```tsx
'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Patient, PatientSession, Conflict, TheoryMatch, Memory, Interpretation, UnmappedPhrase } from '@/lib/types';
import { SessionHeader } from '@/components/ui/session-header';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { StageConflicts } from './stage-conflicts';
import { StageMemories } from './stage-memories';
import { StageInterpretation } from './stage-interpretation';
import { StageClosure } from './stage-closure';

const STAGE_GRADIENTS: Record<number, string> = {
  2: 'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(107,94,82,0.09), transparent)',
  3: 'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(122,110,158,0.09), transparent)',
  4: 'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(74,103,65,0.09), transparent)',
  5: 'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(196,163,90,0.09), transparent)',
};

interface SessionViewProps {
  patient: Patient;
  session: PatientSession;
  onSessionUpdate: (session: PatientSession) => void;
  onComplete: () => void;
}

export function SessionView({ patient, session, onSessionUpdate, onComplete }: SessionViewProps) {
  const [pendingUpdates, setPendingUpdates] = useState<Partial<PatientSession> | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [targetStage, setTargetStage] = useState<number>(session.stage);

  const advanceStage = (updates: Partial<PatientSession>) => {
    const nextStage = Math.min(session.stage + 1, 5);
    setPendingUpdates(updates);
    setTargetStage(nextStage);
    setShowTransition(true);
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    const updated: PatientSession = {
      ...session,
      ...(pendingUpdates ?? {}),
      stage: targetStage as 1 | 2 | 3 | 4 | 5,
      updatedAt: Date.now(),
    };
    setPendingUpdates(null);
    onSessionUpdate(updated);
  };

  const updateSession = (updates: Partial<PatientSession>) => {
    const updated: PatientSession = { ...session, ...updates, updatedAt: Date.now() };
    onSessionUpdate(updated);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: STAGE_GRADIENTS[session.stage] ?? 'none',
        transition: 'background 0.8s ease',
      }}
    >
      <SessionHeader patient={patient} session={session} />

      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-8 pb-48">
        {session.stage === 2 && (
          <StageConflicts
            session={session}
            onAdvance={(conflicts: Conflict[], theoryMatch: TheoryMatch, unmapped: string[]) =>
              advanceStage({
                conflicts,
                theoryMatch,
                unmappedPhrases: unmapped.map((text: string): UnmappedPhrase => ({
                  text,
                  sessionNumber: session.sessionNumber,
                })),
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 3 && (
          <StageMemories
            session={session}
            onAdvance={(memories: Memory[], newUnmapped: string[]) =>
              advanceStage({
                memories,
                unmappedPhrases: [
                  ...session.unmappedPhrases,
                  ...newUnmapped.map((text: string): UnmappedPhrase => ({
                    text,
                    sessionNumber: session.sessionNumber,
                  })),
                ],
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 4 && (
          <StageInterpretation
            session={session}
            onAdvance={(interpretation: Interpretation) => advanceStage({ interpretation })}
            onUpdate={updateSession}
          />
        )}

        {session.stage === 5 && (
          <StageClosure
            session={session}
            onComplete={onComplete}
            onUpdate={updateSession}
          />
        )}
      </main>

      <AnimatePresence>
        {showTransition && (
          <ChapterTransition
            toStage={targetStage}
            onComplete={handleTransitionComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add components/stages/session-view.tsx
git commit -m "feat: add stage color atmospheres and cinematic ChapterTransition to SessionView"
```

---

### Task 7: useAIStream hook — Simulated character-by-character reveal

**Files:**
- Create: `hooks/use-ai-stream.ts`

**Context:** New hook. Takes a full text string and "streams" it character-by-character using `setInterval`, targeting ~5 seconds of total reveal time regardless of text length. Used by StageInterpretation and StageClosure to give the AI response a typewriter feel. Cleans up the interval on unmount.

**Step 1: Create the hooks directory if needed and create the file**

```bash
mkdir -p hooks
```

```ts
// hooks/use-ai-stream.ts
import { useState, useRef, useEffect, useCallback } from 'react';

const TARGET_MS = 5000;
const INTERVAL_MS = 25;

export function useAIStream() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef(0);
  const fullTextRef = useRef('');

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startStream = useCallback((fullText: string) => {
    clear();
    fullTextRef.current = fullText;
    posRef.current = 0;
    setText('');
    setIsStreaming(true);
    setIsDone(false);

    const chunkSize = Math.max(1, Math.floor(fullText.length / (TARGET_MS / INTERVAL_MS)));

    intervalRef.current = setInterval(() => {
      posRef.current = Math.min(posRef.current + chunkSize, fullText.length);
      setText(fullText.slice(0, posRef.current));

      if (posRef.current >= fullText.length) {
        clear();
        setIsStreaming(false);
        setIsDone(true);
      }
    }, INTERVAL_MS);
  }, []);

  useEffect(() => () => clear(), []);

  return { text, isStreaming, isDone, startStream };
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add hooks/use-ai-stream.ts
git commit -m "feat: create useAIStream hook for simulated typewriter text reveal"
```

---

### Task 8: StageInterpretation — Streaming cursor + animated grounding chips

**Files:**
- Modify: `components/stages/stage-interpretation.tsx`

**Context:** Current component receives the full AI text and shows it with stagger animation on mount. Replace with: (1) `useAIStream` to reveal text character by character, (2) a blinking cursor `|` at end of text while streaming, (3) grounding source chips that stagger-animate in after streaming is done, (4) FloatingBar only shows after `isDone`. The `generate` function still calls the regular (non-streaming) Server Action and passes the result text to `startStream`.

**Step 1: Read the current file**

Read: `components/stages/stage-interpretation.tsx`

**Step 2: Replace the entire file content**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { PatientSession, Interpretation } from '@/lib/types';
import { generateInterpretation } from '@/actions/ai';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { Heart, ArrowCounterClockwise, ArrowSquareOut } from '@phosphor-icons/react';

const THINKING_PHRASES = [
  'Analizando tu historia...',
  'Conectando perspectivas...',
  'Formulando comprensión...',
];

interface StageInterpretationProps {
  session: PatientSession;
  onAdvance: (interpretation: Interpretation) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageInterpretation({ session, onAdvance, onUpdate }: StageInterpretationProps) {
  const [fullInterpretation, setFullInterpretation] = useState<Interpretation | null>(
    session.interpretation ?? null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [resonated, setResonated] = useState(false);
  const [showRing, setShowRing] = useState(false);
  const { text, isStreaming, isDone, startStream } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.interpretation) {
      startStream(session.interpretation.text);
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullInterpretation(null);
    try {
      const result = await generateInterpretation({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
      });
      setFullInterpretation(result);
      onUpdate({ interpretation: result });
      startStream(result.text);
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResonate = () => {
    if (!fullInterpretation) return;
    setResonated(true);
    setShowRing(true);
    setTimeout(() => setShowRing(false), 600);
    const updated: Interpretation = { ...fullInterpretation, resonatedAt: Date.now() };
    setFullInterpretation(updated);
    onUpdate({ interpretation: updated });
  };

  const displayText = shouldReduce ? (fullInterpretation?.text ?? '') : text;
  const showContent = shouldReduce ? !!fullInterpretation : (isDone || isStreaming);

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 4 — Comprensión
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          Tu historia vista con claridad
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Basándome en todo lo que has compartido, aquí está lo que encuentro.
        </p>
      </div>

      {isGenerating && <AIThinking phrases={THINKING_PHRASES} />}

      {isError && !isGenerating && (
        <div
          className="rounded-2xl p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Hubo un problema al generar la interpretación.
          </p>
          <button
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
        <AICard
          sources={[]}
          actions={
            isDone ? (
              <>
                <div className="relative">
                  <motion.button
                    onClick={handleResonate}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all"
                    style={{
                      background: resonated ? 'var(--color-terracotta)' : 'var(--color-surface)',
                      color: resonated ? 'white' : 'var(--color-muted)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <motion.span
                      animate={resonated ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Heart size={14} weight={resonated ? 'fill' : 'regular'} />
                    </motion.span>
                    {resonated ? 'Me resuena' : 'Esto me resuena'}
                  </motion.button>
                  <AnimatePresence>
                    {showRing && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{}}
                        transition={{ duration: 0.5 }}
                        style={{ border: '2px solid var(--color-terracotta)' }}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  onClick={generate}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-muted)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <ArrowCounterClockwise size={14} />
                  Reformular
                </motion.button>
              </>
            ) : null
          }
        >
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

          {isDone && fullInterpretation?.groundingSources && fullInterpretation.groundingSources.length > 0 && (
            <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              {fullInterpretation.groundingSources.map((s, i) => (
                <motion.a
                  key={i}
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage)' }}
                >
                  <ArrowSquareOut size={10} />
                  {s.title}
                </motion.a>
              ))}
            </div>
          )}
        </AICard>
      )}

      <FloatingBar visible={isDone || (shouldReduce && !!fullInterpretation)}>
        <motion.button
          onClick={() => onAdvance(fullInterpretation!)}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Continuar al cierre →
        </motion.button>
      </FloatingBar>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add components/stages/stage-interpretation.tsx
git commit -m "feat: add streaming typewriter reveal, blinking cursor, and animated grounding chips to StageInterpretation"
```

---

### Task 9: StageClosure — Streaming cursor

**Files:**
- Modify: `components/stages/stage-closure.tsx`

**Context:** Same streaming pattern as StageInterpretation. Read the current file first, then apply `useAIStream` so closure text also reveals character-by-character with a blinking cursor. Grounding chips animate in after isDone.

**Step 1: Read the current file**

Read: `components/stages/stage-closure.tsx`

**Step 2: Replace the entire file content**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { PatientSession, Closure } from '@/lib/types';
import { generateClosure } from '@/actions/ai';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowCounterClockwise, ArrowSquareOut, Sparkle } from '@phosphor-icons/react';

const THINKING_PHRASES = [
  'Preparando tu cierre...',
  'Destilando lo esencial...',
  'Abriendo un nuevo camino...',
];

const NEXT_STEPS = [
  { icon: '🧘', label: 'Practica un momento de quietud hoy' },
  { icon: '📓', label: 'Escribe lo que descubriste en sesión' },
  { icon: '💬', label: 'Comparte una reflexión con alguien de confianza' },
];

interface StageClosureProps {
  session: PatientSession;
  onComplete: () => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageClosure({ session, onComplete, onUpdate }: StageClosureProps) {
  const [fullClosure, setFullClosure] = useState<Closure | null>(session.closure ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const { text, isStreaming, isDone, startStream } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.closure) {
      startStream(session.closure.text);
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullClosure(null);
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
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const displayText = shouldReduce ? (fullClosure?.text ?? '') : text;
  const showContent = shouldReduce ? !!fullClosure : (isDone || isStreaming);

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

          {isDone && fullClosure?.groundingSources && fullClosure.groundingSources.length > 0 && (
            <div
              className="mt-4 pt-4 flex flex-wrap gap-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              {fullClosure.groundingSources.map((s, i) => (
                <motion.a
                  key={i}
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage)' }}
                >
                  <ArrowSquareOut size={10} />
                  {s.title}
                </motion.a>
              ))}
            </div>
          )}
        </AICard>
      )}

      <AnimatePresence>
        {isDone && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-3"
          >
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
              <Sparkle size={14} weight="fill" style={{ color: 'var(--color-terracotta)' }} />
              Próximos pasos sugeridos
            </p>
            {NEXT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
              >
                <span className="text-xl">{step.icon}</span>
                <p className="text-sm leading-snug" style={{ color: 'var(--color-deep)' }}>
                  {step.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingBar visible={isDone || (shouldReduce && !!fullClosure)}>
        <motion.button
          onClick={onComplete}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Finalizar sesión
        </motion.button>
      </FloatingBar>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add components/stages/stage-closure.tsx
git commit -m "feat: add streaming typewriter reveal and animated next steps to StageClosure"
```

---

### Task 10: StageConflicts — Enhanced micro-interactions

**Files:**
- Modify: `components/stages/stage-conflicts.tsx`

**Context:** Current component has basic entry/exit animations but no `whileTap` on buttons. This task: (1) adds `whileTap={{ scale: 0.97 }}` to primary buttons, (2) improves the exit animation of conflict chips to `x: 16` (more pronounced slide out), (3) adds `whileHover={{ x: 2 }}` to the X delete button, (4) removes the inline `onFocus`/`onBlur` JS handlers from the textarea (now handled by CSS from Task 1), (5) adds contextual AIThinking phrases.

**Step 1: Read the current file**

Read: `components/stages/stage-conflicts.tsx`

**Step 2: Apply targeted edits**

**Edit 1 — Remove inline focus handlers and add placeholder style to textarea:**

Old:
```tsx
        className="w-full bg-transparent outline-none resize-none p-4 rounded-xl border-2 transition-all"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
        onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
        onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
```

New:
```tsx
        className="w-full bg-transparent outline-none resize-none p-4 rounded-xl border-2"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
```

**Edit 2 — Improve exit animation on conflict chips:**

Old: `exit={{ opacity: 0, x: 8 }}`
New: `exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}`

**Edit 3 — Add whileHover to delete button and convert to motion.button:**

Old:
```tsx
            <button
              onClick={() => removeConflict(i)}
              className="mt-0.5 transition-colors"
              style={{ color: 'var(--color-muted)' }}
              onMouseEnter={e => ((e.target as HTMLButtonElement).style.color = 'var(--color-terracotta)')}
              onMouseLeave={e => ((e.target as HTMLButtonElement).style.color = 'var(--color-muted)')}
            >
              <X size={16} />
            </button>
```

New:
```tsx
            <motion.button
              onClick={() => removeConflict(i)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.9 }}
              className="mt-0.5"
              style={{ color: 'var(--color-muted)' }}
            >
              <X size={16} />
            </motion.button>
```

**Edit 4 — Add whileTap to primary buttons:**

Old analyze button:
```tsx
            className="w-full py-3.5 rounded-xl font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-sage)' }}
```

New (convert to motion.button and add whileTap):
```tsx
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-xl font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-sage)' }}
```

Similarly convert both FloatingBar buttons to `motion.button` with `whileTap`.

**Edit 5 — Add contextual phrases to AIThinking:**

Old: `{isAnalyzing && <AIThinking />}`
New:
```tsx
{isAnalyzing && (
  <AIThinking phrases={['Leyendo entre líneas...', 'Identificando patrones...', 'Conectando con la teoría...']} />
)}
```

**Edit 6 — Add motion import:**

Add `useReducedMotion` to motion imports if not present, and ensure `motion` is imported.

Old import line: `import { motion, AnimatePresence } from 'motion/react';`
New: `import { motion, AnimatePresence } from 'motion/react';` (unchanged, already imported)

**Step 3: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add components/stages/stage-conflicts.tsx
git commit -m "feat: enhance StageConflicts micro-interactions — whileTap buttons, improved exit, contextual AI phrases"
```

---

### Task 11: StageMemories — Keywords spring animation + whileTap

**Files:**
- Modify: `components/stages/stage-memories.tsx`

**Context:** Read the current StageMemories file. Apply: (1) spring animation to keyword chips when they appear, (2) `whileHover={{ scale: 1.04 }}` on keywords, (3) `whileTap={{ scale: 0.97 }}` on primary buttons, (4) remove inline `onFocus`/`onBlur` JS from textareas, (5) contextual AIThinking phrases.

**Step 1: Read the current file**

Read: `components/stages/stage-memories.tsx`

**Step 2: Locate keyword rendering and wrap with motion**

Find where keywords are rendered (likely a `.map()` over `memory.keywords`). Wrap each keyword span with:

```tsx
<motion.span
  key={keyword}
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  whileHover={{ scale: 1.04 }}
  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
  className="px-2.5 py-1 rounded-full text-xs font-medium"
  style={{ background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}
>
  {keyword}
</motion.span>
```

**Step 3: Add whileTap to primary action buttons**

Convert all `<button>` elements that trigger AI actions or form progression to `<motion.button>` with `whileTap={{ scale: 0.97 }}`.

**Step 4: Remove inline focus handlers from textareas**

Remove any `onFocus`/`onBlur` handlers that manipulate `borderColor` inline — CSS handles it now.

**Step 5: Add contextual phrases to AIThinking**

Old: `<AIThinking />`
New:
```tsx
<AIThinking phrases={['Escuchando el recuerdo...', 'Extrayendo la esencia...']} />
```

**Step 6: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 7: Commit**

```bash
git add components/stages/stage-memories.tsx
git commit -m "feat: add keyword spring animations and whileTap micro-interactions to StageMemories"
```

---

### Task 12: Final build, push & verify

**Files:** none

**Step 1: Full build verification**

Run: `npm run build`
Expected: `✓ Compiled successfully` with no TypeScript errors or warnings.

**Step 2: Check for unused imports**

Run: `npm run lint`
Fix any lint errors before pushing.

**Step 3: Push to GitHub (triggers Netlify deploy)**

```bash
git push origin main
```

**Step 4: Monitor Netlify deploy**

In the Netlify dashboard, go to **Deploys** and watch the build log. Expected:
- Build time: ~2-3 minutes
- Status: **Published**

**Step 5: Smoke test on the live URL**

1. Open the Netlify URL
2. Verify Welcome screen shows bicolor title and gradient background
3. Create a test patient through Intake
4. In StageConflicts: add a conflict, verify AIThinking shows orbe + rotating phrases
5. Advance to StageMemories: verify keyword chips animate in with spring
6. Advance to StageInterpretation: verify text streams in character by character with blinking cursor
7. Verify ChapterTransition full-screen overlay appears between each stage advance
8. Advance to StageClosure: verify streaming + next steps animate in

**Step 6: Done ✓**
