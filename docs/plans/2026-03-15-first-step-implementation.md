# First Step — Plan de Implementacion v2.0

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rediseñar First Step como una aplicacion de psicoterapia breve guiada por IA con nivel de diseño Awwwards 2026 — flujo de 5 etapas, multi-sesion, streaming de IA, y panel de terapeuta.

**Architecture:** Next.js 15 App Router con Server Actions para las llamadas a Gemini API (protege la API key, habilita streaming). Estado del paciente persistido en localStorage. Layout mobile-first con sistema de capitulos, animaciones spring via Motion, y grain texture CSS.

**Tech Stack:** Next.js 15, TypeScript 5, Tailwind CSS v4, shadcn/ui + Base UI, Motion v12, Lottie, Phosphor Icons, Google Gemini API (`@google/genai`), Instrument Serif + Plus Jakarta Sans (Google Fonts variable).

---

## Contexto del Proyecto Actual

El proyecto actual es Vite + React 19. Tiene:
- `src/types.ts` — tipos existentes (Patient, Memory, Session, etc.)
- `src/lib/theories.ts` — diccionario de 4 teorias terapeuticas (MANTENER)
- `src/services/ai.ts` — integracion Gemini (ADAPTAR a Server Actions)
- `src/App.tsx` — componente monolitico de 717 lineas (REEMPLAZAR)
- Stack de deploy: GitHub Pages (MIGRAR a Vercel)

---

## FASE 1: Migracion a Next.js 15

### Task 1: Inicializar proyecto Next.js 15

**Files:**
- Modify: `package.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Delete: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Step 1: Instalar Next.js 15 y eliminar dependencias de Vite**

```bash
# Desde /Users/andonipalomino/first-step/First-Step
npm install next@15 react@19 react-dom@19
npm install @google/genai motion @phosphor-icons/react
npm uninstall vite @vitejs/plugin-react @tailwindcss/vite autoprefixer lucide-react express better-sqlite3 dotenv
npm uninstall -D tsx @types/express
npm install -D @types/node typescript
```

**Step 2: Actualizar `package.json` scripts**

```json
{
  "name": "first-step",
  "private": true,
  "version": "2.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**Step 3: Crear `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
}

export default nextConfig
```

**Step 4: Crear estructura de directorios**

```bash
mkdir -p app/(patient) app/(patient)/session app/terapeuta
mkdir -p components/ui components/stages components/ai
mkdir -p lib actions public/lottie
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate from Vite to Next.js 15"
```

---

### Task 2: Configurar Tailwind CSS v4 y Design Tokens

**Files:**
- Create: `app/globals.css`
- Delete: `src/index.css`

**Step 1: Instalar Tailwind v4 para Next.js**

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

**Step 2: Crear `postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

**Step 3: Crear `app/globals.css` con design tokens completos**

```css
@import "tailwindcss";

/* === DESIGN TOKENS === */
@theme {
  /* Colors */
  --color-base: #F5F0EB;
  --color-surface: #FDFAF7;
  --color-deep: #1C1915;
  --color-sage: #4A6741;
  --color-sage-light: #EEF2EC;
  --color-terracotta: #C17F59;
  --color-violet: #7A6E9E;
  --color-violet-light: #F0EDF8;
  --color-muted: #7A7068;
  --color-border: rgba(28, 25, 21, 0.08);
  --color-glass: rgba(245, 240, 235, 0.85);

  /* Typography */
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --spacing-page: 24px;

  /* Radius */
  --radius-card: 16px;
  --radius-pill: 100px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(28,25,21,0.06), 0 8px 24px rgba(28,25,21,0.04);
  --shadow-float: 0 -1px 0 rgba(255,255,255,0.4), 0 -8px 32px rgba(28,25,21,0.08);
}

/* === GLOBAL BASE === */
* {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}

html {
  background-color: var(--color-base);
  color: var(--color-deep);
  font-family: var(--font-sans);
  font-size: 17px;
  line-height: 1.6;
}

/* Grain texture overlay */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  opacity: 0.035;
  pointer-events: none;
  z-index: 9999;
}

/* === BREATHING ANIMATION === */
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.982); }
}

.breathe {
  animation: breathe 5s ease-in-out infinite;
  display: inline-block;
}

/* === VIEW TRANSITIONS === */
@view-transition {
  navigation: auto;
}

::view-transition-old(root) {
  animation: 300ms ease-in fade-out;
}

::view-transition-new(root) {
  animation: 300ms ease-out fade-in;
}

@keyframes fade-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-8px); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === SCROLLBAR === */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure Tailwind v4 with design tokens and grain texture"
```

---

### Task 3: Instalar shadcn/ui y fuentes

**Step 1: Inicializar shadcn/ui**

```bash
npx shadcn@latest init
# Seleccionar: TypeScript, app directory, CSS variables
# Base color: Neutral
# CSS file: app/globals.css
```

**Step 2: Instalar componentes base necesarios**

```bash
npx shadcn@latest add button input textarea select badge separator
```

**Step 3: Crear `app/layout.tsx` con fuentes variables**

```typescript
import type { Metadata } from 'next'
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'First Step',
  description: 'Tu primer paso hacia el autoconocimiento',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${instrumentSerif.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[var(--color-base)] min-h-screen">
        {children}
      </body>
    </html>
  )
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: setup shadcn/ui and variable fonts"
```

---

## FASE 2: Tipos, Datos y Logica de Negocio

### Task 4: Redefinir tipos y modelo de datos

**Files:**
- Modify: `src/types.ts` → mover a `lib/types.ts`
- Modify: `src/lib/theories.ts` → mover a `lib/theories.ts`
- Create: `lib/storage.ts`
- Create: `lib/id.ts`

**Step 1: Crear `lib/types.ts` (nuevo modelo de 5 etapas)**

