# Sprint 3: Diario Emocional, Progreso Longitudinal, Export PDF — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add emotional diary between sessions (dedicated DIARY view), longitudinal progress timeline (PROGRESS view), and executive PDF export for real therapists.

**Architecture:** Three new AppView states (DIARY, PROGRESS, RECORD stays). Diary uses its own localStorage key per patient. Progress reads all sessions cross-patient. PDF generated client-side with jsPDF. No new server actions — all features are client-only.

**Tech Stack:** Next.js 15, React 19, TypeScript, Framer Motion (motion/react), jsPDF, CSS custom properties.

---

### Task 1: Add new types and storage

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/storage.ts`

**Step 1: Add DiaryEntry and update AppView in types.ts**

Add after `UnmappedPhrase` type (line ~100):

```typescript
export type DiaryEmotion =
  | 'Alegría' | 'Tristeza' | 'Ansiedad' | 'Calma'
  | 'Enojo' | 'Miedo' | 'Esperanza' | 'Frustración'
  | 'Gratitud' | 'Soledad' | 'Confusión' | 'Alivio';

export type DiaryEntry = {
  id: string;
  patientId: string;
  emotion: DiaryEmotion;
  intensity: number;        // 1-5
  triggers?: string;        // qué lo provocó
  copingUsed?: string;      // qué hiciste para manejarlo
  note?: string;            // nota libre
  createdAt: number;
};
```

Update `AppView` (line ~128) to:

```typescript
export type AppView =
  | 'WELCOME'
  | 'DASHBOARD'
  | 'INTAKE'
  | 'CHECK_IN'
  | 'SESSION'
  | 'RECORD'
  | 'DIARY'
  | 'PROGRESS';
```

**Step 2: Add diary storage methods in storage.ts**

Add a `DIARY_KEY` prefix and methods:

```typescript
const DIARY_KEY_PREFIX = 'fs_diary_';

getDiaryEntries(patientId: string): DiaryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`${DIARY_KEY_PREFIX}${patientId}`) || '[]');
  } catch { return []; }
},

saveDiaryEntry(entry: DiaryEntry): void {
  const entries = this.getDiaryEntries(entry.patientId);
  entries.unshift(entry);
  localStorage.setItem(`${DIARY_KEY_PREFIX}${entry.patientId}`, JSON.stringify(entries));
},

deleteDiaryEntry(patientId: string, entryId: string): void {
  const entries = this.getDiaryEntries(patientId).filter(e => e.id !== entryId);
  localStorage.setItem(`${DIARY_KEY_PREFIX}${patientId}`, JSON.stringify(entries));
},
```

**Step 3: Verify**

Run: `npx tsc --noEmit`

---

### Task 2: Create Diary component

**Files:**
- Create: `components/stages/diary.tsx`

**Design:**

Full-screen dedicated view with:
- Sticky glass header (← Mis sesiones, patient name)
- Monthly calendar strip at top showing dots on days with entries
- FAB "¿Cómo me siento?" button that opens a 4-step conversational form
- Timeline of diary entries below calendar (most recent first)

**Component structure:**

```tsx
interface DiaryProps {
  patient: Patient;
  onBack: () => void;
}

