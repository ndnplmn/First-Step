# Cinematic Intimacy — Rediseño First Step

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevar la experiencia del paciente a nivel Awwwards 2026 mediante "Intimidad Cinematográfica" — momentos de impacto visual en transiciones de capítulo, atmósferas de color por etapa, streaming de texto AI en tiempo real, y micro-interacciones con peso físico.

**Architecture:** Misma base Next.js 15 App Router + Server Actions. Se agregan: (1) atmósferas de color via CSS custom property `--stage-hue` en `SessionView`, (2) componente `ChapterTransition` con overlay full-screen entre etapas, (3) streaming de Server Actions para `generateInterpretation` y `generateClosure` via `ReadableStream`, (4) `AIThinking` rediseñado con orbe respirante + frases rotantes.

**Tech Stack:** Next.js 15, motion/react, CSS custom properties, ReadableStream (Web Streams API), @google/genai generateContentStream, Tailwind CSS v4

---

## Sección 1 — Sistema Visual & Atmósferas por Etapa

### Paleta de atmósferas

Cada etapa de la sesión emite una temperatura de color diferente aplicada como gradiente radial sutil en el fondo del `SessionView`. La transición entre etapas dura 800ms con `transition: background 0.8s ease`.

| Stage | Nombre | Color dominante | Hex |
|-------|--------|-----------------|-----|
| 2 | Conflictos | Pizarra cálida | `rgba(107, 94, 82, 0.08)` |
| 3 | Recuerdos | Violeta suave | `rgba(122, 110, 158, 0.08)` |
| 4 | Comprensión | Verde salvia | `rgba(74, 103, 65, 0.08)` |
| 5 | Cierre | Ámbar dorado | `rgba(196, 163, 90, 0.08)` |

**Implementación:** `SessionView` recibe `session.stage` y aplica una clase dinámica o un `style` inline con el gradiente:

```tsx
const stageGradients: Record<number, string> = {
  2: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(107,94,82,0.08), transparent)',
  3: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(122,110,158,0.08), transparent)',
  4: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(74,103,65,0.08), transparent)',
  5: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(196,163,90,0.08), transparent)',
};
```

El div wrapper de `SessionView` tiene `transition: background 0.8s ease` y aplica el gradiente como `background`.

### Tipografía fluida

Reemplazar todos los tamaños hardcoded `text-[Xpx]` con escala fluida:

| Uso | Antes | Después |
|-----|-------|---------|
| H1 display (Welcome) | `72px` | `clamp(56px, 12vw, 120px)` |
| H2 capítulo | `40px` | `clamp(36px, 6vw, 56px)` |
| Body | `16px` | `16px` (no cambia) |

### Grain texture potenciado

En `globals.css`, agregar segunda capa de grain animada en rotación lenta:

```css
body::after {
  content: '';
  position: fixed;
  inset: -50%;
  width: 200%;
  height: 200%;
  background-image: url("data:image/svg+xml,..."); /* mismo SVG grain */
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
  animation: grain-drift 120s linear infinite;
}

@keyframes grain-drift {
  0% { transform: rotate(0deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1.1); }
}
```

### Welcome — Rediseño tipográfico

- Título `"First Step"`: palabra *"First"* en `--color-deep`, *"Step"* en `--color-terracotta`
- Fondo: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(193,127,89,0.12), transparent)`
- CTA primario: full-width, fondo `--color-sage`
- CTA secundario: ghost con `border: 1px solid var(--color-border)`, sin fondo
- Entrada del título: `initial={{ opacity: 0, y: 24 }}` → `animate={{ opacity: 1, y: 0 }}`, `duration: 0.6`, `ease: [0.25, 0.46, 0.45, 0.94]`

---

## Sección 2 — Transiciones de Capítulo

### Componente `ChapterTransition`

Nuevo componente `components/ui/chapter-transition.tsx`. Se monta en `SessionView` cuando el usuario avanza entre etapas.

**Props:**
```tsx
interface ChapterTransitionProps {
  stage: number;        // etapa destino (2-5)
  stageName: string;    // "Conflictos", "Recuerdos", etc.
  onComplete: () => void; // callback al terminar la transición
}
```

**Anatomía visual:**
```
[Overlay full-screen con color de etapa destino]
  ├── Número romano fantasmal (opacity: 0.12, 160px Instrument Serif italic)
  ├── Línea horizontal que se dibuja (width: 0 → 120px en 400ms)
  └── Nombre de etapa en JetBrains Mono 11px uppercase
