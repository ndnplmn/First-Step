# Intake Clínico + Check-in Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the minimal 3-step intake wizard with a comprehensive single-screen accordion clinical form, and add a check-in screen for returning patients (session 2+).

**Architecture:** Expand the `Patient` type with clinical fields. Rewrite `intake.tsx` as an accordion form. Create a new `check-in.tsx` component. Add `CHECK_IN` to `AppView` and wire it into `page.tsx`. Update all AI prompts to include the new patient context and life changes.

**Tech Stack:** Next.js, React, TypeScript, Framer Motion (motion/react), Groq SDK, localStorage persistence, Phosphor Icons

---

### Task 1: Expand types in `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

**Step 1: Add new type aliases after the `Gender` type (line 1)**

```typescript
export type MaritalStatus = 'Soltero/a' | 'En pareja' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Separado/a';
export type LivingSituation = 'Solo/a' | 'Con pareja' | 'Con familia' | 'Con compañeros' | 'Con padres' | 'Otro';
export type EmploymentStatus = 'Empleado/a' | 'Desempleado/a' | 'Estudiante' | 'Independiente' | 'Jubilado/a' | 'Otro';
```

**Step 2: Expand the `Patient` type (lines 22-28)**

Replace the current `Patient` type with:

```typescript
export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  maritalStatus: MaritalStatus;
  hasChildren: boolean;
  childrenCount?: number;
  livingSituation: LivingSituation;
  livingSituationDetail?: string;
  employment: EmploymentStatus;
  occupation?: string;
  hasSupportNetwork: boolean;
  supportDescription?: string;
  previousTherapy: boolean;
  previousTherapyDetail?: string;
  takingMedication: boolean;
  medicationDetail?: string;
  consultationReason: string;
  createdAt: number;
};
```

**Step 3: Add `LifeChanges` type and add it to `PatientSession`**

Add before `PatientSession`:

```typescript
export type LifeChanges = {
  categories: string[];
  detail?: string;
};
```

Add to `PatientSession` (after `reflectionQuestions`):

```typescript
lifeChanges?: LifeChanges;
```

**Step 4: Add `CHECK_IN` to `AppView`**

