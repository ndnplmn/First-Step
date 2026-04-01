# Sprint 2: Onboarding Conversacional, Bienestar y Carta Personal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the accordion intake with a conversational step-by-step onboarding, add wellbeing indicators at session start/end, and transform the closure into a personal letter format.

**Architecture:** Rewrite intake.tsx as step-by-step conversational flow (no AI calls, static questions). Add wellbeing fields to PatientSession. Modify closure prompt for letter format. No new dependencies.

**Tech Stack:** Next.js 15, React 19, TypeScript, Framer Motion (motion/react), Groq SDK, CSS custom properties.

---

### Task 1: Add wellbeing fields to types

**Files:**
- Modify: `lib/types.ts`

**Step 1: Add fields to PatientSession**

Add after `narrativeSummary?: string`:

```typescript
wellbeingBefore?: number;  // 1-5 scale
wellbeingAfter?: number;   // 1-5 scale
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

### Task 2: Rewrite intake as conversational flow

**Files:**
- Modify: `components/stages/intake.tsx` (full rewrite)

**Design:**

Replace the accordion-based intake with a step-by-step conversational UI. Each step shows one question with appropriate input (text, number, chips, yes/no). Previous answers appear as "bubbles" above. Progress bar at top.

**Step sequence (12 steps, index 0-11):**

| Step | Question | Input | Fields |
|------|----------|-------|--------|
| 0 | "Antes de comenzar, ¿cómo te sientes hoy?" | 5 wellbeing chips | wellbeingBefore (stored on session) |
| 1 | "¿Cómo te llamas?" | text | name |
| 2 | "¿Cuántos años tienes, {name}?" | number | age |
| 3 | "¿Cómo te identificas?" | 3 chips | gender |
| 4 | "¿Cuál es tu estado civil?" | 6 chips | maritalStatus |
| 5 | "¿Tienes hijos?" | yes/no + conditional number | hasChildren, childrenCount |
| 6 | "¿Con quién vives?" | 6 chips + conditional text | livingSituation, livingSituationDetail |
| 7 | "¿A qué te dedicas?" | 6 chips + optional text | employment, occupation |
| 8 | "¿Tienes personas de confianza con quienes puedas hablar?" | yes/no + conditional textarea | hasSupportNetwork, supportDescription |
| 9 | "¿Has ido a terapia antes?" | yes/no + conditional text | previousTherapy, previousTherapyDetail |
| 10 | "¿Tomas algún medicamento psiquiátrico?" | yes/no + conditional text | takingMedication, medicationDetail |
| 11 | "¿Qué te trae aquí hoy, {name}?" | textarea | consultationReason |

**Component structure:**

```tsx
// State
const [step, setStep] = useState(0);
const [values, setValues] = useState<IntakeValues>(INITIAL_VALUES);
const [wellbeing, setWellbeing] = useState<number | null>(null);

// Steps config array
const STEPS = [
  { question: (v) => "Antes de comenzar, ¿cómo te sientes hoy?", type: 'wellbeing' },
  { question: (v) => "¿Cómo te llamas?", type: 'text', field: 'name', placeholder: 'Tu nombre' },
  { question: (v) => `¿Cuántos años tienes, ${v.name}?`, type: 'number', field: 'age', ... },
  // ... etc
];

// Navigation
const handleNext = () => {
  if (step === STEPS.length - 1) handleSubmit();
  else setStep(s => s + 1);
};
const handleBack = () => {
  if (step === 0) onBack();
  else setStep(s => s - 1);
};

