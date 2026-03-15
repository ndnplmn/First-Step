# Therapist Flow Redesign — "El Archivo Vivo"

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevar Dashboard e Intake del terapeuta al mismo nivel Awwwards 2026 "Cinematic Intimacy" del flujo del paciente — cohesión visual total, micro-interacciones con peso físico, y lenguaje tipográfico unificado.

**Architecture:** Modificación de `components/stages/dashboard.tsx` y `components/stages/intake.tsx`. Reutiliza el design system existente: CSS custom properties, `motion/react`, `FloatingBar`, `ChapterProgress` (adaptado a 3 segmentos en Intake). Sin nuevas dependencias.

**Tech Stack:** Next.js 15, motion/react, CSS custom properties (`--color-sage`, `--color-deep`, `--color-muted`, `--font-display`, `--font-mono`, `--shadow-card`, `--shadow-float`), `useReducedMotion`, `@phosphor-icons/react`

---

## Sección 1 — Dashboard "El Archivo Vivo"

### Concepto

El Dashboard es el espacio de trabajo del terapeuta — debe sentirse como el "backstage" del mismo espacio emocional que vive el paciente. Mismo lenguaje visual (Cinematic Intimacy), pero con la estructura necesaria para gestionar múltiples expedientes de un vistazo.

### Layout

```
┌─────────────────────────────────────┐
│  ← Volver          [+ Nuevo paciente] │  ← sticky glass header
├─────────────────────────────────────┤
│                                     │
│  Expedientes                        │  ← display font, clamp(40px,7vw,64px)
│  3 en proceso                       │  ← mono 11px, muted
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Ana García          [━━━░░] │    │
│  │ 34 años · Femenino          │    │
│  │ Recuerdos · hace 2 días     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Carlos M.           [━━━━░] │    │
│  │ 28 años · Masculino         │    │
│  │ Comprensión · hoy           │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Estado vacío con SVG animado]     │
└─────────────────────────────────────┘
```

### Header sticky

- `position: sticky`, `top: 0`, `z-index: 40`
- `background: var(--color-glass)`, `backdrop-filter: blur(20px)`
- `border-bottom: 1px solid var(--color-border)`
- Izquierda: `← Volver` con `ArrowLeft` icon (16px), color `--color-muted`, `motion.button` con `whileTap={{ scale: 0.97 }}`
- Derecha: `+ Nuevo paciente` con `Plus` icon — `motion.button`, `whileTap={{ scale: 0.97 }}`, fondo `--color-sage`, texto blanco, `rounded-xl`, `px-4 py-2.5`

### Título de sección

- "Expedientes" en `--font-display`, `clamp(40px, 7vw, 64px)`, `--color-deep`, `.breathe`
- Caption debajo: "N en proceso" en `--font-mono`, 11px, `--color-muted`
  - Si `patients.length === 0`: "Aún no hay expedientes"
  - Si `patients.length === 1`: "1 en proceso"
  - Si `patients.length > 1`: "N en proceso"

### Tarjeta de expediente

```tsx
// Estructura de cada tarjeta
<motion.button
  key={patient.id}
  onClick={() => onSelect(patient)}
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
  whileHover={shouldReduce ? {} : { y: -2, boxShadow: 'var(--shadow-float)' }}
  whileTap={shouldReduce ? {} : { scale: 0.99 }}
  className="w-full p-5 rounded-2xl text-left"
  style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', transition: 'box-shadow 0.2s ease' }}
>
  <div className="flex items-start justify-between gap-4">
    {/* Izquierda: datos del paciente */}
    <div>
      <p className="font-medium text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
        {patient.name}
      </p>
      <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
        {patient.age} años · {patient.gender}
      </p>
      <p className="text-xs mt-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
        {stageName} · {relativeTime}
      </p>
    </div>
    {/* Derecha: barra de progreso */}
    <ChapterProgress currentStage={session.stage} />
  </div>
</motion.button>
```

**Tiempo relativo:** función `formatRelativeTime(timestamp)`:
- Menos de 1h: "hace un momento"
- Menos de 24h: "hace N horas"
- 1 día: "ayer"
- 2+ días: "hace N días"

### Estado vacío

```tsx
// SVG de línea que se dibuja sola
<motion.path
  d="M 0 40 Q 80 0 160 40 Q 240 80 320 40"
  stroke="var(--color-sage)"
  strokeWidth="1.5"
  fill="none"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 0.4 }}
  transition={{ duration: 1.4, ease: 'easeInOut' }}
/>
```