```

**Timing:**
- `0ms` — overlay entra (slide from bottom, 300ms spring)
- `400ms` — línea se dibuja
- `700ms` — texto de etapa aparece (fade in)
- `1200ms` — pausa
- `1600ms` — overlay sale (fade out, 300ms)
- `1900ms` — `onComplete()` se llama, contenido nuevo entra

**Números romanos por etapa:**
```ts
const ROMAN = { 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
```

**`prefers-reduced-motion`:** usar `useReducedMotion()` de motion/react. Si `true`, la transición es un simple crossfade de 300ms sin overlay.

### `ChapterProgress` rediseñado

Reemplazar los 5 dots por una **barra de segmentos horizontales**:

```
[━━━━] [━━━━] [    ] [    ] [    ]
  II     III    IV     V     ✓
```

- 5 segmentos de ancho igual con `gap: 4px`
- Completado: fondo `--color-deep`, opacidad 1
- Activo: fondo `--color-sage`, opacidad 1, con animación pulse leve (`opacity: [1, 0.7, 1]`, 2s)
- Pendiente: fondo `--color-border`, opacidad 1
- Al completar una etapa: el segmento hace micro-burst — `scale: 1 → 1.04 → 1` + ring que se expande y desaparece

---

## Sección 3 — AI Streaming

### Server Action con ReadableStream

`generateInterpretation` y `generateClosure` se convierten en funciones que devuelven `ReadableStream<string>` usando `generateContentStream` del SDK de Gemini.

**Nueva firma:**
```ts
// En actions/ai.ts
export async function streamInterpretation(params: {...}): Promise<ReadableStream<string>>
export async function streamClosure(params: {...}): Promise<ReadableStream<string>>
```

**Implementación del stream:**
```ts
export async function streamInterpretation(params) {
  const stream = await getAI().models.generateContentStream({
    model: MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.text();
        if (text) controller.enqueue(text);
      }
      controller.close();
    },
  });
}
```

**Las fuentes de grounding** se obtienen en una llamada separada no-streaming que se ejecuta en paralelo (o después del stream). Se puede hacer con el resultado final del stream (`aggregateResponse`).

### Hook `useAIStream`

Nuevo hook `hooks/use-ai-stream.ts`:
```ts
function useAIStream() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const startStream = async (streamFn: () => Promise<ReadableStream<string>>) => {
    setIsStreaming(true);
    setText('');
    const stream = await streamFn();
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setText(prev => prev + value);
    }
    setIsStreaming(false);
    setIsDone(true);
  };

  return { text, isStreaming, isDone, startStream };
}
```

### `AIThinking` rediseñado — Orbe respirante

**Reemplazar** los tres dots rebotando por:

```tsx
// Orbe central
<motion.div
  className="w-12 h-12 rounded-full"
  style={{ background: 'var(--color-sage)' }}
  animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
/>

