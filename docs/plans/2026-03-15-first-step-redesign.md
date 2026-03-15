# First Step — Diseño Completo v2.0
**Fecha:** 2026-03-15
**Estado:** Aprobado — listo para implementacion

---

## Objetivo de la Aplicacion

First Step es una herramienta de psicoterapia breve guiada por IA. Su proposito es dar al paciente la oportunidad de concientizar y estructurar su problematica, para luego presentarle una interpretacion de su conflicto que le permita alcanzar un cambio mental, afectivo, fisico y social de manera rapida. Al completar el proceso, el paciente queda en condicion de confrontar sus conflictos de forma autonoma o continuar con otras alternativas terapeuticas.

---

## Modelo de Usuario

**Doble audiencia:**
- **Paciente** — usa la app de forma autonoma, sin terapeuta presente. Es la experiencia principal.
- **Terapeuta** — accede a un panel secundario para revisar expedientes, ver la teoria activada y los insights generados, y usar la app como punto de partida para sesiones presenciales.

---

## Flujo Clinico — 5 Etapas (Arco Multi-Sesion)

El paciente completa el proceso en 3 a 5 sesiones cortas (15-20 min). El estado se guarda entre sesiones.

### Etapa 1 — Apertura de Expediente
- Recolectar: nombre, edad, sexo
- Generar numero de expediente automatico (formato `#YYYY-NNNN`)
- Mensaje de bienvenida: tono seguro, confidencial, sin juicio

### Etapa 2 — Conflictos
- El paciente enumera sus motivos de consulta en texto libre (uno por uno)
- IA sintetiza cada conflicto en una etiqueta de 2-3 palabras
- IA mapea las etiquetas al diccionario de teorias terapeuticas
- Teorias disponibles: Psicoanalitica (Freud), Cognitivo-Conductual (CBT), Gestalt, Sistemica Familiar
- Se selecciona la teoria dominante para el caso
- El paciente ve sus conflictos organizados en lenguaje accesible (no tecnico)

### Etapa 3 — Recuerdos
- La app invita al paciente a recordar situaciones relacionadas con cada conflicto
- Por cada recuerdo: ¿Que paso? → ¿Como te sentiste entonces? → ¿Como te sientes ahora?
- IA extrae palabras clave y las relaciona con la teoria seleccionada
- Las frases que no encajan se guardan en seccion "pendiente de analisis"
- El paciente puede agregar recuerdos en sesiones distintas (multi-sesion)

### Etapa 4 — Interpretacion
- IA genera interpretacion completa basada en: conflictos + teoria + recuerdos + sentimientos
- Escrita en lenguaje accesible, primera persona
- Fundamentada con Google Search (grounding con citas y fuentes)
- El paciente puede marcar que partes le resuenan, guardar, o pedir reformulacion

### Etapa 5 — Cierre
- IA genera un reencuadre simbolico: resignifica el conflicto desde su raiz
- Se ofrecen 3 opciones de siguiente paso:
  1. Ejercicio de reflexion solo guiado por IA
  2. Compartir expediente con un terapeuta
  3. Iniciar nuevo proceso sobre otro conflicto

---

## Arquitectura Tecnica

### Migracion Recomendada
De Vite + React 19 (actual) a **Next.js 15 + Vercel**:
- Habilita streaming de respuestas de IA (Server Actions)
- Protege la API key en servidor (no expuesta en cliente)
- CSS View Transitions API nativa para transiciones entre etapas
- Deployment gratuito en Vercel con CI/CD automatico

### Stack Final
| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5.x |
| Estilos | Tailwind CSS v4 |
| Componentes | shadcn/ui + Base UI primitives |
| Animacion | Motion (Framer Motion v12) + Lottie |
| Iconos | Phosphor Icons |
| IA | Google Gemini API (grounded con Google Search) |
| Fuentes | Instrument Serif (variable) + Plus Jakarta Sans (variable) |
| Despliegue | Vercel |
| Storage | localStorage (MVP) → Supabase (v2) |

---

## Sistema de Diseño

### Paleta de Color
```
Base:        #F5F0EB  (pergamino calido, Pantone Cloud Dancer 2026)
Surface:     #FDFAF7  (tarjetas)
Deep:        #1C1915  (texto principal, casi negro calido)
Sage:        #4A6741  (verde salvia — confianza, crecimiento)
Terracotta:  #C17F59  (humanidad, CTAs)
Violet:      #7A6E9E  (introspeccion, psicologia)
Muted:       #7A7068  (textos secundarios)
```
Textura de grano al 5% de opacidad sobre la base (depth fotografico sin peso).

