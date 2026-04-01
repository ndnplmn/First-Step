# Sprint 1: Humanización del Flujo Terapéutico — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove clinical terminology from the patient-facing UI, add emotional micro-reflections, consent before interpretation, and make grounding optional — all to make the app feel more like a conversation with a therapist and less like clinical software.

**Architecture:** Pure UI/prompt changes. No new components. Modify existing types, AI actions, and 4 stage components. Data flows remain identical — we add `narrativeSummary` to PatientSession and `reflection` to the therapist question response. No backend, no new routes, no new dependencies.

**Tech Stack:** Next.js 15, React 19, TypeScript, Framer Motion (motion/react), Groq SDK, Tailwind CSS, CSS custom properties.

---

### Task 1: Add `narrativeSummary` to types and AI action

**Files:**
- Modify: `lib/types.ts` — add `narrativeSummary?: string` to `PatientSession`
- Modify: `actions/ai.ts` — update `synthesizeConflicts` prompt to also return `narrativeSummary`

**Step 1: Add type field**

In `lib/types.ts`, add `narrativeSummary?: string` to `PatientSession` after `reflectionQuestions`:

```typescript
reflectionQuestions?: string[];
narrativeSummary?: string;  // ← ADD THIS
lifeChanges?: LifeChanges;
```

**Step 2: Update synthesizeConflicts prompt and return**

In `actions/ai.ts`, update the `synthesizeConflicts` function:

1. Add to the prompt instructions (after the gestaltActivity section):
```
6. Genera un "narrativeSummary": 2-3 oraciones en lenguaje cálido y accesible que describan el enfoque terapéutico SIN nombrar ninguna teoría ni marco. Habla directamente al paciente en segunda persona. Ejemplo: "Vamos a explorar cómo tus pensamientos influyen en lo que sientes, conectándolo con experiencias que te marcaron, y prestando atención a lo que tu cuerpo y emociones te dicen."
```

2. Add `"narrativeSummary": "..."` to the expected JSON structure in the prompt.

3. Update the return type to include it:
```typescript
return {
    conflicts,
    frameworkMatches: parsed.frameworkMatches as FrameworkMatch[],
    gestaltActivity: parsed.gestaltActivity as GestaltActivity,
    unmapped: parsed.unmapped || [],
    narrativeSummary: parsed.narrativeSummary || '',
};
```

4. Update the function signature return type:
```typescript
Promise<{ conflicts: Conflict[]; frameworkMatches: FrameworkMatch[]; gestaltActivity: GestaltActivity; unmapped: string[]; narrativeSummary: string }>
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (narrativeSummary is optional on PatientSession, so existing code won't break)

**Step 4: Commit**

```bash
git add lib/types.ts actions/ai.ts
git commit -m "feat: add narrativeSummary to types and synthesizeConflicts"
```

---

### Task 2: Hide frameworks in stage-conflicts.tsx — show narrative instead

**Files:**
- Modify: `components/stages/stage-conflicts.tsx`

**Step 1: Update state and onUpdate call**

Add `narrativeSummary` to the result state type and the `onUpdate` call in `goToAnalysis`:

```typescript
// In the result state type, add narrativeSummary: string
const [result, setResult] = useState<{
    conflicts: Conflict[];
    frameworkMatches: FrameworkMatch[];
    gestaltActivity: GestaltActivity;
    unmapped: string[];
    narrativeSummary: string;  // ← ADD
} | null>(...)
```

Update `goToAnalysis`:
```typescript
onUpdate({ conflicts: data.conflicts, frameworkMatches: data.frameworkMatches, gestaltActivity: data.gestaltActivity, narrativeSummary: data.narrativeSummary });
```

Update `onAdvance` call to pass narrativeSummary through (add it to the signature or pass via onUpdate).

**Step 2: Replace framework display with narrative**

Replace the entire `<div className="pt-3 border-t space-y-2">` section (that shows framework badges) with:

```tsx
<div className="pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
    {result.narrativeSummary}
  </p>
</div>
```

Remove the `FRAMEWORK_NAMES` constant (no longer needed).

Remove the gestaltActivity preview line too — it uses technical terminology.

**Step 3: Update hasExistingData initialization**

For the existing data case, provide a fallback narrativeSummary:
```typescript
hasExistingData
  ? { ..., narrativeSummary: session.narrativeSummary ?? '' }
  : null
```

**Step 4: Verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add components/stages/stage-conflicts.tsx
git commit -m "feat: replace framework labels with narrative summary in conflicts stage"
```

---

### Task 3: Hide frameworks in patient-record.tsx

**Files:**
- Modify: `components/stages/patient-record.tsx`

**Step 1: Replace framework section**

Replace the entire "Combinación de marcos terapéuticos" Section block with:

```tsx
{session.narrativeSummary && (
  <Section label="Enfoque de tu proceso">
    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
      {session.narrativeSummary}
    </p>
  </Section>
)}
```

**Step 2: Clean up**