// Frase rotante con AnimatePresence
<AnimatePresence mode="wait">
  <motion.span key={phraseIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    {phrases[phraseIndex]}
  </motion.span>
</AnimatePresence>
```

**Frases por acción:**
- `synthesizeConflicts`: "Leyendo entre líneas..." → "Identificando patrones..." → "Conectando con la teoría..."
- `extractMemoryKeywords`: "Escuchando el recuerdo..." → "Extrayendo la esencia..."
- `streamInterpretation` / `streamClosure`: "Analizando tu historia..." → "Conectando perspectivas..." → "Formulando comprensión..."

### Cursor parpadeante durante streaming

En `StageInterpretation` y `StageClosure`, mientras `isStreaming === true`, mostrar un cursor `|` al final del texto:

```tsx
<span>{text}</span>
{isStreaming && (
  <motion.span
    animate={{ opacity: [1, 0, 1] }}
    transition={{ duration: 1, repeat: Infinity }}
    style={{ color: 'var(--color-sage)' }}
  >|</motion.span>
)}
```

Cuando `isDone`, el cursor hace `opacity: 0` en 300ms.

### Grounding sources — Chips elegantes

Después del stream, las fuentes de grounding aparecen como chips con stagger:
```tsx
{sources.map((s, i) => (
  <motion.a
    key={i}
    href={s.uri}
    target="_blank"
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
```

---

## Sección 4 — Micro-interacciones

### Botones con peso físico

Todos los botones primarios: `whileTap={{ scale: 0.97 }}`
Botones secundarios: `whileTap={{ scale: 0.98 }}`
Implementar via un componente wrapper `PressableButton` o directamente en cada `motion.button`.

### Inputs iluminados en foco

En `globals.css`:
```css
textarea:focus, input:focus {
  outline: none;
  border-color: var(--color-sage);
  box-shadow: 0 0 0 3px rgba(74, 103, 65, 0.12);
  transition: border-color 200ms, box-shadow 200ms;
}
```

### Keywords como burbujas

En `StageMemories`, keywords entran con spring:
```tsx
initial={{ scale: 0.8, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ type: 'spring', stiffness: 400, damping: 20 }}
whileHover={{ scale: 1.04 }}
```

### Botón "Me resuena" — Latido

Al activar `resonated`:
1. Corazón: `scale: 0 → 1.3 → 1` en 400ms
2. Ring que se expande: `motion.div` absoluto, `scale: 1 → 2, opacity: 0.4 → 0` en 500ms
3. Fondo: transición de color 300ms

### Eliminar conflictos — Deslizamiento

El chip de conflicto sale con:
```tsx
exit={{ x: 16, opacity: 0, transition: { duration: 0.2 } }}
```
El botón delete tiene `whileHover={{ x: 2 }}`.

### Vibración en mobile al completar AI

Después de que el stream termina:
```ts
if ('vibrate' in navigator) navigator.vibrate([8, 50, 8]);
```

### `prefers-reduced-motion` global

En `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .breathe { animation: none; }
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

En componentes de motion, usar `useReducedMotion()` para deshabilitar `whileHover`, `whileTap` y animaciones infinitas.

---

## Archivos a modificar / crear

| Archivo | Acción |
|---------|--------|
| `app/globals.css` | Grain segunda capa, inputs focus, reduced-motion |
| `components/stages/welcome.tsx` | Tipografía bicolor, gradiente bg, CTAs rediseñados |
| `components/stages/session-view.tsx` | Atmósferas por stage, integrar ChapterTransition |
| `components/ui/chapter-transition.tsx` | **CREAR** — overlay full-screen entre etapas |
| `components/ui/chapter-progress.tsx` | Reemplazar dots por barra de segmentos |
| `components/ui/session-header.tsx` | Actualizar para usar nuevo ChapterProgress |
| `components/ai/ai-thinking.tsx` | Orbe respirante + frases rotantes |
| `components/ai/ai-card.tsx` | Cursor parpadeante, grounding chips animados |
| `actions/ai.ts` | Agregar `streamInterpretation`, `streamClosure` |
| `hooks/use-ai-stream.ts` | **CREAR** — hook para consumir ReadableStream |
| `components/stages/stage-interpretation.tsx` | Usar `useAIStream` + cursor |
| `components/stages/stage-closure.tsx` | Usar `useAIStream` + cursor |
| `components/stages/stage-conflicts.tsx` | Exit animation chips, delete hover |
| `components/stages/stage-memories.tsx` | Keywords spring animation |