```typescript
export type Gender = 'Femenino' | 'Masculino' | 'Otro';

export type TheoryKey = 'psychoanalytic' | 'cbt' | 'gestalt' | 'systemic';

export type Patient = {
  id: string;          // formato: #2026-NNNN
  name: string;
  age: number;
  gender: Gender;
  createdAt: number;
};

export type Conflict = {
  id: string;
  raw: string;           // texto libre del paciente
  synthesized: string;   // 2-3 palabras sintetizadas por IA
  theoryKey: TheoryKey;
  subCategory: string;   // ej: "etapa anal", "distorsion cognitiva"
};

export type Memory = {
  id: string;
  conflictId?: string;   // conflicto relacionado (opcional)
  raw: string;           // descripcion del suceso
  feelingThen: string;
  feelingNow: string;
  keywords: string[];    // extraidos por IA
  sessionNumber: number;
};

export type TheoryMatch = {
  key: TheoryKey;
  name: string;
  subCategory: string;
  confidence: number;    // 0-1
};

export type GroundingSource = {
  title: string;
  uri: string;
};

export type Interpretation = {
  text: string;
  groundingSources: GroundingSource[];
  resonatedAt?: number;  // timestamp si el paciente marco "me resuena"
};

export type Closure = {
  text: string;
  groundingSources: GroundingSource[];
};

export type UnmappedPhrase = {
  text: string;
  sessionNumber: number;
};

export type PatientSession = {
  id: string;
  patientId: string;
  sessionNumber: number;
  stage: 1 | 2 | 3 | 4 | 5;
  conflicts: Conflict[];
  theoryMatch: TheoryMatch | null;
  memories: Memory[];
  interpretation: Interpretation | null;
  closure: Closure | null;
  unmappedPhrases: UnmappedPhrase[];
  createdAt: number;
  updatedAt: number;
};

export type AppView =
  | 'WELCOME'
  | 'DASHBOARD'
  | 'INTAKE'
  | 'SESSION';
```

**Step 2: Mover `lib/theories.ts` (sin cambios de contenido, solo path)**

```bash
cp src/lib/theories.ts lib/theories.ts
```

**Step 3: Crear `lib/id.ts`**

```typescript
export function generatePatientId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `#${year}-${num}`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
```

**Step 4: Crear `lib/storage.ts`**

```typescript
import { Patient, PatientSession } from './types';

const PATIENTS_KEY = 'fs_patients';
const SESSIONS_KEY = 'fs_sessions';

export const storage = {
  getPatients(): Patient[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]');
    } catch { return []; }
  },

  savePatient(patient: Patient): void {
    const patients = this.getPatients();
    const idx = patients.findIndex(p => p.id === patient.id);
    if (idx >= 0) patients[idx] = patient;
    else patients.unshift(patient);
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  },

  getSessions(patientId?: string): PatientSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const all = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') as PatientSession[];
      return patientId ? all.filter(s => s.patientId === patientId) : all;
    } catch { return []; }
  },

  saveSession(session: PatientSession): void {
    const sessions = this.getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  },

  getActiveSession(patientId: string): PatientSession | null {
    const sessions = this.getSessions(patientId);
    return sessions.find(s => s.stage < 5) ?? null;
  },
};
```

**Step 5: Commit**

```bash
git add lib/
git commit -m "feat: define new 5-stage data model and localStorage utilities"
```

---

## FASE 3: Server Actions para IA

### Task 5: Synthesize Conflicts Action

**Files:**
- Create: `actions/ai.ts`

**Step 1: Crear `actions/ai.ts` con las 4 acciones de IA**

> Nota: Las Server Actions se ejecutan en servidor, protegiendo la API key.
> El model actual en el codigo es `gemini-3-flash-preview` — mantenerlo.

```typescript
'use server';

import { GoogleGenAI, Type } from '@google/genai';
import { THEORIES_DICTIONARY } from '@/lib/theories';
import { Conflict, Memory, TheoryMatch, Interpretation, Closure, UnmappedPhrase } from '@/lib/types';
import { generateId } from '@/lib/id';

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-2.0-flash';