export function Diary({ patient, onBack }: DiaryProps)
```

**State:**

```typescript
const [entries, setEntries] = useState<DiaryEntry[]>(() => storage.getDiaryEntries(patient.id));
const [isAdding, setIsAdding] = useState(false);
const [addStep, setAddStep] = useState(0);  // 0-3 for the 4-step form
const [draft, setDraft] = useState<Partial<DiaryEntry>>({});
const [selectedMonth, setSelectedMonth] = useState(() => new Date());
```

**4-step conversational form (inside component, shown when isAdding=true):**

| Step | Question | Input |
|------|----------|-------|
| 0 | "¿Qué emoción describe mejor cómo te sientes?" | 12 emotion chips (DiaryEmotion) |
| 1 | "¿Qué tan intensa es esta emoción?" | 5 intensity chips (1-5: Muy leve → Muy intensa) |
| 2 | "¿Qué crees que lo provocó?" | textarea (optional, can skip) |
| 3 | "¿Quieres agregar algo más?" | textarea (optional, combined coping+note) |

On submit: create DiaryEntry with generateId(), save via storage.saveDiaryEntry(), prepend to entries state, close form.

**Calendar strip:**

Simple row of 7 columns (Mon-Sun) for current week, with small dots below dates that have entries. Left/right arrows to navigate weeks. Show month name above.

**Entry timeline:**

Each entry as a card:
```
┌─────────────────────────────────┐
│ Alegría              hace 2h    │
│ ●●●○○ (intensity dots)         │
│ "Me fue bien en el trabajo"     │
└─────────────────────────────────┘
```

Show emotion with a colored dot, relative time, intensity as filled/empty circles, note if present.

**Emotion colors (CSS custom property mapping):**

```typescript
const EMOTION_COLORS: Record<DiaryEmotion, string> = {
  'Alegría': 'var(--color-sage)',
  'Tristeza': 'var(--color-violet)',
  'Ansiedad': 'var(--color-terracotta)',
  'Calma': 'var(--color-sage)',
  'Enojo': 'var(--color-terracotta)',
  'Miedo': 'var(--color-violet)',
  'Esperanza': 'var(--color-sage)',
  'Frustración': 'var(--color-terracotta)',
  'Gratitud': 'var(--color-sage)',
  'Soledad': 'var(--color-violet)',
  'Confusión': 'var(--color-muted)',
  'Alivio': 'var(--color-sage)',
};
```

**Animations:**
- Form steps use AnimatePresence mode="wait" with x slide (same as intake)
- Entry cards stagger on mount (same pattern as dashboard patient cards)
- FAB uses spring animation

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

### Task 3: Create Progress component ("Tu Camino")

**Files:**
- Create: `components/stages/progress.tsx`

**Design:**

Vertical timeline showing all completed sessions for a patient, with expandable nodes.

**Component structure:**

```tsx
interface ProgressProps {
  patient: Patient;
  sessions: PatientSession[];
  onBack: () => void;
}

export function Progress({ patient, sessions, onBack }: ProgressProps)
```

**State:**

```typescript
const [expandedId, setExpandedId] = useState<string | null>(null);
```

**Layout:**

```
┌─────────────────────────────────┐
│ ← Mis sesiones    patient.name  │
├─────────────────────────────────┤
│ Tu camino                       │
│ X sesiones · Promedio: Bien     │
│                                 │
│  ○── Sesión 3 · 2 abr 2026     │
│  │   Bien → Muy bien            │
│  │   [conflicto1] [conflicto2]  │
│  │   TCC (primario)             │
│  │                              │
│  ○── Sesión 2 · 28 mar 2026    │
│  │   Regular → Bien             │
│  │   [conflicto1]               │
│  │   Apego/Trauma (primario)    │
│  │                              │
│  ○── Sesión 1 · 25 mar 2026    │
│      Mal → Regular              │
│      [conflicto1] [conflicto2]  │
│      DBT (primario)             │
└─────────────────────────────────┘
```

**Header stats:**
- Total sessions count
- Average wellbeingAfter as label (map average to nearest WELLBEING_LABELS)

**Timeline node (each session):**

```tsx
<div className="flex gap-4">
  {/* Vertical line + dot */}
  <div className="flex flex-col items-center">
    <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--color-sage)' }} />
    {!isLast && <div className="w-px flex-1" style={{ background: 'var(--color-border)' }} />}
  </div>

  {/* Content card */}
  <div className="flex-1 pb-8">
    <button onClick={() => toggle(session.id)}>
      <p className="text-sm font-medium">Sesión {session.sessionNumber}</p>
      <p className="text-xs">{formatDate(session.createdAt)}</p>
    </button>

    {/* Always visible */}
    <WellbeingArrow before={session.wellbeingBefore} after={session.wellbeingAfter} />
    <ConflictChips conflicts={session.conflicts} />
    <PrimaryFramework matches={session.frameworkMatches} />

    {/* Expanded content (AnimatePresence) */}
    {expanded && (
      <div>
        <p>{session.narrativeSummary}</p>
        <p>{session.interpretation?.text (truncated to 200 chars)}</p>
      </div>
    )}
  </div>
</div>
```

**WellbeingArrow subcomponent:**
Shows `"Mal → Bien"` with an arrow between before/after labels. Color-coded (green if improved, neutral if same, red-ish if declined).

**Sessions sorted:** Most recent at top (reversed chronological).

**Animations:**
- Timeline nodes stagger on mount
- Expanded content uses AnimatePresence with height animation (opacity + y)

**Step 2: Verify**

Run: `npx tsc --noEmit`

---

### Task 4: Wire DIARY and PROGRESS views in page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add imports**

```typescript
import { Diary } from '@/components/stages/diary';
import { Progress } from '@/components/stages/progress';
```

**Step 2: Add navigation handlers**

```typescript
const handleViewDiary = (patient: Patient) => {
  setActivePatient(patient);
  setView('DIARY');
};