Remove `FRAMEWORK_COLORS` constant, `ROLE_LABELS` constant, and any other framework-display code that is no longer referenced.

Keep `primaryFramework` and `primaryColor` only if still used for keyword chip colors in the memories section. If so, keep them. If not, remove.

**Step 3: Verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add components/stages/patient-record.tsx
git commit -m "feat: replace framework display with narrative summary in patient record"
```

---

### Task 4: Add micro-reflections to getNextTherapistQuestion

**Files:**
- Modify: `actions/ai.ts`

**Step 1: Update return type**

Change the return type of `getNextTherapistQuestion` from:
```typescript
Promise<{ done: boolean; question: string | null }>
```
to:
```typescript
Promise<{ done: boolean; question: string | null; reflection: string | null }>
```

**Step 2: Update prompt**

Add to the prompt instructions:

```
Cuando devuelvas una pregunta, incluye también un "reflection": un micro-reflejo empático de 1-2 oraciones que valide lo que el paciente acaba de compartir ANTES de la pregunta. El reflejo debe:
- Reconocer la emoción o el esfuerzo del paciente
- Ser cálido y breve (máximo 2 oraciones)
- NO repetir lo que el paciente dijo literalmente
- Ejemplo: "Lo que describes suena realmente pesado. Gracias por confiarme algo así."

Si done es true, reflection debe ser null.
```

Update the JSON format in the prompt:
```
{ "done": true/false, "question": "..." o null, "reflection": "..." o null }
```

**Step 3: Update return parsing**

```typescript
return {
    done: parsed.done === true,
    question: typeof parsed.question === 'string' ? parsed.question : null,
    reflection: typeof parsed.reflection === 'string' ? parsed.reflection : null,
};
```

**Step 4: Verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add actions/ai.ts
git commit -m "feat: add emotional micro-reflections to therapist question action"
```

---

### Task 5: Show reflections in stage-conflicts UI

**Files:**
- Modify: `components/stages/stage-conflicts.tsx`

**Step 1: Insert reflection as separate message**

In `handleSend`, where the therapist question is added to messages, insert the reflection first:

```typescript
if (done || !question || questionsAsked.length >= MAX_QUESTIONS) {
    goToAnalysis(patientInputs);
} else {
    const newMsgs: Message[] = [];
    if (reflection) {
        newMsgs.push({ role: 'therapist', text: reflection, isReflection: true });
    }
    newMsgs.push({ role: 'therapist', text: question });
    setMessages(prev => [...prev, ...newMsgs]);
    setQuestionsAsked(prev => [...prev, question]);
}
```

**Step 2: Update Message type**

Add `isReflection?: boolean` to the Message type:
```typescript
type Message = { role: MessageRole; text: string; isReflection?: boolean };
```

**Step 3: Style reflection messages differently**

In the message rendering, add italic styling for reflections:

```tsx
<p className="leading-relaxed text-[15px]"
  style={{
    ...(msg.role === 'therapist' ? { fontFamily: 'var(--font-display)' } : {}),
    ...(msg.isReflection ? { fontStyle: 'italic', color: 'var(--color-muted)' } : {}),
  }}>
  {msg.text}
</p>
```

**Step 4: Do the same for handleSkip**

Apply the same reflection insertion logic in `handleSkip`.

**Step 5: Verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add components/stages/stage-conflicts.tsx
git commit -m "feat: display emotional micro-reflections in conversation UI"
```

---

### Task 6: Add consent before interpretation

**Files:**
- Modify: `components/stages/stage-interpretation.tsx`

**Step 1: Replace isPreparing with consent state**

Replace:
```typescript
const [isPreparing, setIsPreparing] = useState(false);
```
With:
```typescript
const [awaitingConsent, setAwaitingConsent] = useState(!session.interpretation);
const [pauseMode, setPauseMode] = useState(false);
```

**Step 2: Update useEffect**

Replace the preparation timer logic:
```typescript
useEffect(() => {
    if (session.interpretation) {
        setAwaitingConsent(false);
        startStream(session.interpretation.text);
    }
    // If no interpretation, we wait for consent — no auto-generate
}, []);
```

**Step 3: Add consent handlers**

```typescript
const handleConsent = () => {
    setAwaitingConsent(false);
    generate();
};

const handlePause = () => {
    setPauseMode(true);
};
```

**Step 4: Replace preparation UI with consent UI**

Replace the `isPreparing` AnimatePresence block with:

```tsx
<AnimatePresence>
  {awaitingConsent && !pauseMode && (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="rounded-[var(--radius-card)] p-6 space-y-4"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
        He escuchado todo lo que compartiste. Tengo algo para ti.
      </p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        Es una interpretación de lo que percibo en tu historia. ¿Te gustaría leerla?
      </p>
      <div className="flex gap-3 pt-2">
        <motion.button
          type="button"
          onClick={handleConsent}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
          style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
        >
          Estoy lista
        </motion.button>
        <motion.button
          type="button"
          onClick={handlePause}
          whileTap={shouldReduce ? {} : { scale: 0.98 }}
          className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          Dame un momento
        </motion.button>
      </div>
    </motion.div>
  )}
  {awaitingConsent && pauseMode && (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-card)] p-6 space-y-4 text-center"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        Tómate el tiempo que necesites. Aquí estaré.
      </p>
      <motion.button
        type="button"
        onClick={handleConsent}
        whileTap={shouldReduce ? {} : { scale: 0.97 }}
        className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
        style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
      >
        Cuando quieras
      </motion.button>
    </motion.div>
  )}