```typescript
export type AppView =
  | 'WELCOME'
  | 'DASHBOARD'
  | 'INTAKE'
  | 'CHECK_IN'
  | 'SESSION'
  | 'RECORD';
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Errors in files that construct `Patient` objects (intake.tsx, etc.) because of missing required fields. This is expected — we fix them in subsequent tasks.

**Step 6: Commit**

```bash
git add lib/types.ts
git commit -m "feat: expand Patient type with clinical fields, add LifeChanges and CHECK_IN view"
```

---

### Task 2: Rewrite `components/stages/intake.tsx` as accordion form

**Files:**
- Modify: `components/stages/intake.tsx`

This is the largest task. The entire file gets rewritten. The new component:
- Shows a single screen with 5 collapsible accordion sections
- First section open by default, others collapsed
- Completing a section auto-opens the next
- Progress bar at top showing completed sections
- FloatingBar with "Comenzar mi proceso" only when all required fields are filled
- Uses same design language (CSS vars, motion/react, FloatingBar)

**Step 1: Write the full new `intake.tsx`**

The component manages state as a single `values` object:

```typescript
type IntakeValues = {
  // Section 1: Sobre ti
  name: string;
  age: string;
  gender: Gender;
  // Section 2: Situación personal
  maritalStatus: MaritalStatus;
  hasChildren: boolean | null;
  childrenCount: string;
  livingSituation: LivingSituation;
  livingSituationDetail: string;
  // Section 3: Ocupación
  employment: EmploymentStatus;
  occupation: string;
  // Section 4: Red de apoyo
  hasSupportNetwork: boolean | null;
  supportDescription: string;
  // Section 5: Historial y motivo
  previousTherapy: boolean | null;
  previousTherapyDetail: string;
  takingMedication: boolean | null;
  medicationDetail: string;
  consultationReason: string;
};
```

Section completion logic:
- Section 1 complete: `name.trim().length > 0 && parseInt(age) > 0 && parseInt(age) < 120`
- Section 2 complete: `hasChildren !== null` (maritalStatus and livingSituation have defaults)
- Section 3 complete: always complete (employment has default)
- Section 4 complete: `hasSupportNetwork !== null`
- Section 5 complete: `previousTherapy !== null && takingMedication !== null && consultationReason.trim().length > 0`

Accordion behavior:
- `openSection` state (number 0-4)
- Clicking a section header toggles it open/closed
- When a section becomes complete, auto-advance to next incomplete section
- Completed sections show a checkmark icon

Each section renders:
- Chip selectors for enum types (MaritalStatus, LivingSituation, EmploymentStatus, Gender)
- Toggle buttons (Sí/No) for booleans (hasChildren, hasSupportNetwork, previousTherapy, takingMedication)
- Conditional text fields that appear when relevant (e.g., childrenCount when hasChildren=true, livingSituationDetail when livingSituation='Otro')
- Textarea for consultationReason

On submit, construct `Patient` and `PatientSession` objects (same as current but with all new fields), show ChapterTransition, then call `onComplete`.

**Key UI details:**
- Back button at top (ArrowLeft, same as current)
- Progress: 5 small bars (same style as current step indicator)
- Section headers: text-lg font-medium with chevron rotation animation
- Chip buttons: same style as current gender selector (rounded-xl, shadow-card)
- Toggle Sí/No: two side-by-side chips
- Conditional fields slide in with AnimatePresence

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS (or errors only in other files we haven't touched yet)

**Step 3: Commit**

```bash
git add components/stages/intake.tsx
git commit -m "feat: rewrite intake as single-screen accordion with clinical fields"
```

---

### Task 3: Create `components/stages/check-in.tsx`

**Files:**
- Create: `components/stages/check-in.tsx`

New component shown before stage 2 for returning patients (sessionNumber > 1).

**Step 1: Write `check-in.tsx`**

Props:
```typescript
interface CheckInProps {
  patient: Patient;
  session: PatientSession;
  onComplete: (session: PatientSession) => void;
}
```

Component features:
- Header: "Desde tu última sesión, ¿hubo algún cambio importante en tu vida?"
- Subtitle with patient's name: "Hola {patient.name}, antes de empezar..."
- Grid of chip buttons for predefined life changes:
  - "Cambié de trabajo"
  - "Cambié de vivienda"
  - "Cambio en mi relación"
  - "Problema de salud"
  - "Pérdida de alguien"
  - "Conflicto familiar"
  - "Cambio económico"
  - "Otro"
- Chips are toggleable (multi-select), highlighted when selected
- When any chip is selected, a textarea appears: "¿Quieres contarme más sobre este cambio?"
- FloatingBar with two options:
  - If chips selected: "Continuar →" button
  - Always visible: "Todo sigue igual, continuar" as secondary text button
- On complete: updates `session.lifeChanges` and calls `onComplete`

Style: same design language as rest of app (CSS vars, motion/react, FloatingBar, rounded-xl chips with shadow-card).

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add components/stages/check-in.tsx
git commit -m "feat: create check-in component for returning patients"
```

---

### Task 4: Wire CHECK_IN view into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Step 1: Import CheckIn component**

```typescript
import { CheckIn } from '@/components/stages/check-in';
```

**Step 2: Modify `handlePatientSelect` to route to CHECK_IN for session 2+**

When creating a new session (no active session found), check `sessionNumber`:
- If `sessionNumber > 1` → set view to `CHECK_IN` instead of `SESSION`
- If `sessionNumber === 1` → go directly to `SESSION` (same as current)

When resuming an existing active session, behavior stays the same (go to SESSION).