const handleViewProgress = (patient: Patient) => {
  const sessions = storage.getSessions(patient.id);
  setRecordPatient(patient);
  setRecordSessions(sessions);
  setView('PROGRESS');
};
```

**Step 3: Add view renders**

After the RECORD view block, add:

```typescript
if (view === 'DIARY' && activePatient) {
  return (
    <Diary
      patient={activePatient}
      onBack={() => setView('DASHBOARD')}
    />
  );
}

if (view === 'PROGRESS' && recordPatient) {
  return (
    <Progress
      patient={recordPatient}
      sessions={recordSessions}
      onBack={() => setView('DASHBOARD')}
    />
  );
}
```

**Step 4: Verify**

Run: `npx tsc --noEmit`

---

### Task 5: Add navigation buttons to dashboard

**Files:**
- Modify: `components/stages/dashboard.tsx`

**Step 1: Update DashboardProps**

```typescript
interface DashboardProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  onViewRecord: (patient: Patient) => void;
  onViewDiary: (patient: Patient) => void;
  onViewProgress: (patient: Patient) => void;
  onNew: () => void;
  onBack: () => void;
}
```

**Step 2: Add buttons to each patient card**

Below the existing "Mi resumen" button (Eye icon), add two more buttons:

```tsx
import { Eye, BookOpen, Path } from '@phosphor-icons/react';

// Inside the button group (flex-col items-end gap-2):
<motion.button
  type="button"
  aria-label={`Abrir diario emocional de ${patient.name}`}
  onClick={(e) => { e.stopPropagation(); onViewDiary(patient); }}
  whileHover={shouldReduce ? {} : { color: 'var(--color-sage)' }}
  whileTap={shouldReduce ? {} : { scale: 0.95 }}
  className="flex items-center gap-1 text-xs"
  style={{ color: 'var(--color-muted)' }}
>
  <BookOpen size={14} />
  <span>Mi diario</span>
</motion.button>

<motion.button
  type="button"
  aria-label={`Ver progreso de ${patient.name}`}
  onClick={(e) => { e.stopPropagation(); onViewProgress(patient); }}
  whileHover={shouldReduce ? {} : { color: 'var(--color-sage)' }}
  whileTap={shouldReduce ? {} : { scale: 0.95 }}
  className="flex items-center gap-1 text-xs"
  style={{ color: 'var(--color-muted)' }}
>
  <Path size={14} />
  <span>Tu camino</span>
</motion.button>
```

**Step 3: Update Dashboard call in page.tsx**

Pass the new handlers:

```tsx
<Dashboard
  patients={patients}
  onSelect={handlePatientSelect}
  onViewRecord={handleViewRecord}
  onViewDiary={handleViewDiary}
  onViewProgress={handleViewProgress}
  onNew={() => setView('INTAKE')}
  onBack={() => setView('WELCOME')}
/>
```

**Step 4: Verify**

Run: `npx tsc --noEmit`

---

### Task 6: Install jsPDF and create PDF export

**Files:**
- Run: `npm install jspdf jspdf-autotable`
- Run: `npm install -D @types/jspdf` (if types not bundled)
- Create: `lib/export-pdf.ts`
- Modify: `components/stages/patient-record.tsx`

**Step 1: Install dependency**

```bash
npm install jspdf jspdf-autotable
```

**Step 2: Create export-pdf.ts**

```typescript
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { Patient, PatientSession } from './types';

const WELLBEING_LABELS: Record<number, string> = {
  1: 'Muy mal', 2: 'Mal', 3: 'Regular', 4: 'Bien', 5: 'Muy bien',
};

