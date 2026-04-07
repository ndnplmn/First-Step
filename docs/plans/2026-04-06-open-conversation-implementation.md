# Open Conversation in Stage Conflicts — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the 4-question hard limit in Stage 2 and replace the abrupt analysis trigger with an AI-generated bridge message that lets the user continue talking as long as they need.

**Architecture:** Two-file change. `actions/ai.ts` gets a new `bridgeMessage` field in `getNextTherapistQuestion`. `stage-conflicts.tsx` adds a `showBridge` state that replaces the direct-to-analysis trigger, shows the bridge message as a therapist bubble, and gives the user two FloatingBar options: continue or analyze.

**Tech Stack:** Next.js 15, React 19, TypeScript, Groq SDK (llama-3.3-70b-versatile), Framer Motion (motion/react).

---

### Task 1: Update `getNextTherapistQuestion` to return `bridgeMessage`

**Files:**
- Modify: `actions/ai.ts` (lines 410–473)

**Step 1: Update the return type annotation**

In `actions/ai.ts`, change the return type of `getNextTherapistQuestion` from:
```typescript
Promise<{ done: boolean; question: string | null; reflection: string | null }>
```
to:
```typescript
Promise<{ done: boolean; question: string | null; reflection: string | null; bridgeMessage: string | null }>
```

**Step 2: Update the prompt inside `getNextTherapistQuestion`**

Replace the final instruction block in the prompt (the part that says "Si ya tienes suficiente información...") with:

```
Si ya tienes suficiente información (el paciente ya describió los tres aspectos con claridad):
responde con done: true, question: null, reflection: null, y un "bridgeMessage" personalizado que:
1. Reconozca el esfuerzo del usuario en 1 oración cálida (menciona 1-2 temas centrales que emergieron, sin lenguaje clínico)
2. Pregunte si hay algo más que quiera compartir o algún tema que no hayan tenido espacio de tocar
- Máximo 3 oraciones en total
- Tono íntimo, segunda persona
- NO uses frases genéricas como "has compartido mucho" — sé específico con lo que el paciente realmente mencionó
- Ejemplo: "Lo que describes sobre tu trabajo y la sensación de distancia en casa forma un cuadro muy claro. Antes de que lo miremos juntos: ¿hay algo más que quieras contarme, o algún tema que sientas que no tuvimos espacio de tocar?"

Si aún te falta información importante: responde con done: false, question: "...", reflection: "...", bridgeMessage: null
(mismas reglas de antes para question y reflection)
```

**Step 3: Update the JSON response instruction in the prompt**

Change:
```
Responde SOLO con un JSON: { "done": true/false, "question": "..." o null, "reflection": "..." o null }
```
to:
```
Responde SOLO con un JSON: { "done": true/false, "question": "..." o null, "reflection": "..." o null, "bridgeMessage": "..." o null }
```

**Step 4: Update the parsed return at the bottom of the function**

Change:
```typescript
return {
  done: parsed.done === true,
  question: typeof parsed.question === 'string' ? parsed.question : null,
  reflection: typeof parsed.reflection === 'string' ? parsed.reflection : null,
};
```
to:
```typescript
return {
  done: parsed.done === true,
  question: typeof parsed.question === 'string' ? parsed.question : null,
  reflection: typeof parsed.reflection === 'string' ? parsed.reflection : null,
  bridgeMessage: typeof parsed.bridgeMessage === 'string' ? parsed.bridgeMessage : null,
};
```

**Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors.

---

### Task 2: Update `stage-conflicts.tsx` — state and logic

**Files:**
- Modify: `components/stages/stage-conflicts.tsx`

**Step 1: Remove `MAX_QUESTIONS` constant**

Delete line:
```typescript
const MAX_QUESTIONS = 4;
```

**Step 2: Add bridge state**

In the state block (after `const [skipsInARow, setSkipsInARow] = useState(0);`), add:

```typescript
const [showBridge, setShowBridge] = useState(false);
const [bridgeMessage, setBridgeMessage] = useState('');
```

**Step 3: Update `handleSend` — remove MAX_QUESTIONS check, add bridge trigger**