</AnimatePresence>
```

**Step 5: Verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add components/stages/stage-interpretation.tsx
git commit -m "feat: add consent step before generating interpretation"
```

---

### Task 7: Make grounding optional in stage-memories

**Files:**
- Modify: `components/stages/stage-memories.tsx`

**Step 1: Replace grounding gate with optional breathing**

Replace `groundingDone` state initialization:
```typescript
const [groundingDone, setGroundingDone] = useState(true); // No longer blocks
const [showBreathing, setShowBreathing] = useState(false);
```

**Step 2: Replace grounding block**

Replace the entire `{!groundingDone && (...)}` block with a new intro + optional breathing:

```tsx
{memories.length === 0 && !isFormActive && (
  <motion.div
    initial={shouldReduce ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="space-y-4"
  >
    <div
      className="rounded-[var(--radius-card)] p-6 space-y-3"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
        Ahora vamos a explorar un recuerdo que conecte con lo que estás viviendo. Ve a tu ritmo — no hay prisa.
      </p>

      <AnimatePresence>
        {showBreathing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col items-center py-6 space-y-4">
              <motion.div
                className="w-16 h-16 rounded-full"
                style={{ background: 'var(--color-sage)', opacity: 0.3 }}
                animate={{ scale: [1, 1.4, 1.4, 1], opacity: [0.3, 0.5, 0.5, 0.3] }}
                transition={{ duration: 14, repeat: Infinity, times: [0, 0.286, 0.571, 1] }}
              />
              <p className="text-xs text-center" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                Inhala 4s · Sostén 4s · Exhala 6s
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <motion.button
          type="button"
          onClick={() => setIsFormActive(true)}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
          style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
        >
          Continuar
        </motion.button>
        <button
          type="button"
          onClick={() => setShowBreathing(prev => !prev)}
          className="text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          {showBreathing ? 'Cerrar ejercicio' : 'Primero quiero respirar un momento'}
        </button>
      </div>
    </div>
  </motion.div>
)}
```

**Step 3: Clean up groundingDone references**

Since `groundingDone` is now always `true`, remove the `{groundingDone && ...}` wrappers from the conflicts bridge, memories list, add-another button, and form. They become unconditional.

Update FloatingBar: `<FloatingBar visible={true}>` (remove `groundingDone` condition since it's always true).

Then remove the `groundingDone` state entirely since it's no longer needed.

**Step 4: Verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add components/stages/stage-memories.tsx
git commit -m "feat: make grounding optional with opt-in breathing exercise"
```

---

### Task 8: Update session-view to pass narrativeSummary

**Files:**
- Modify: `components/stages/session-view.tsx`

**Step 1: Pass narrativeSummary through advanceStage**

In the `StageConflicts` `onAdvance` callback, add `narrativeSummary` to the updates passed to `advanceStage`. This requires updating the `onAdvance` prop signature to accept it.

Update in session-view.tsx:
```tsx
<StageConflicts
  session={session}
  patient={patient}
  onAdvance={(conflicts, frameworkMatches, gestaltActivity, unmapped, narrativeSummary) =>
    advanceStage({
      conflicts,
      frameworkMatches,
      gestaltActivity,
      unmappedPhrases: unmapped.map(...),
      narrativeSummary,
    })
  }
  onUpdate={updateSession}
/>
```

And update `stage-conflicts.tsx` `onAdvance` prop type and call:
```typescript
onAdvance: (conflicts: Conflict[], frameworkMatches: FrameworkMatch[], gestaltActivity: GestaltActivity, unmapped: string[], narrativeSummary: string) => void;
```

Update the advance button onClick:
```typescript
onClick={() => onAdvance(result.conflicts, result.frameworkMatches, result.gestaltActivity, result.unmapped, result.narrativeSummary)}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add components/stages/session-view.tsx components/stages/stage-conflicts.tsx
git commit -m "feat: pass narrativeSummary through session flow"
```

---

### Final Verification

Run: `npx tsc --noEmit`
Run: `npm run dev` — navigate complete flow to verify:
1. Intake → Conflicts: narrative summary shown instead of framework labels
2. Conflicts conversation: reflections appear before therapist questions
3. Memories: grounding is optional, breathing exercise works
4. Interpretation: consent card appears, "Dame un momento" works
5. Patient Record: narrative summary shown instead of framework section