export function exportSessionPDF(patient: Patient, session: PatientSession): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // --- Header ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Tu Primer Paso', margin, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Resumen ejecutivo para profesional de salud mental', margin, y + 6);
  y += 16;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Patient Demographics ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del paciente', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const demographics = [
    `Nombre: ${patient.name}`,
    `Edad: ${patient.age} años · Género: ${patient.gender}`,
    `Estado civil: ${patient.maritalStatus} · Vive: ${patient.livingSituation}`,
    `Ocupación: ${patient.employment}${patient.occupation ? ` (${patient.occupation})` : ''}`,
    `Red de apoyo: ${patient.hasSupportNetwork ? 'Sí' : 'No'}${patient.supportDescription ? ` — ${patient.supportDescription}` : ''}`,
    `Terapia previa: ${patient.previousTherapy ? 'Sí' : 'No'}${patient.previousTherapyDetail ? ` — ${patient.previousTherapyDetail}` : ''}`,
    `Medicación: ${patient.takingMedication ? 'Sí' : 'No'}${patient.medicationDetail ? ` — ${patient.medicationDetail}` : ''}`,
  ];

  for (const line of demographics) {
    const splitLines = doc.splitTextToSize(line, contentWidth);
    doc.text(splitLines, margin, y);
    y += splitLines.length * 5;
  }
  y += 4;

  // --- Motivo de consulta ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Motivo de consulta:', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  const reasonLines = doc.splitTextToSize(patient.consultationReason, contentWidth);
  doc.text(reasonLines, margin, y);
  y += reasonLines.length * 5 + 6;

  // --- Session info ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Sesión ${session.sessionNumber}`, margin, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const sessionDate = new Date(session.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  doc.text(sessionDate, margin + 30, y);
  doc.setTextColor(60, 60, 60);
  y += 8;

  // --- Wellbeing ---
  if (session.wellbeingBefore || session.wellbeingAfter) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Bienestar subjetivo:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const wbText = [
      session.wellbeingBefore ? `Inicio: ${WELLBEING_LABELS[session.wellbeingBefore]} (${session.wellbeingBefore}/5)` : '',
      session.wellbeingAfter ? `Final: ${WELLBEING_LABELS[session.wellbeingAfter]} (${session.wellbeingAfter}/5)` : '',
    ].filter(Boolean).join('  ·  ');
    doc.text(wbText, margin, y);
    y += 8;
  }

  // --- Frameworks ---
  if (session.frameworkMatches.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Marcos terapéuticos identificados:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const fm of session.frameworkMatches) {
      const fmLine = `• ${fm.name} (${fm.role}) — ${fm.focus}`;
      const fmSplit = doc.splitTextToSize(fmLine, contentWidth);
      doc.text(fmSplit, margin, y);
      y += fmSplit.length * 5;
    }
    y += 4;
  }

  // --- Conflicts ---
  if (session.conflicts.length > 0) {
    // Check page break
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Conflictos identificados:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const c of session.conflicts) {
      const cLine = `• ${c.synthesized} (${c.subCategory})`;
      const cSplit = doc.splitTextToSize(cLine, contentWidth);
      doc.text(cSplit, margin, y);
      y += cSplit.length * 5;
    }
    y += 4;
  }

  // --- Interpretation (truncated) ---
  if (session.interpretation) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Interpretación clínica (generada por IA):', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const interpText = session.interpretation.text.length > 600
      ? session.interpretation.text.slice(0, 600) + '...'
      : session.interpretation.text;
    const interpLines = doc.splitTextToSize(interpText, contentWidth);
    doc.text(interpLines, margin, y);
    y += interpLines.length * 5 + 4;
  }

  // --- Strategies ---
  if (session.closure?.strategies && session.closure.strategies.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Estrategias sugeridas:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const s of session.closure.strategies) {
      const sLine = `• ${s.title}: ${s.description}`;
      const sSplit = doc.splitTextToSize(sLine, contentWidth);
      doc.text(sSplit, margin, y);
      y += sSplit.length * 5;
    }
    y += 4;
  }

  // --- Footer disclaimer ---
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Este documento fue generado por Tu Primer Paso, una herramienta de apoyo emocional asistida por IA. No reemplaza el diagnóstico profesional.',
    margin, footerY,
    { maxWidth: contentWidth }
  );

  // Save
  const fileName = `primer-paso_${patient.name.replace(/\s+/g, '-')}_sesion-${session.sessionNumber}.pdf`;
  doc.save(fileName);
}
```

**Step 3: Add export button to patient-record.tsx**

Import:
```typescript
import { ArrowLeft, Clock, User, FilePdf } from '@phosphor-icons/react';
import { exportSessionPDF } from '@/lib/export-pdf';
```

Add button in the header, next to the patient name or as a separate action. Place it after the session tabs section:

```tsx
{session && (
  <div className="flex justify-end">
    <motion.button
      type="button"
      onClick={() => exportSessionPDF(patient, session)}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-medium"
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-deep)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <FilePdf size={16} />
      Exportar para terapeuta
    </motion.button>
  </div>
)}
```

**Step 4: Verify**

Run: `npx tsc --noEmit`

---

### Task 7: Final verification

**Step 1:** Run `npx tsc --noEmit` — zero errors

**Step 2:** Run `npm run dev` — test full flow:
1. Dashboard → patient card → "Mi diario" → DIARY view: create entry, see timeline
2. Dashboard → patient card → "Tu camino" → PROGRESS view: see timeline of sessions
3. Patient Record → "Exportar para terapeuta" → PDF downloads
4. All existing flows unchanged (WELCOME, INTAKE, SESSION, RECORD)

**Step 3:** Commit all changes