// canProceed: depends on step type and current value
```

**UI layout:**

```
┌─────────────────────────────┐
│ ← Volver    [progress bars] │
│                             │
│ Previous answers as bubbles │
│ (scrollable, faded)         │
│                             │
│ Current question (animated) │
│ Input area                  │
│                             │
│ [FloatingBar: Siguiente]    │
└─────────────────────────────┘
```

**Previous answers display:** Show last 2-3 answered steps as small muted bubbles above the current question. Format: "question → answer" in a compact chip-like style.

**IntakeProps change:** Add wellbeingBefore to the session created in handleSubmit:

```typescript
const session: PatientSession = {
  ...existing fields,
  wellbeingBefore: wellbeing ?? undefined,
};
```

**Animations:**
- Question slides in from right (x: 20 → 0) using AnimatePresence mode="wait"
- Previous bubbles fade in
- Progress bar animates width

**Keep:** All existing sub-components (Chip, YesNo, TextInput, TextArea, FieldLabel) — reuse them inside each step.

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

### Task 3: Add wellbeing check-out to stage-closure

**Files:**
- Modify: `components/stages/stage-closure.tsx`

**Step 1: Add wellbeing state and UI**

Add state:
```typescript
const [wellbeingAfter, setWellbeingAfter] = useState<number | null>(
  session.wellbeingAfter ?? null
);
```

Add a wellbeing card AFTER the strategies section and BEFORE the action cards. Only show when `showReady` is true and `wellbeingAfter` is null:

```tsx
{showReady && strategies.length > 0 && wellbeingAfter === null && (
  <motion.div
    initial={shouldReduce ? false : { opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: shouldReduce ? 0 : 1.4 }}
    className="rounded-[var(--radius-card)] p-6 space-y-4"
    style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
  >
    <p className="text-xs font-medium uppercase tracking-widest"
      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
      Antes de irte
    </p>
    <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
      ¿Cómo te sientes ahora?
    </p>
    <div className="flex gap-3 flex-wrap">
      {WELLBEING_OPTIONS.map(opt => (
        <Chip key={opt.value} label={opt.label} value={opt.value}
          onSelect={(v) => { setWellbeingAfter(v); onUpdate({ wellbeingAfter: v }); }} />
      ))}
    </div>
  </motion.div>
)}
```

Where WELLBEING_OPTIONS is:
```typescript
const WELLBEING_OPTIONS = [
  { value: 1, label: 'Muy mal' },
  { value: 2, label: 'Mal' },
  { value: 3, label: 'Regular' },
  { value: 4, label: 'Bien' },
  { value: 5, label: 'Muy bien' },
];
```

**Step 2: Gate action cards on wellbeing**

Change the `showActions` condition: action cards appear after wellbeingAfter is selected (or after 2s if it was already saved). Update the useEffect:

```typescript
useEffect(() => {
  if (isDone && reflectionQuestions.length > 0 && strategies.length > 0 && wellbeingAfter !== null) {
    const timer = setTimeout(() => setShowActions(true), shouldReduce ? 0 : 800);
    return () => clearTimeout(timer);
  }
}, [isDone, reflectionQuestions.length, strategies.length, wellbeingAfter, shouldReduce]);
```

**Step 3: Show confirmation after selection**

After wellbeingAfter is selected, replace the wellbeing card with a brief thank-you:

```tsx
{showReady && wellbeingAfter !== null && !showActions && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="text-center py-4">
    <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
      Gracias por compartir. ♡
    </p>
  </motion.div>
)}
```

**Step 4: Verify**

Run: `npx tsc --noEmit`

---

### Task 4: Transform closure into personal letter format

**Files:**
- Modify: `actions/ai.ts` — update `generateClosure` prompt
- Modify: `components/stages/stage-closure.tsx` — update header text

**Step 1: Update generateClosure prompt**

Replace the current prompt with letter format. Key changes:

```
Ahora genera una CARTA PERSONAL al paciente. El formato es epistolar — como una carta íntima de alguien que realmente lo escuchó.

FORMATO:
- Empieza con "Querido/a ${patient.name},"
- Escribe en primera persona como el terapeuta
- 3 párrafos separados por línea en blanco:

  PÁRRAFO 1: Quita el peso de la culpa. Reencuadra su sentimiento negativo como necesidad humana comprensible. Dale una nueva perspectiva sanadora.

  PÁRRAFO 2: Prepáralo para la actividad Gestalt que viene. Menciónala como invitación cálida. Conecta con lo trabajado.

  PÁRRAFO 3: Hazle saber que este es apenas el primer paso. Que cada sesión profundizará más. Que volver es parte de cuidarse.

- Cierra con una línea en blanco y luego: "Con cariño,\nTu primer paso"

NO expliques teorías. Habla al corazón.
```

**Step 2: Update stage-closure header**

Change the header from:
```
Fase 3 — Cambio cognitivo-conductual
Un nuevo comienzo
```
to:
```
Fase 3 — Cierre
Una carta para ti
```

And subtitle from "Antes de cerrar, quiero dejarte con algo que llevar contigo." to "Escribí algo para ti."

**Step 3: Verify**

Run: `npx tsc --noEmit`

---

### Task 5: Show wellbeing comparison in patient-record

**Files:**
- Modify: `components/stages/patient-record.tsx`

**Step 1: Add wellbeing display**

After the "Enfoque de tu proceso" section, add a wellbeing comparison if both values exist:

```tsx
{(session.wellbeingBefore || session.wellbeingAfter) && (
  <Section label="Tu bienestar">
    <div className="flex gap-6">
      {session.wellbeingBefore && (
        <div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
            Al inicio
          </p>
          <p className="text-lg font-medium" style={{ color: 'var(--color-deep)' }}>
            {WELLBEING_LABELS[session.wellbeingBefore]}
          </p>
        </div>
      )}
      {session.wellbeingAfter && (
        <div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
            Al final
          </p>
          <p className="text-lg font-medium" style={{ color: 'var(--color-deep)' }}>
            {WELLBEING_LABELS[session.wellbeingAfter]}
          </p>
        </div>
      )}
    </div>
  </Section>
)}
```

Where `WELLBEING_LABELS` maps 1-5 to the label strings.

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

### Task 6: Final verification

**Step 1:** Run `npx tsc --noEmit` — zero errors

**Step 2:** Run `npm run dev` — test full flow:
1. Welcome → Intake: conversational step-by-step, wellbeing as step 0
2. Conflicts → Memories → Interpretation (unchanged)
3. Closure: letter format, wellbeing check-out, then action cards
4. Patient Record: wellbeing comparison shown

**Step 3:** Commit all changes