**Step 3: Add `handleCheckInComplete` function**

```typescript
const handleCheckInComplete = (updatedSession: PatientSession) => {
  storage.saveSession(updatedSession);
  setActiveSession(updatedSession);
  setView('SESSION');
};
```

**Step 4: Add CHECK_IN view rendering block**

After the INTAKE block and before the SESSION block:

```typescript
if (view === 'CHECK_IN' && activePatient && activeSession) {
  return (
    <CheckIn
      patient={activePatient}
      session={activeSession}
      onComplete={handleCheckInComplete}
    />
  );
}
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire CHECK_IN view into main routing for returning patients"
```

---

### Task 5: Update AI prompts to use patient context

**Files:**
- Modify: `actions/ai.ts`

**Step 1: Create a helper function to build patient context string**

Add at the top of the file (after imports):

```typescript
import { Patient, Conflict, Memory, TheoryMatch, Interpretation, Closure, LifeChanges } from '@/lib/types';

function buildPatientContext(patient: Patient, lifeChanges?: LifeChanges): string {
  const lines = [
    `Nombre: ${patient.name}, ${patient.age} años, ${patient.gender}`,
    `Estado civil: ${patient.maritalStatus}`,
    patient.hasChildren ? `Hijos: ${patient.childrenCount || 'sí'}` : 'Sin hijos',
    `Vive: ${patient.livingSituation}${patient.livingSituationDetail ? ` (${patient.livingSituationDetail})` : ''}`,
    `Ocupación: ${patient.employment}${patient.occupation ? ` — ${patient.occupation}` : ''}`,
    patient.hasSupportNetwork
      ? `Red de apoyo: sí${patient.supportDescription ? ` (${patient.supportDescription})` : ''}`
      : 'Sin red de apoyo identificada',
    patient.previousTherapy
      ? `Terapia previa: sí${patient.previousTherapyDetail ? ` (${patient.previousTherapyDetail})` : ''}`
      : 'Sin terapia previa',
    patient.takingMedication
      ? `Medicación: sí${patient.medicationDetail ? ` (${patient.medicationDetail})` : ''}`
      : 'Sin medicación',
    `Motivo de consulta: ${patient.consultationReason}`,
  ];

  if (lifeChanges && lifeChanges.categories.length > 0) {
    lines.push(`Cambios recientes en su vida: ${lifeChanges.categories.join(', ')}${lifeChanges.detail ? `. Detalle: ${lifeChanges.detail}` : ''}`);
  }

  return lines.join('\n');
}
```

**Step 2: Update `synthesizeConflicts` signature and prompt (ACTION 1)**

Add `patient` and `lifeChanges` parameters:

```typescript
export async function synthesizeConflicts(
  rawConflicts: string[],
  patient: Patient,
  lifeChanges?: LifeChanges
): Promise<{ conflicts: Conflict[]; theoryMatch: TheoryMatch; unmapped: string[] }>
```

Add patient context to the prompt after "Motivos:":

```
Contexto del paciente:
${buildPatientContext(patient, lifeChanges)}
```

**Step 3: Update `getNextTherapistQuestion` signature and prompt (ACTION 7)**

Add `patient` and `lifeChanges` parameters:

```typescript
export async function getNextTherapistQuestion(params: {
  allInputs: string[];
  questionsAsked: string[];
  patient: Patient;
  lifeChanges?: LifeChanges;
}): Promise<{ done: boolean; question: string | null }>
```

Add patient context to the prompt before "Para formular una buena interpretación...":

```
Contexto del paciente:
${buildPatientContext(params.patient, params.lifeChanges)}
```

**Step 4: Update `generateInterpretation` signature and prompt (ACTION 3)**

Add `patient` parameter:

```typescript
export async function generateInterpretation(params: {
  conflicts: Conflict[];
  theoryMatch: TheoryMatch;
  memories: Memory[];
  patient: Patient;
  lifeChanges?: LifeChanges;
}): Promise<Interpretation>
```