### Tipografia (Variable Fonts)
```
Display:  Instrument Serif — 72px mobile, 96px desktop
Lead:     Plus Jakarta Sans — 24px
Body:     Plus Jakarta Sans — 17px
Caption:  Plus Jakarta Sans — 13px
Mono:     JetBrains Mono — numeros de expediente
```
Breathing animation en headings de etapa: escala 0.98→1.00 en 5000ms.

### Sistema de Capas (Liquid Glass Influence)
```
Capa 4: Barra flotante bottom — backdrop-filter: blur(20px), bg rgba(245,240,235,0.85)
Capa 3: Tarjetas — surface blanca, sombra suave multi-capa
Capa 2: Respuestas IA — gradiente mesh sage→violet, borde izquierdo sage 3px
Capa 1: Base — #F5F0EB + grain overlay
```

### Animaciones
| Uso | Herramienta | Duracion |
|-----|------------|---------|
| Transiciones de etapa | CSS View Transitions API | 300ms |
| Micro-interacciones | Motion (spring stiffness:280 damping:22) | 150-300ms |
| Estados carga/exito/vacio | Lottie | variable |
| Breathing heading | CSS keyframes | 5000ms |
| Reveals en scroll | CSS Scroll-Driven Animations | scroll-linked |

---

## Patrones UX de IA

- **Streaming** — tokens aparecen en tiempo real mientras Gemini genera
- **Indicador ambiental** — glow pulsando en el borde de la tarjeta mientras procesa
- **Boton de pausa** — siempre visible durante generacion (control = confianza)
- **Chips de accion** — `[Esto me resuena]` `[Guardar]` `[Reformular]`
- **Citas grounded** — superindices con fuentes expandibles de Google Search
- **Frases no mapeadas** — guardadas en seccion "pendiente de analisis" para mejora del metodo

---

## Panel del Terapeuta

- Dashboard de expedientes de pacientes
- Vista de: teoria activada, conflictos sintetizados, recuerdos, insights generados
- Notas privadas del terapeuta por caso
- Futura monetizacion: experiencia del paciente gratuita, panel del terapeuta como suscripcion profesional

---

## Datos — Modelo de Informacion

```typescript
Patient {
  id: string           // #2026-NNNN
  name: string
  age: number
  gender: string
  createdAt: Date
  sessions: Session[]
}

Session {
  id: string
  patientId: string
  stage: 1 | 2 | 3 | 4 | 5
  conflicts: Conflict[]
  theory: Theory
  memories: Memory[]
  interpretation: string
  closure: string
  unmappedPhrases: string[]
  createdAt: Date
  updatedAt: Date
}

Conflict {
  raw: string          // texto libre del paciente
  synthesized: string  // 2-3 palabras de IA
  theory: TheoryKey
}

Memory {
  raw: string          // descripcion del suceso
  feelingsThen: string // sentimientos en el momento
  feelingsNow: string  // sentimientos al recordarlo
  keywords: string[]   // extraidos por IA
}

Theory {
  key: 'psychoanalytic' | 'cbt' | 'gestalt' | 'systemic'
  name: string
  subCategory: string  // ej: "etapa anal", "distorsion cognitiva"
  confidence: number   // 0-1
}
```

---

## Fases de Implementacion

### Fase 1 — Migracion y Base (Semana 1)
- Migrar de Vite a Next.js 15 (App Router)
- Configurar Tailwind v4, shadcn/ui, Motion
- Implementar design tokens y sistema de color
- Instalar fuentes variables (Instrument Serif, Plus Jakarta Sans)
- Configurar despliegue en Vercel

### Fase 2 — Core UX (Semana 2)
- Layout base con grain texture y sistema de capas
- Sistema de progreso "capitulos" (5 etapas)
- CSS View Transitions entre etapas
- Breathing animation en headings
- Barra flotante con backdrop blur

### Fase 3 — Flujo del Paciente (Semana 3)
- Etapa 1: Formulario de apertura de expediente
- Etapa 2: Modulo de conflictos + sintesis IA
- Etapa 3: Modulo de recuerdos (multi-sesion)
- Persistencia en localStorage entre sesiones

### Fase 4 — Integracion IA (Semana 4)
- Streaming de respuestas Gemini via Server Actions
- Grounding con Google Search + citas
- Mapeo a diccionario de teorias
- Extraccion de frases no mapeadas
- Etapa 4: Interpretacion completa
- Etapa 5: Cierre simbolico

### Fase 5 — Polish y Panel Terapeuta (Semana 5)
- Animaciones Lottie para estados
- Panel del terapeuta (vista de expedientes)
- Responsive final (mobile + desktop)
- Optimizacion de performance
- Testing y QA