// --- ACTION 1: Sintetizar conflictos y mapear a teoria ---
export async function synthesizeConflicts(
  rawConflicts: string[]
): Promise<{ conflicts: Conflict[]; theoryMatch: TheoryMatch; unmapped: string[] }> {
  const prompt = `
    Analiza los siguientes motivos de consulta de un paciente.

    Motivos: ${rawConflicts.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

    Diccionario de Teorias Terapeuticas:
    ${THEORIES_DICTIONARY}

    Para cada motivo:
    1. Sintetizalo en 2-3 palabras descriptivas (ej: "Rebeldia con autoridad")
    2. Identifica la teoria y subcategoria que mejor encaja

    Luego:
    3. Determina la teoria DOMINANTE del caso
    4. Lista cualquier frase que NO encaje en ninguna teoria
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conflicts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                raw: { type: Type.STRING },
                synthesized: { type: Type.STRING },
                theoryKey: { type: Type.STRING, enum: ['psychoanalytic', 'cbt', 'gestalt', 'systemic'] },
                subCategory: { type: Type.STRING },
              },
              required: ['raw', 'synthesized', 'theoryKey', 'subCategory'],
            },
          },
          dominantTheory: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING, enum: ['psychoanalytic', 'cbt', 'gestalt', 'systemic'] },
              name: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['key', 'name', 'subCategory', 'confidence'],
          },
          unmapped: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['conflicts', 'dominantTheory', 'unmapped'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const conflicts: Conflict[] = parsed.conflicts.map((c: Omit<Conflict, 'id'>) => ({
    ...c,
    id: generateId(),
  }));

  return {
    conflicts,
    theoryMatch: parsed.dominantTheory as TheoryMatch,
    unmapped: parsed.unmapped || [],
  };
}

// --- ACTION 2: Extraer keywords de un recuerdo ---
export async function extractMemoryKeywords(
  memory: { raw: string; feelingThen: string; feelingNow: string },
  theoryKey: string,
  theorySubCategory: string
): Promise<string[]> {
  const prompt = `
    Un paciente ha descrito el siguiente recuerdo en el contexto de la teoria ${theoryKey} (${theorySubCategory}):

    Suceso: "${memory.raw}"
    Sentimiento entonces: "${memory.feelingThen}"
    Sentimiento ahora: "${memory.feelingNow}"

    Extrae 3-5 palabras clave emocionales o tematicas del recuerdo que sean relevantes para esta teoria.
    Retorna solo el array de strings, sin explicacion.
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['keywords'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{"keywords":[]}');
  return parsed.keywords;
}

// --- ACTION 3: Generar interpretacion clinica ---
export async function generateInterpretation(params: {
  conflicts: Conflict[];
  theoryMatch: TheoryMatch;
  memories: Memory[];
}): Promise<Interpretation> {
  const { conflicts, theoryMatch, memories } = params;

  const prompt = `
    Eres un psicoterapeuta magistral con profundo conocimiento de la ${theoryMatch.name}.

    Teoria base: ${theoryMatch.name} — ${theoryMatch.subCategory}

    Conflictos del paciente:
    ${conflicts.map(c => `- ${c.synthesized}`).join('\n')}

    Recuerdos del paciente:
    ${memories.map(m => `
    Suceso: "${m.raw}"
    Sentimiento entonces: "${m.feelingThen}"
    Sentimiento ahora: "${m.feelingNow}"
    Palabras clave: ${m.keywords.join(', ')}
    `).join('\n---\n')}

    Genera una interpretacion clinica profunda y reveladora.
    - Dirigete directamente al paciente (segunda persona "tu")
    - Conecta sus recuerdos con su conflicto actual basandote en la teoria
    - Usa lenguaje accesible, no tecnico
    - Minimo 3 parrafos, maximo 5
    - Sé empático, no juzgues
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
        },
        required: ['text'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingSources = chunks
    .filter((c: { web?: { uri?: string; title?: string } }) => c.web?.uri && c.web?.title)
    .map((c: { web: { uri: string; title: string } }) => ({ uri: c.web.uri, title: c.web.title }));

  return { text: parsed.text, groundingSources };
}

// --- ACTION 4: Generar cierre simbolico ---
export async function generateClosure(params: {
  conflicts: Conflict[];
  theoryMatch: TheoryMatch;
  memories: Memory[];
  interpretation: string;
}): Promise<Closure> {
  const { conflicts, theoryMatch, memories, interpretation } = params;

  const prompt = `
    Eres un psicoterapeuta magistral.

    El paciente tiene estos conflictos: ${conflicts.map(c => c.synthesized).join(', ')}
    Teoria: ${theoryMatch.name} — ${theoryMatch.subCategory}

    Se le ha dado esta interpretacion:
    "${interpretation}"

    Ahora genera un CIERRE SIMBOLICO. Es un parrafo corto (3-5 oraciones) que:
    1. Quite el peso de la culpa al paciente
    2. Reencuadre la fantasia o sentimiento negativo como una necesidad humana comprensible
    3. Le de una nueva perspectiva sanadora
    4. Use lenguaje poetico, caloroso, directo al paciente ("tu")

    NO expliques teorias. Solo habla al corazon del paciente.
  `;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
        },
        required: ['text'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingSources = chunks
    .filter((c: { web?: { uri?: string; title?: string } }) => c.web?.uri && c.web?.title)
    .map((c: { web: { uri: string; title: string } }) => ({ uri: c.web.uri, title: c.web.title }));

  return { text: parsed.text, groundingSources };
}
```

**Step 2: Agregar `GEMINI_API_KEY` al `.env.local`**

```bash
# Crear .env.local (NO commitear)
echo "GEMINI_API_KEY=tu_api_key_aqui" > .env.local
echo ".env.local" >> .gitignore
```

**Step 3: Commit**

```bash
git add actions/ .gitignore
git commit -m "feat: add AI server actions (synthesize, extract, interpret, closure)"
```

---

## FASE 4: Componentes de UI Base

### Task 6: Componente ChapterProgress

**Files:**
- Create: `components/ui/chapter-progress.tsx`

**Step 1: Crear componente de progreso por capitulos**

```typescript
'use client';

import { motion } from 'motion/react';

const STAGES = [
  { number: 1, name: 'Apertura' },
  { number: 2, name: 'Conflictos' },
  { number: 3, name: 'Recuerdos' },
  { number: 4, name: 'Comprension' },
  { number: 5, name: 'Cierre' },
];

interface ChapterProgressProps {
  currentStage: 1 | 2 | 3 | 4 | 5;
}

export function ChapterProgress({ currentStage }: ChapterProgressProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <div className="flex items-center gap-2">
        {STAGES.map((stage, index) => {
          const isDone = stage.number < currentStage;
          const isActive = stage.number === currentStage;

          return (
            <div key={stage.number} className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                {/* SVG circle que se dibuja al completarse */}
                {isDone ? (
                  <motion.svg
                    width="10" height="10" viewBox="0 0 10 10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.circle
                      cx="5" cy="5" r="4"
                      fill="none"
                      stroke="var(--color-sage)"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                    <circle cx="5" cy="5" r="2.5" fill="var(--color-sage)" />
                  </motion.svg>
                ) : isActive ? (
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-[var(--color-sage)]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--color-muted)] opacity-30" />
                )}
              </div>

              {/* Linea conectora */}
              {index < STAGES.length - 1 && (
                <div className="w-6 h-px bg-[var(--color-border)]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Nombre de la etapa actual */}
      <motion.span
        key={currentStage}
        initial={{ opacity: 0, x: 4 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs font-[var(--font-sans)] text-[var(--color-muted)] ml-2"
      >
        {STAGES[currentStage - 1].name}
      </motion.span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ui/chapter-progress.tsx
git commit -m "feat: add ChapterProgress component with animated dots"
```

---

### Task 7: Header y Floating Bottom Bar

**Files:**
- Create: `components/ui/session-header.tsx`
- Create: `components/ui/floating-bar.tsx`

**Step 1: `components/ui/session-header.tsx`**

```typescript
import { PatientSession, Patient } from '@/lib/types';
import { ChapterProgress } from './chapter-progress';

interface SessionHeaderProps {
  patient: Patient;
  session: PatientSession;
}

export function SessionHeader({ patient, session }: SessionHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-glass)] backdrop-blur-[20px] border-b border-[var(--color-border)]">
      <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
        <div>
          <p className="font-[var(--font-mono)] text-xs text-[var(--color-muted)]">
            {patient.id}
          </p>
          <p className="text-sm font-medium text-[var(--color-deep)]">
            {patient.name}
          </p>
        </div>
        <ChapterProgress currentStage={session.stage} />
      </div>
    </header>
  );
}
```

**Step 2: `components/ui/floating-bar.tsx`**

```typescript
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ReactNode } from 'react';

interface FloatingBarProps {
  visible: boolean;
  children: ReactNode;
}

export function FloatingBar({ visible, children }: FloatingBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div
            className="max-w-[680px] mx-auto px-6 pb-8 pt-4"
            style={{
              background: 'linear-gradient(to top, var(--color-base) 60%, transparent)',
            }}
          >
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--color-glass)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-float)',
                border: '1px solid rgba(255,255,255,0.5)',
              }}
            >
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 3: Commit**

```bash
git add components/ui/
git commit -m "feat: add SessionHeader and FloatingBar components"
```

---

### Task 8: Componente AICard (respuesta de IA)

**Files:**
- Create: `components/ai/ai-card.tsx`
- Create: `components/ai/ai-thinking.tsx`

**Step 1: `components/ai/ai-thinking.tsx` — indicador mientras IA procesa**

```typescript
'use client';

import { motion } from 'motion/react';

export function AIThinking() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 border-l-[3px] border-[var(--color-sage)]"
      style={{
        background: 'linear-gradient(135deg, var(--color-sage-light), var(--color-violet-light))',
        boxShadow: '0 0 0 1px rgba(74,103,65,0.08)',
      }}
    >
      {/* Glow ambiental en el borde */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{
          boxShadow: [
            '0 0 0 0px rgba(74,103,65,0.0)',
            '0 0 0 4px rgba(74,103,65,0.12)',
            '0 0 0 0px rgba(74,103,65,0.0)',
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none' }}
      />

      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-[var(--color-sage)] opacity-40 flex-shrink-0" />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)]"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <span className="text-sm text-[var(--color-muted)] italic">Analizando...</span>
      </div>
    </motion.div>
  );
}
```

**Step 2: `components/ai/ai-card.tsx`**

```typescript
'use client';

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { GroundingSource } from '@/lib/types';
import { ArrowSquareOut } from '@phosphor-icons/react';

interface AICardProps {
  children: ReactNode;
  sources?: GroundingSource[];
  actions?: ReactNode;
}

export function AICard({ children, sources, actions }: AICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative rounded-2xl p-5 border-l-[3px] border-[var(--color-sage)]"
      style={{
        background: 'linear-gradient(135deg, var(--color-sage-light), var(--color-violet-light))',
      }}
    >
      {/* Icono IA */}
      <div className="flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)] mt-2 flex-shrink-0" />
        <div className="flex-1 space-y-4">
          <div className="text-[var(--color-deep)] leading-relaxed">
            {children}
          </div>

          {/* Fuentes grounded */}
          {sources && sources.length > 0 && (
            <div className="pt-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-muted)] mb-2">Fuentes</p>
              <div className="space-y-1">
                {sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[var(--color-sage)] hover:underline"
                  >
                    <ArrowSquareOut size={12} />
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Chips de accion */}
          {actions && (
            <div className="flex flex-wrap gap-2 pt-1">
              {actions}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 3: Commit**

```bash
git add components/ai/
git commit -m "feat: add AICard and AIThinking components"
```

---

## FASE 5: Flujo del Paciente — 5 Etapas

### Task 9: Pagina Welcome y Dashboard

**Files:**
- Create: `app/page.tsx`
- Create: `components/stages/welcome.tsx`
- Create: `components/stages/dashboard.tsx`

**Step 1: `components/stages/welcome.tsx`**

```typescript
'use client';

import { motion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';

interface WelcomeProps {
  onStart: () => void;
  onContinue?: () => void;
  hasExistingPatients: boolean;
}

export function Welcome({ onStart, onContinue, hasExistingPatients }: WelcomeProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between px-6 pt-24 pb-12 max-w-[680px] mx-auto">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1
            className="breathe text-[72px] leading-[0.95] font-[var(--font-display)] text-[var(--color-deep)]"
          >
            Primer<br />Paso
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-lg text-[var(--color-muted)] max-w-xs leading-relaxed"
        >
          Un espacio seguro para entenderte a ti mismo y encontrar claridad.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-12 h-px bg-[var(--color-border)]"
        />
      </div>

      <FloatingBar visible={true}>
        <div className="space-y-3">
          <button
            onClick={onStart}
            className="w-full py-3.5 rounded-xl font-medium text-white transition-all"
            style={{ background: 'var(--color-sage)' }}
          >
            Comenzar
          </button>
          {hasExistingPatients && (
            <button
              onClick={onContinue}
              className="w-full py-3.5 rounded-xl font-medium transition-all"
              style={{ color: 'var(--color-sage)', background: 'transparent' }}
            >
              Continuar donde lo dejé
            </button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
```

**Step 2: `app/page.tsx` — orquestador del flujo completo**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Welcome } from '@/components/stages/welcome';
import { Dashboard } from '@/components/stages/dashboard';
import { Intake } from '@/components/stages/intake';
import { SessionView } from '@/components/stages/session-view';
import { storage } from '@/lib/storage';
import { Patient, PatientSession, AppView } from '@/lib/types';

export default function Home() {
  const [view, setView] = useState<AppView>('WELCOME');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeSession, setActiveSession] = useState<PatientSession | null>(null);

  useEffect(() => {
    setPatients(storage.getPatients());
  }, []);

  const handlePatientSelect = (patient: Patient) => {
    setActivePatient(patient);
    const session = storage.getActiveSession(patient.id);
    if (session) {
      setActiveSession(session);
      setView('SESSION');
    } else {
      // crear nueva sesion
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
        onNew={() => setView('INTAKE')}
        onBack={() => setView('WELCOME')}
      />
    );
  }

  if (view === 'INTAKE') {
    return (
      <Intake
        onComplete={(patient, session) => {
          storage.savePatient(patient);
          storage.saveSession(session);
          setActivePatient(patient);
          setActiveSession(session);
          setView('SESSION');
        }}
        onBack={() => setView('WELCOME')}
      />
    );
  }

  if (view === 'SESSION' && activePatient && activeSession) {
    return (
      <SessionView
        patient={activePatient}
        session={activeSession}
        onSessionUpdate={(updated) => {
          storage.saveSession(updated);
          setActiveSession(updated);
        }}
        onComplete={() => setView('DASHBOARD')}
      />
    );
  }

  return null;
}
```

**Step 3: Commit**

```bash
git add app/page.tsx components/stages/welcome.tsx
git commit -m "feat: add Welcome screen and app orchestration"
```

---

### Task 10: Etapa 1 — Intake (Apertura de Expediente)

**Files:**
- Create: `components/stages/intake.tsx`

**Step 1: `components/stages/intake.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Patient, PatientSession, Gender } from '@/lib/types';
import { generatePatientId, generateId } from '@/lib/id';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowLeft } from '@phosphor-icons/react';

interface IntakeProps {
  onComplete: (patient: Patient, session: PatientSession) => void;
  onBack: () => void;
}

const QUESTIONS = [
  { field: 'name', label: '¿Cómo te llamas?', type: 'text', placeholder: 'Tu nombre' },
  { field: 'age', label: '¿Cuántos años tienes?', type: 'number', placeholder: 'Tu edad' },
  { field: 'gender', label: '¿Cómo te identificas?', type: 'select', options: ['Femenino', 'Masculino', 'Otro'] },
];

export function Intake({ onComplete, onBack }: IntakeProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ name: '', age: '', gender: 'Femenino' as Gender });

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const handleNext = () => {
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
      onComplete(patient, session);
    } else {
      setStep(s => s + 1);
    }
  };

  const canProceed =
    (current.field === 'name' && values.name.trim().length > 0) ||
    (current.field === 'age' && parseInt(values.age) > 0 && parseInt(values.age) < 120) ||
    current.field === 'gender';

  return (
    <div className="min-h-screen flex flex-col max-w-[680px] mx-auto px-6 pt-16 pb-48">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-[var(--color-muted)] mb-12 self-start">
        <ArrowLeft size={16} />
        <span className="text-sm">Volver</span>
      </button>

      {/* Capitulo */}
      <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)] mb-3">
        Capítulo 1 — Apertura
      </p>

      {/* Pregunta animada */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="flex-1 space-y-8"
      >
        <h2 className="text-[42px] leading-tight font-[var(--font-display)] text-[var(--color-deep)] breathe">
          {current.label}
        </h2>

        {current.type === 'text' && (
          <input
            type="text"
            value={values.name}
            onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
            placeholder={current.placeholder}
            autoFocus
            className="w-full bg-transparent border-b-2 border-[var(--color-border)] focus:border-[var(--color-sage)] outline-none py-3 text-xl text-[var(--color-deep)] placeholder:text-[var(--color-muted)] transition-colors"
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
            min={1} max={120}
            className="w-full bg-transparent border-b-2 border-[var(--color-border)] focus:border-[var(--color-sage)] outline-none py-3 text-xl text-[var(--color-deep)] placeholder:text-[var(--color-muted)] transition-colors"
            onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
          />
        )}

        {current.type === 'select' && (
          <div className="flex flex-wrap gap-3">
            {current.options?.map(opt => (
              <button
                key={opt}
                onClick={() => setValues(v => ({ ...v, gender: opt as Gender }))}
                className="px-5 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: values.gender === opt ? 'var(--color-sage)' : 'var(--color-surface)',
                  color: values.gender === opt ? 'white' : 'var(--color-deep)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Progreso de preguntas */}
        <div className="flex gap-1.5 mt-8">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="h-0.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= step ? 'var(--color-sage)' : 'var(--color-border)' }}
            />
          ))}
        </div>
      </motion.div>

      <FloatingBar visible={canProceed}>
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl font-medium text-white transition-all"
          style={{ background: 'var(--color-sage)' }}
        >
          {isLast ? 'Comenzar mi proceso' : 'Continuar'}
        </button>
      </FloatingBar>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/stages/intake.tsx
git commit -m "feat: add Intake stage (Etapa 1 - patient onboarding)"
```

---

### Task 11: SessionView — Orquestador de Etapas 2-5

**Files:**
- Create: `components/stages/session-view.tsx`

**Step 1: `components/stages/session-view.tsx`**

```typescript
'use client';

import { Patient, PatientSession } from '@/lib/types';
import { SessionHeader } from '@/components/ui/session-header';
import { StageConflicts } from './stage-conflicts';
import { StageMemories } from './stage-memories';
import { StageInterpretation } from './stage-interpretation';
import { StageClosure } from './stage-closure';

interface SessionViewProps {
  patient: Patient;
  session: PatientSession;
  onSessionUpdate: (session: PatientSession) => void;
  onComplete: () => void;
}

export function SessionView({ patient, session, onSessionUpdate, onComplete }: SessionViewProps) {
  const advanceStage = (updates: Partial<PatientSession>) => {
    const updated: PatientSession = {
      ...session,
      ...updates,
      stage: (Math.min(session.stage + 1, 5)) as 1 | 2 | 3 | 4 | 5,
      updatedAt: Date.now(),
    };
    onSessionUpdate(updated);
  };

  const updateSession = (updates: Partial<PatientSession>) => {
    const updated: PatientSession = { ...session, ...updates, updatedAt: Date.now() };
    onSessionUpdate(updated);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SessionHeader patient={patient} session={session} />

      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-8 pb-48">
        {session.stage === 2 && (
          <StageConflicts
            session={session}
            onAdvance={(conflicts, theoryMatch, unmapped) =>
              advanceStage({
                conflicts,
                theoryMatch,
                unmappedPhrases: unmapped.map(text => ({ text, sessionNumber: session.sessionNumber })),
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 3 && (
          <StageMemories
            session={session}
            onAdvance={(memories, newUnmapped) =>
              advanceStage({
                memories,
                unmappedPhrases: [
                  ...session.unmappedPhrases,
                  ...newUnmapped.map(text => ({ text, sessionNumber: session.sessionNumber })),
                ],
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 4 && (
          <StageInterpretation
            session={session}
            onAdvance={(interpretation) => advanceStage({ interpretation })}
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
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/stages/session-view.tsx
git commit -m "feat: add SessionView stage orchestrator"
```

---

### Task 12: Etapa 2 — Conflictos

**Files:**
- Create: `components/stages/stage-conflicts.tsx`

**Step 1: `components/stages/stage-conflicts.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PatientSession, Conflict, TheoryMatch } from '@/lib/types';
import { synthesizeConflicts } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { Plus, X } from '@phosphor-icons/react';

const THEORY_NAMES: Record<string, string> = {
  psychoanalytic: 'Psicoanalítica',
  cbt: 'Cognitivo-Conductual',
  gestalt: 'Gestalt',
  systemic: 'Sistémica Familiar',
};

interface StageConflictsProps {
  session: PatientSession;
  onAdvance: (conflicts: Conflict[], theoryMatch: TheoryMatch, unmapped: string[]) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageConflicts({ session, onAdvance, onUpdate }: StageConflictsProps) {
  const [rawInput, setRawInput] = useState('');
  const [rawConflicts, setRawConflicts] = useState<string[]>(session.conflicts.map(c => c.raw));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    conflicts: Conflict[];
    theoryMatch: TheoryMatch;
    unmapped: string[];
  } | null>(session.conflicts.length > 0 && session.theoryMatch ? {
    conflicts: session.conflicts,
    theoryMatch: session.theoryMatch,
    unmapped: session.unmappedPhrases.map(u => u.text),
  } : null);

  const addConflict = () => {
    if (rawInput.trim().length < 5) return;
    setRawConflicts(prev => [...prev, rawInput.trim()]);
    setRawInput('');
    setResult(null); // reset analysis si agrega mas
  };

  const removeConflict = (idx: number) => {
    setRawConflicts(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const analyze = async () => {
    if (rawConflicts.length === 0) return;
    setIsAnalyzing(true);
    try {
      const data = await synthesizeConflicts(rawConflicts);
      setResult(data);
      // guardar en session sin avanzar aun
      onUpdate({ conflicts: data.conflicts, theoryMatch: data.theoryMatch });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-48">
      {/* Capitulo header */}
      <div>
        <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)] mb-2">
          Capítulo 2 — Conflictos
        </p>
        <h2 className="text-[40px] leading-tight font-[var(--font-display)] text-[var(--color-deep)] breathe">
          ¿Qué te trajo aquí hoy?
        </h2>
        <p className="text-[var(--color-muted)] mt-3 leading-relaxed">
          Describe con tus propias palabras lo que te preocupa o perturba. Puedes agregar varios motivos.
        </p>
      </div>

      {/* Lista de conflictos ingresados */}
      <AnimatePresence>
        {rawConflicts.map((conflict, i) => (
          <motion.div
            key={conflict + i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="flex-1 text-[var(--color-deep)] italic leading-relaxed">"{conflict}"</p>
            <button
              onClick={() => removeConflict(i)}
              className="text-[var(--color-muted)] hover:text-[var(--color-terracotta)] transition-colors mt-0.5"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Input nuevo conflicto */}
      <div className="space-y-3">
        <textarea
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder="Escribe aquí un motivo..."
          rows={3}
          className="w-full bg-transparent border-2 border-[var(--color-border)] focus:border-[var(--color-sage)] rounded-xl p-4 text-[var(--color-deep)] placeholder:text-[var(--color-muted)] outline-none resize-none transition-all"
          style={{ boxShadow: 'inset 0 0 0 0 var(--color-sage)' }}
        />
        <button
          onClick={addConflict}
          disabled={rawInput.trim().length < 5}
          className="flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{ color: 'var(--color-sage)' }}
        >
          <Plus size={16} />
          Agregar motivo
        </button>
      </div>

      {/* Resultado de IA */}
      {isAnalyzing && <AIThinking />}

      {result && !isAnalyzing && (
        <div className="space-y-4">
          <AICard>
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--color-muted)]">Lo que identifico en lo que describes:</p>

              {/* Conflictos sintetizados */}
              <div className="flex flex-wrap gap-2">
                {result.conflicts.map(c => (
                  <span
                    key={c.id}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: 'var(--color-sage)', color: 'white' }}
                  >
                    {c.synthesized}
                  </span>
                ))}
              </div>

              {/* Teoria identificada */}
              <div className="pt-3 border-t border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-muted)]">Teoria que guiara tu proceso:</p>
                <p className="font-medium text-[var(--color-deep)] mt-1">
                  {THEORY_NAMES[result.theoryMatch.key]} — {result.theoryMatch.subCategory}
                </p>
              </div>
            </div>
          </AICard>
        </div>
      )}

      {/* Floating bar */}
      <FloatingBar visible={rawConflicts.length > 0}>
        <div className="space-y-3">
          {!result ? (
            <button
              onClick={analyze}
              disabled={isAnalyzing}
              className="w-full py-3.5 rounded-xl font-medium text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--color-sage)' }}
            >
              {isAnalyzing ? 'Analizando...' : 'Analizar mis conflictos'}
            </button>
          ) : (
            <>
              <button
                onClick={analyze}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ color: 'var(--color-sage)', border: '1px solid var(--color-sage)' }}
              >
                Re-analizar
              </button>
              <button
                onClick={() => onAdvance(result.conflicts, result.theoryMatch, result.unmapped)}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ background: 'var(--color-sage)' }}
              >
                Continuar a recuerdos →
              </button>
            </>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/stages/stage-conflicts.tsx
git commit -m "feat: add StageConflicts (Etapa 2) with AI synthesis"
```

---

### Task 13: Etapa 3 — Recuerdos

**Files:**
- Create: `components/stages/stage-memories.tsx`

**Step 1: `components/stages/stage-memories.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PatientSession, Memory } from '@/lib/types';
import { extractMemoryKeywords } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { generateId } from '@/lib/id';

interface StageMemoriesProps {
  session: PatientSession;
  onAdvance: (memories: Memory[], unmapped: string[]) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

type MemoryForm = {
  raw: string;
  feelingThen: string;
  feelingNow: string;
};

const EMPTY_FORM: MemoryForm = { raw: '', feelingThen: '', feelingNow: '' };

export function StageMemories({ session, onAdvance, onUpdate }: StageMemoriesProps) {
  const [memories, setMemories] = useState<Memory[]>(session.memories);
  const [form, setForm] = useState<MemoryForm>(EMPTY_FORM);
  const [formStep, setFormStep] = useState<0 | 1 | 2>(0);
  const [isExtracting, setIsExtracting] = useState(false);

  const FORM_QUESTIONS = [
    { field: 'raw', label: '¿Qué recuerdo te viene a la mente?', placeholder: 'Describe una situación del pasado relacionada con lo que sientes...' },
    { field: 'feelingThen', label: '¿Cómo te sentiste en ese momento?', placeholder: 'Describe tus emociones entonces...' },
    { field: 'feelingNow', label: '¿Cómo te sientes ahora al recordarlo?', placeholder: 'Describe lo que sientes al contarlo hoy...' },
  ] as const;

  const currentQ = FORM_QUESTIONS[formStep];

  const handleFormNext = () => {
    if (formStep < 2) {
      setFormStep(s => (s + 1) as 0 | 1 | 2);
    } else {
      saveMemory();
    }
  };

  const saveMemory = async () => {
    if (!form.raw.trim()) return;
    setIsExtracting(true);

    try {
      const keywords = await extractMemoryKeywords(
        form,
        session.theoryMatch?.key || 'psychoanalytic',
        session.theoryMatch?.subCategory || ''
      );

      const memory: Memory = {
        id: generateId(),
        raw: form.raw,
        feelingThen: form.feelingThen,
        feelingNow: form.feelingNow,
        keywords,
        sessionNumber: session.sessionNumber,
      };

      const updated = [...memories, memory];
      setMemories(updated);
      onUpdate({ memories: updated });
      setForm(EMPTY_FORM);
      setFormStep(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtracting(false);
    }
  };

  const canProceed = form[currentQ.field as keyof MemoryForm].trim().length > 10;

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)] mb-2">
          Capítulo 3 — Recuerdos
        </p>
        <h2 className="text-[40px] leading-tight font-[var(--font-display)] text-[var(--color-deep)] breathe">
          Viaja a tus recuerdos
        </h2>
        <p className="text-[var(--color-muted)] mt-3 leading-relaxed">
          Piensa en situaciones del pasado que se relacionen con lo que estás viviendo. Puedes agregar varios recuerdos.
        </p>
      </div>

      {/* Recuerdos guardados */}
      <AnimatePresence>
        {memories.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="italic text-[var(--color-deep)] leading-relaxed">"{m.raw}"</p>
            <div className="flex flex-wrap gap-1.5">
              {m.keywords.map(kw => (
                <span
                  key={kw}
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}
                >
                  {kw}
                </span>
              ))}
            </div>
            <div className="text-sm text-[var(--color-muted)] space-y-1 pt-1 border-t border-[var(--color-border)]">
              <p>Entonces: <span className="text-[var(--color-deep)]">{m.feelingThen}</span></p>
              <p>Ahora: <span className="text-[var(--color-deep)]">{m.feelingNow}</span></p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Formulario de nuevo recuerdo */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)]">
          {memories.length === 0 ? 'Primer recuerdo' : 'Agregar otro recuerdo'}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={formStep}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="space-y-3"
          >
            <p className="font-[var(--font-display)] text-xl text-[var(--color-deep)]">
              {currentQ.label}
            </p>
            <textarea
              value={form[currentQ.field as keyof MemoryForm]}
              onChange={e => setForm(prev => ({ ...prev, [currentQ.field]: e.target.value }))}
              placeholder={currentQ.placeholder}
              rows={4}
              autoFocus
              className="w-full bg-transparent border-2 border-[var(--color-border)] focus:border-[var(--color-sage)] rounded-xl p-4 text-[var(--color-deep)] placeholder:text-[var(--color-muted)] outline-none resize-none transition-all"
            />
          </motion.div>
        </AnimatePresence>

        {/* Progreso del formulario */}
        <div className="flex gap-1.5">
          {FORM_QUESTIONS.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= formStep ? 'var(--color-sage)' : 'var(--color-border)' }} />
          ))}
        </div>

        {isExtracting && <AIThinking />}
      </div>

      <FloatingBar visible={true}>
        <div className="space-y-3">
          <button
            onClick={handleFormNext}
            disabled={!canProceed || isExtracting}
            className="w-full py-3.5 rounded-xl font-medium text-white transition-all disabled:opacity-40"
            style={{ background: 'var(--color-sage)' }}
          >
            {formStep < 2 ? 'Siguiente' : isExtracting ? 'Guardando...' : 'Guardar recuerdo'}
          </button>
          {memories.length >= 1 && (
            <button
              onClick={() => onAdvance(memories, [])}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ color: 'var(--color-sage)', border: '1px solid var(--color-sage)' }}
            >
              Continuar a interpretación ({memories.length} {memories.length === 1 ? 'recuerdo' : 'recuerdos'}) →
            </button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/stages/stage-memories.tsx
git commit -m "feat: add StageMemories (Etapa 3) with keyword extraction"
```

---

### Task 14: Etapa 4 — Interpretacion

**Files:**
- Create: `components/stages/stage-interpretation.tsx`

**Step 1: `components/stages/stage-interpretation.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PatientSession, Interpretation } from '@/lib/types';
import { generateInterpretation } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { Heart, BookmarkSimple, ArrowCounterClockwise } from '@phosphor-icons/react';

interface StageInterpretationProps {
  session: PatientSession;
  onAdvance: (interpretation: Interpretation) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageInterpretation({ session, onAdvance, onUpdate }: StageInterpretationProps) {
  const [interpretation, setInterpretation] = useState<Interpretation | null>(session.interpretation);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resonated, setResonated] = useState(false);

  // Auto-generar si no hay interpretacion
  useEffect(() => {
    if (!interpretation && !isGenerating) {
      generate();
    }
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateInterpretation({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
      });
      setInterpretation(result);
      onUpdate({ interpretation: result });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResonate = () => {
    if (!interpretation) return;
    const updated: Interpretation = { ...interpretation, resonatedAt: Date.now() };
    setInterpretation(updated);
    setResonated(true);
    onUpdate({ interpretation: updated });
  };

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)] mb-2">
          Capítulo 4 — Comprensión
        </p>
        <h2 className="text-[40px] leading-tight font-[var(--font-display)] text-[var(--color-deep)] breathe">
          Tu historia vista con claridad
        </h2>
        <p className="text-[var(--color-muted)] mt-3 leading-relaxed">
          Basándome en todo lo que has compartido, aquí está lo que encuentro.
        </p>
      </div>

      {isGenerating && <AIThinking />}

      {interpretation && !isGenerating && (
        <AICard
          sources={interpretation.groundingSources}
          actions={
            <>
              <button
                onClick={handleResonate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all"
                style={{
                  background: resonated ? 'var(--color-terracotta)' : 'var(--color-surface)',
                  color: resonated ? 'white' : 'var(--color-muted)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <Heart size={14} weight={resonated ? 'fill' : 'regular'} />
                {resonated ? 'Me resuena' : 'Esto me resuena'}
              </button>
              <button
                onClick={generate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)' }}
              >
                <ArrowCounterClockwise size={14} />
                Reformular
              </button>
            </>
          }
        >
          {interpretation.text.split('\n').filter(Boolean).map((para, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="leading-relaxed"
              style={{ marginBottom: i < interpretation.text.split('\n').filter(Boolean).length - 1 ? '1rem' : 0 }}
            >
              {para}
            </motion.p>
          ))}
        </AICard>
      )}

      <FloatingBar visible={!!interpretation && !isGenerating}>
        <button
          onClick={() => onAdvance(interpretation!)}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Continuar al cierre →
        </button>
      </FloatingBar>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/stages/stage-interpretation.tsx
git commit -m "feat: add StageInterpretation (Etapa 4) with resonance chips"
```

---

### Task 15: Etapa 5 — Cierre

**Files:**
- Create: `components/stages/stage-closure.tsx`

**Step 1: `components/stages/stage-closure.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PatientSession } from '@/lib/types';
import { generateClosure } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { User, ShareNetwork, Sparkle } from '@phosphor-icons/react';

interface StageClosureProps {
  session: PatientSession;
  onComplete: () => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

const NEXT_STEPS = [
  {
    icon: User,
    title: 'Reflexionar solo',
    description: 'Continúa con un ejercicio guiado de escritura reflexiva.',
    action: 'solo',
  },
  {
    icon: ShareNetwork,
    title: 'Hablar con un terapeuta',
    description: 'Comparte tu expediente con un profesional para profundizar.',
    action: 'therapist',
  },
  {
    icon: Sparkle,
    title: 'Explorar otro conflicto',
    description: 'Inicia un nuevo proceso sobre otra área de tu vida.',
    action: 'new',
  },
];

export function StageClosure({ session, onComplete, onUpdate }: StageClosureProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [closure, setClosure] = useState(session.closure);

  useEffect(() => {
    if (!closure) generate();
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateClosure({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
        interpretation: session.interpretation?.text || '',
      });
      setClosure(result);
      onUpdate({ closure: result });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)] mb-2">
          Capítulo 5 — Cierre
        </p>
        <h2 className="text-[40px] leading-tight font-[var(--font-display)] text-[var(--color-deep)] breathe">
          Un nuevo comienzo
        </h2>
        <p className="text-[var(--color-muted)] mt-3 leading-relaxed">
          Este es el cierre de este ciclo. No el final, sino el primer paso hacia adelante.
        </p>
      </div>

      {isGenerating && <AIThinking />}

      {closure && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <AICard sources={closure.groundingSources}>
            <p className="text-lg font-[var(--font-display)] leading-relaxed italic text-[var(--color-deep)]">
              {closure.text}
            </p>
          </AICard>
        </motion.div>
      )}

      {/* Siguientes pasos */}
      {closure && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <p className="text-sm text-[var(--color-muted)] font-medium">¿Qué deseas hacer ahora?</p>
          {NEXT_STEPS.map(step => (
            <button
              key={step.action}
              onClick={onComplete}
              className="w-full p-4 rounded-2xl text-left transition-all group"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-2.5 rounded-xl transition-colors"
                  style={{ background: 'var(--color-sage-light)' }}
                >
                  <step.icon size={20} color="var(--color-sage)" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-deep)]">{step.title}</p>
                  <p className="text-sm text-[var(--color-muted)] mt-0.5">{step.description}</p>
                </div>
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/stages/stage-closure.tsx
git commit -m "feat: add StageClosure (Etapa 5) with next-step options"
```

---

## FASE 6: Dashboard y Panel del Terapeuta

### Task 16: Dashboard de Pacientes

**Files:**
- Create: `components/stages/dashboard.tsx`

**Step 1: `components/stages/dashboard.tsx`**

```typescript
'use client';

import { motion } from 'motion/react';
import { Patient } from '@/lib/types';
import { storage } from '@/lib/storage';
import { ArrowLeft, Plus, Clock } from '@phosphor-icons/react';

const STAGE_NAMES = ['', 'Apertura', 'Conflictos', 'Recuerdos', 'Comprensión', 'Cierre'];

interface DashboardProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  onNew: () => void;
  onBack: () => void;
}

export function Dashboard({ patients, onSelect, onNew, onBack }: DashboardProps) {
  const getPatientProgress = (patient: Patient) => {
    const session = storage.getActiveSession(patient.id);
    return session ? STAGE_NAMES[session.stage] : 'Completado';
  };

  return (
    <div className="min-h-screen max-w-[680px] mx-auto px-6 pt-16 pb-12">
      <button onClick={onBack} className="flex items-center gap-2 text-[var(--color-muted)] mb-12">
        <ArrowLeft size={16} />
        <span className="text-sm">Volver</span>
      </button>

      <div className="flex items-end justify-between mb-8">
        <h1 className="text-[48px] font-[var(--font-display)] text-[var(--color-deep)] leading-tight">
          Expedientes
        </h1>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      <div className="space-y-3">
        {patients.map((patient, i) => (
          <motion.button
            key={patient.id}
            onClick={() => onSelect(patient)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="w-full p-5 rounded-2xl text-left transition-all"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-deep)]">{patient.name}</p>
                <p className="text-sm text-[var(--color-muted)] mt-0.5">
                  {patient.age} años · {patient.gender}
                </p>
              </div>
              <div className="text-right">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage)' }}
                >
                  {getPatientProgress(patient)}
                </span>
                <p className="text-xs font-[var(--font-mono)] text-[var(--color-muted)] mt-1">
                  {patient.id}
                </p>
              </div>
            </div>
          </motion.button>
        ))}

        {patients.length === 0 && (
          <div className="text-center py-16 text-[var(--color-muted)]">
            <Clock size={32} className="mx-auto mb-3 opacity-40" />
            <p>No hay expedientes aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/stages/dashboard.tsx
git commit -m "feat: add patient Dashboard with session progress"
```

---

### Task 17: Configurar Variables de Entorno en Vercel

**Step 1: Crear `.env.example` actualizado**

```bash
cat > .env.example << 'EOF'
# Clave de API de Google Gemini
# Obtener en: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
EOF
```

**Step 2: Actualizar `.gitignore`**

```
.env.local
.env*.local
.next/
node_modules/
dist/
```

**Step 3: Instrucciones para Vercel deploy**

Para desplegar en Vercel:
1. Ir a vercel.com, conectar el repositorio
2. En Settings → Environment Variables, agregar `GEMINI_API_KEY`
3. Vercel detecta Next.js automaticamente, no se necesita configuracion adicional

**Step 4: Actualizar `deploy.yml` para Vercel (opcional, Vercel tiene CI integrado)**

```bash
# Si se quiere mantener GitHub Actions, eliminar el deploy.yml anterior
# Vercel tiene CI/CD automatico desde el repo
rm deploy.yml
```

**Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: configure environment variables for Vercel deployment"
```

---

## FASE 7: Polish y Verificacion Final

### Task 18: Verificar build y corregir errores de TypeScript

**Step 1: Ejecutar build**

```bash
npm run build
```

Errores esperados posibles:
- Imports de phosphor icons — verificar que `@phosphor-icons/react` esta instalado
- shadcn/ui components no encontrados — ejecutar `npx shadcn@latest add` para los que falten
- Tipos de Next.js — verificar `@types/node` instalado

**Step 2: Ejecutar en desarrollo y verificar flujo completo**

```bash
npm run dev
# Abrir http://localhost:3000
# Verificar: Welcome → Intake → Conflictos → Recuerdos → Interpretacion → Cierre
```

**Step 3: Commit final**

```bash
git add -A
git commit -m "feat: complete First Step v2.0 redesign - 5-stage therapeutic flow"
```

---

## Resumen de Archivos Creados/Modificados

```
app/
  layout.tsx              ← Root layout con fuentes variables
  page.tsx                ← Orquestador del flujo principal
  globals.css             ← Design tokens, grain texture, breathing anim

actions/
  ai.ts                   ← Server Actions: synthesize, extract, interpret, closure

lib/
  types.ts                ← Modelo de datos del nuevo flujo de 5 etapas
  theories.ts             ← Diccionario de teorias (sin cambios de contenido)
  storage.ts              ← Utilitarios localStorage
  id.ts                   ← Generadores de ID

components/
  ui/
    chapter-progress.tsx  ← Dots animados de progreso por capitulos
    session-header.tsx    ← Header sticky con expediente y progreso
    floating-bar.tsx      ← Barra flotante con backdrop blur
  ai/
    ai-card.tsx           ← Tarjeta de respuesta IA con fuentes
    ai-thinking.tsx       ← Indicador ambiental mientras IA procesa
  stages/
    welcome.tsx           ← Pantalla de bienvenida con breathing title
    dashboard.tsx         ← Lista de expedientes
    intake.tsx            ← Etapa 1: apertura de expediente
    session-view.tsx      ← Orquestador de etapas 2-5
    stage-conflicts.tsx   ← Etapa 2: ingreso y sintesis de conflictos
    stage-memories.tsx    ← Etapa 3: recuerdos con extraccion de keywords
    stage-interpretation.tsx ← Etapa 4: interpretacion clinica
    stage-closure.tsx     ← Etapa 5: cierre simbolico y siguientes pasos

next.config.ts
postcss.config.mjs
.env.example
```

---

## Orden de Ejecucion Recomendado

1. Task 1-3: Migracion (base tecnica) — hacerlas en orden, son dependientes
2. Task 4-5: Tipos y Server Actions — pueden hacerse en paralelo
3. Task 6-8: Componentes UI base — pueden hacerse en paralelo
4. Task 9-15: Etapas del flujo — en orden (dependen de los componentes base)
5. Task 16: Dashboard — independiente
6. Task 17-18: Deploy y verificacion — al final