Add patient context to the prompt after "Teoria base:":

```
Contexto del paciente:
${buildPatientContext(params.patient, params.lifeChanges)}
```

**Step 5: Update `generateClosure` signature and prompt (ACTION 4)**

Add `patient` parameter:

```typescript
export async function generateClosure(params: {
  conflicts: Conflict[];
  theoryMatch: TheoryMatch;
  memories: Memory[];
  interpretation: string;
  patient: Patient;
}): Promise<Closure>
```

Add patient context to the prompt.

**Step 6: Update `generateStrategies` signature and prompt (ACTION 6)**

Add `patient` parameter:

```typescript
export async function generateStrategies(params: {
  conflicts: Conflict[];
  theoryMatch: TheoryMatch;
  interpretation: string;
  patient: Patient;
}): Promise<{ title: string; description: string }[]>
```

Add patient context to the prompt. This is especially important for strategies — knowing the patient lives alone vs. with family changes what strategies make sense.

**Step 7: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Errors in calling components (stage-conflicts, stage-interpretation, stage-closure) because they don't pass `patient` yet. Fixed in Task 6.

**Step 8: Commit**

```bash
git add actions/ai.ts
git commit -m "feat: inject patient context and life changes into all AI prompts"
```

---

### Task 6: Update stage components to pass patient data to AI calls

**Files:**
- Modify: `components/stages/stage-conflicts.tsx`
- Modify: `components/stages/stage-interpretation.tsx`
- Modify: `components/stages/stage-memories.tsx`
- Modify: `components/stages/stage-closure.tsx`
- Modify: `components/stages/session-view.tsx`

**Step 1: Update `SessionView` to pass `patient` to all stage components**

Each stage component needs access to `patient` (and `session.lifeChanges` for session 2+). The `SessionView` already has `patient` as a prop. Pass it through to each stage:

In `session-view.tsx`, add `patient={patient}` prop to:
- `<StageConflicts session={session} patient={patient} ...>`
- `<StageMemories session={session} patient={patient} ...>`
- `<StageInterpretation session={session} patient={patient} ...>`
- `<StageClosure session={session} patient={patient} ...>`

**Step 2: Update `StageConflicts` props and AI calls**

Add to interface:
```typescript
patient: Patient;
```

Update `synthesizeConflicts` call in `goToAnalysis`:
```typescript
const data = await synthesizeConflicts(inputs, patient, session.lifeChanges);
```

Update `getNextTherapistQuestion` calls (2 places: `handleSend` and `handleSkip`):
```typescript
const { done, question } = await getNextTherapistQuestion({
  allInputs: patientInputs,
  questionsAsked,
  patient,
  lifeChanges: session.lifeChanges,
});
```

**Step 3: Update `StageInterpretation` props and AI call**

Add `patient: Patient` to props. Pass `patient` and `session.lifeChanges` to `generateInterpretation` call.

**Step 4: Update `StageClosure` props and AI calls**

Add `patient: Patient` to props. Pass `patient` to `generateClosure` and `generateStrategies` calls.

**Step 5: Update `StageMemories` props**

Add `patient: Patient` to props (even if not used in AI calls yet, for consistency and future use). No AI call changes needed here since `extractMemoryKeywords` doesn't need patient context.

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 7: Commit**

```bash
git add components/stages/session-view.tsx components/stages/stage-conflicts.tsx components/stages/stage-interpretation.tsx components/stages/stage-closure.tsx components/stages/stage-memories.tsx
git commit -m "feat: pass patient context through stage components to AI calls"
```

---

### Task 7: Final verification and type-check

**Files:** None (verification only)

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors

**Step 2: Run dev server to verify no runtime errors**

Run: `npm run dev`
Navigate through: Welcome → Intake (fill all fields) → Session → verify stages work

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve any remaining type or runtime issues from intake redesign"
```