Texto: "Aún no hay expedientes" en muted, con CTA "Crear el primero →" en sage que llama `onNew()`.

---

## Sección 2 — Intake "Apertura del Expediente"

### Concepto

El Intake es una secuencia de entrevista del terapeuta — 3 preguntas en 3ra persona, una por pantalla, con transición lateral cinematográfica. Al finalizar, un overlay de confirmación de 800ms antes de iniciar la sesión.

### Preguntas (rediseñadas a 3ra persona)

| Paso | Pregunta | Tipo |
|------|----------|------|
| 1 | "¿Cómo se llama tu paciente?" | Input texto |
| 2 | "¿Cuántos años tiene?" | Input número |
| 3 | "¿Cómo se identifica?" | Chips selector |

> **Cambio crítico:** Las preguntas usan 3ra persona ("tu paciente") — clarifica que es el terapeuta quien opera esta pantalla, no el paciente.

### Animación entre pasos

```tsx
// AnimatePresence mode="wait" con dirección de avance
<AnimatePresence mode="wait">
  <motion.div
    key={step}
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -16, transition: { duration: 0.18 } }}
    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
  >
    {/* pregunta actual */}
  </motion.div>
</AnimatePresence>
```

Sensación de avanzar hacia adelante (entra desde la derecha, sale por la izquierda).

### Barra de progreso de 3 pasos

Misma estética que `ChapterProgress` pero con 3 segmentos:
```tsx
// Inline en Intake — no requiere nuevo componente
<div className="flex items-center gap-1">
  {[0, 1, 2].map(i => (
    <div
      key={i}
      className="h-[3px] rounded-full transition-all duration-300"
      style={{
        width: 28,
        background: i < step ? 'var(--color-deep)' : i === step ? 'var(--color-sage)' : 'var(--color-border)'
      }}
    />
  ))}
</div>
```

### Input de texto / número

```tsx
// Underline animado, sage on focus
<input
  autoFocus
  className="w-full bg-transparent outline-none py-3 text-xl border-b-2 transition-colors placeholder:opacity-40"
  style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
  onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
  onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
/>
```

### Chips de género

```tsx
{['Femenino', 'Masculino', 'Otro'].map(opt => (
  <motion.button
    key={opt}
    onClick={() => setValues(v => ({ ...v, gender: opt }))}
    whileTap={shouldReduce ? {} : { scale: 0.95 }}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className="px-5 py-3 rounded-xl text-sm font-medium"
    style={{
      background: values.gender === opt ? 'var(--color-sage)' : 'var(--color-surface)',
      color: values.gender === opt ? 'white' : 'var(--color-deep)',
      boxShadow: 'var(--shadow-card)',
    }}
  >
    {opt}
  </motion.button>
))}
```

### Overlay de confirmación

Al hacer `onComplete`, mostrar brevemente un overlay antes de transicionar a la sesión:

```tsx
// Estado local: showConfirmation
// Se activa al presionar "Crear expediente", dura 800ms
// Usa el mismo ChapterTransition pero con contenido custom:
//   - ID del paciente en mono (e.g. #2026-0042)
//   - Nombre del paciente en display font
//   - Línea horizontal
//   - "Sesión 1 iniciando..." en mono muted
// onComplete() se llama dentro de handleTransitionComplete
```

Este overlay usa el componente `ChapterTransition` existente con el `toStage={2}` — ya muestra "II · CONFLICTOS" que es exactamente la primera etapa de trabajo.

### FloatingBar

Mismo componente `<FloatingBar visible={canProceed}>` existente. Botón:
- Pasos 1-2: "Continuar →"
- Paso 3: "Crear expediente" con `motion.button` y `whileTap={{ scale: 0.97 }}`

---

## Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `components/stages/dashboard.tsx` | **Reescribir completo** — header sticky glass, tarjetas elevadas, estado vacío SVG, tiempo relativo |
| `components/stages/intake.tsx` | **Reescribir completo** — preguntas 3ra persona, transición lateral, chips animados, overlay confirmación |

## Archivos reutilizados sin cambios

| Archivo | Uso |
|---------|-----|
| `components/ui/floating-bar.tsx` | CTA sticky en Intake |
| `components/ui/chapter-transition.tsx` | Overlay de confirmación al crear expediente |
| `components/ui/chapter-progress.tsx` | Barra de progreso en tarjetas del Dashboard |
| `app/globals.css` | Design tokens, grain, reduced-motion |