In `handleSend`, find:
```typescript
if (done || !question || questionsAsked.length >= MAX_QUESTIONS) {
  goToAnalysis(patientInputs);
}
```
Replace with:
```typescript
if (done || !question) {
  if (bridgeMsg) {
    setMessages(prev => [...prev, { role: 'therapist', text: bridgeMsg }]);
    setBridgeMessage(bridgeMsg);
    setShowBridge(true);
  } else {
    goToAnalysis(patientInputs);
  }
}
```

Also update the destructuring of `getNextTherapistQuestion` result in `handleSend` from:
```typescript
const { done, question, reflection } = await getNextTherapistQuestion({...});
```
to:
```typescript
const { done, question, reflection, bridgeMessage: bridgeMsg } = await getNextTherapistQuestion({...});
```

**Step 4: Update `handleSkip` — same changes**

In `handleSkip`, remove:
```typescript
if (newSkips >= 2 || questionsAsked.length >= MAX_QUESTIONS) {
  goToAnalysis(patientInputs);
  return;
}
```
Replace with:
```typescript
if (newSkips >= 2) {
  // Re-evaluate instead of going directly to analysis
  // Fall through to the getNextTherapistQuestion call below
}
```

Then update the destructuring in `handleSkip` the same way as in `handleSend` (add `bridgeMessage: bridgeMsg`), and replace the inner `if (done || !question)` block with:
```typescript
if (done || !question) {
  if (bridgeMsg) {
    setMessages(prev => [...prev, { role: 'therapist', text: bridgeMsg }]);
    setBridgeMessage(bridgeMsg);
    setShowBridge(true);
  } else {
    goToAnalysis(patientInputs);
  }
}
```

Note: remove the early return for `newSkips >= 2` — 2 skips in a row now just triggers the AI evaluation, not immediate analysis.

**Step 5: Add `handleContinueDeep` handler**

After `const reanalyze = () => goToAnalysis(getPatientInputs(messages));`, add:

```typescript
const handleContinueDeep = () => {
  setShowBridge(false);
  setSkipsInARow(0);
};
```

**Step 6: Update `!showAnalysis` textarea condition**

The textarea is currently gated on `!showAnalysis && !isEvaluating`. Add `showBridge` to the gate:
```typescript
{!showAnalysis && !isEvaluating && !showBridge && (
```

**Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors.

---

### Task 3: Update `stage-conflicts.tsx` — FloatingBar UI

**Files:**
- Modify: `components/stages/stage-conflicts.tsx`

**Step 1: Add bridge actions block to FloatingBar**

In the FloatingBar `<div className="space-y-3">`, add a new block between the "Enviar mensaje" block and the "Análisis listo" block:

```tsx
{/* Mensaje puente */}
{showBridge && !isEvaluating && (
  <>
    <motion.button
      type="button"
      onClick={() => goToAnalysis(getPatientInputs(messages))}
      whileTap={shouldReduce ? {} : { scale: 0.97 }}
      className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 tracking-wide"
      style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
    >
      Estoy listo/a para continuar <ArrowRight size={16} />
    </motion.button>
    <button
      type="button"
      onClick={handleContinueDeep}
      className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
      style={{ color: 'var(--color-muted)' }}
    >
      → Quiero profundizar en algo
    </button>
  </>
)}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors.

---

### Task 4: Final verification and commit

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: zero errors.

**Step 2: Build check**

Run: `npm run build`
Expected: build completes successfully with no errors.

**Step 3: Manual test flow**

Start `npm run dev` and verify:
1. Inicia una sesión nueva → Stage 2 abre normalmente
2. Escribe un mensaje inicial → IA responde con pregunta
3. Responde las preguntas → en algún momento la IA muestra el mensaje puente (no el análisis directo)
4. El mensaje puente aparece como burbuja del terapeuta en el hilo
5. FloatingBar muestra "Estoy listo/a" y "Quiero profundizar"
6. Click "Quiero profundizar" → textarea reaparece, conversación continúa
7. Después de más rondas → puente aparece de nuevo
8. Click "Estoy listo/a" → análisis se dispara normalmente
9. Flujo post-análisis (Re-analizar, Continuar a recuerdos) sin cambios

**Step 4: Commit**

```bash
git add actions/ai.ts components/stages/stage-conflicts.tsx docs/plans/2026-04-06-open-conversation-design.md docs/plans/2026-04-06-open-conversation-implementation.md
git commit -m "feat: open-ended conversation with bridge message in stage conflicts"
```
