# First Step — Diseño de Completación v1.0
**Fecha:** 2026-03-18
**Estado:** Aprobado — listo para implementación

---

## Objetivo

Completar las features faltantes del flujo clínico de First Step en orden de impacto:
1. Etapa 5 rediseñada con 3 opciones de acción + reflexión IA
2. Multi-sesión (nuevo proceso heredando perfil del paciente)
3. Vista del expediente clínico completo para el terapeuta
4. Preguntas de reflexión personalizadas (nueva acción IA)
5. Frases sin mapear visibles en StageConflicts
6. Eliminar pasos hardcodeados de StageClosure

---

## Feature 1 — Etapa 5 Rediseñada

### Comportamiento actual
`stage-closure.tsx` muestra el cierre simbólico + 3 pasos hardcodeados + botón "Finalizar sesión".

### Comportamiento nuevo
Después del texto de cierre simbólico, la IA genera 3 preguntas de reflexión personalizadas. Luego aparecen 3 tarjetas de acción:

**Tarjeta 1 — Preguntas de reflexión:**
- Título: "Para llevar contigo"
- Contenido: 3 preguntas generadas por IA basadas en conflictos + teoría + cierre del paciente
- Acción: Solo lectura — el paciente las contempla
- Generación: Nueva acción `generateReflectionQuestions` en `actions/ai.ts`
- Estado: `reflectionQuestions: string[]` guardado en `PatientSession`

**Tarjeta 2 — Ver expediente con terapeuta:**
- Título: "Comparte con tu terapeuta"
- Descripción: "Tu expediente completo está listo para revisarlo juntos"
- Acción: Navega a la vista del expediente del terapeuta (nueva vista `RECORD` en `page.tsx`)
- Icono: Users / ClipboardText

**Tarjeta 3 — Nuevo proceso:**
- Título: "Iniciar nuevo proceso"
- Descripción: "Explora otro conflicto con una nueva sesión"
- Acción: Crea `PatientSession` nueva (sessionNumber + 1, stage=2) y navega a SESSION
- Icono: ArrowCounterClockwise / Plus

### Cambios en tipos
```typescript
// lib/types.ts — añadir a PatientSession
reflectionQuestions?: string[]  // 3 preguntas generadas por IA
```

---

## Feature 2 — Multi-Sesión

### Comportamiento
Al hacer clic en "Iniciar nuevo proceso" (Tarjeta 3 de Etapa 5):
1. Se crea una nueva `PatientSession` con:
   - `id`: nuevo ID único
   - `patientId`: mismo paciente existente
   - `sessionNumber`: sesiones anteriores del paciente + 1
   - `stage`: 2 (empieza en Conflictos, saltando Intake)
   - Resto de campos vacíos
2. Se llama `storage.saveSession(newSession)`
3. Se navega a `SESSION` con la nueva sesión activa

### Cambios en storage
`storage.getActiveSession(patientId)` ya funciona correctamente — retorna la primera sesión con `stage < 5`. Si todas las sesiones están en stage 5, retorna `null` y se crea una nueva.

### Cambios en page.tsx
Nueva función `handleNewSession(patient)` que crea la sesión y actualiza el estado.

---

## Feature 3 — Vista del Expediente Clínico (Terapeuta)

### Nueva vista: `RECORD`
Nueva vista en `AppView` accesible desde:
- El dashboard del terapeuta (clic en paciente con sesión completa)
- La Tarjeta 2 de la Etapa 5 (después de completar el flujo)

### Estructura del componente `PatientRecord`
```
components/stages/patient-record.tsx
```

**Secciones (en orden):**
1. **Header**: Nombre, edad, género, ID expediente, fecha, botón "← Expedientes"
2. **Selector de sesión**: Tabs "Sesión 1", "Sesión 2"... si hay múltiples sesiones
3. **Teoría dominante**: Badge con color por teoría + nombre + subcategoría + confianza
4. **Conflictos**: Cards de conflictos sintetizados con su mapeo teórico
   - Al final: sección colapsable "Pendiente de análisis" con `unmappedPhrases`
5. **Recuerdos**: Cards con suceso / sentimiento entonces / sentimiento ahora / keywords
6. **Interpretación**: Texto completo con badge "resonó" si `resonatedAt` existe
7. **Cierre**: Texto del cierre simbólico
8. **Preguntas de reflexión**: Las 3 preguntas si existen

### Colores por teoría
```typescript
const THEORY_COLORS = {
  psychoanalytic: { bg: 'var(--color-violet-light)', text: 'var(--color-violet)' },
  cbt: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
  gestalt: { bg: 'rgba(193,127,89,0.12)', text: 'var(--color-terracotta)' },
  systemic: { bg: 'rgba(107,94,82,0.1)', text: 'var(--color-deep)' },
}
```

---

## Feature 4 — Nueva Acción IA: Preguntas de Reflexión

### `generateReflectionQuestions` en `actions/ai.ts`
```typescript
export async function generateReflectionQuestions(params: {
  conflicts: Conflict[]
  theoryMatch: TheoryMatch
  closure: string
}): Promise<string[]>
```

**Prompt:** Genera exactamente 3 preguntas de reflexión profundas y personalizadas. Deben:
- Surgir directamente de los conflictos y teoría del paciente
- Invitar a la contemplación sin requerir respuesta inmediata
- Usar segunda persona ("¿Qué sientes cuando...")
- Ser abiertas, no retóricas
- Retornar JSON: `{ "questions": ["...", "...", "..."] }`

---

## Feature 5 — Frases Sin Mapear en StageConflicts

### Comportamiento actual
`unmappedPhrases` se retornan de `synthesizeConflicts` pero nunca se muestran.

### Comportamiento nuevo
Después de los conflictos sintetizados, si `session.unmappedPhrases.length > 0`, mostrar sección colapsable:
- Título: "Pendiente de análisis" con icono de advertencia sutil
- Descripción: "Estas frases no encajaron claramente en una teoría. Tu terapeuta puede explorarlas contigo."
- Lista de frases con estilo diferenciado (color muted, borde punteado)

---

## Feature 6 — Eliminar Pasos Hardcodeados

Los 3 items hardcodeados (`NEXT_STEPS`) en `stage-closure.tsx` se eliminan. Las tarjetas de acción de Feature 1 los reemplazan con contenido dinámico y significativo.

---

## Arquitectura de Navegación

```
AppView añade: 'RECORD'

page.tsx maneja:
  WELCOME → DASHBOARD | INTAKE
  INTAKE → SESSION (stage 2, nueva sesión)
  DASHBOARD → SESSION (sesión activa) | RECORD (ver expediente)
  SESSION (stage 5 completo) → RECORD | SESSION (nueva sesión) | DASHBOARD
  RECORD → DASHBOARD
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `lib/types.ts` | Añadir `reflectionQuestions?: string[]` a PatientSession, `'RECORD'` a AppView |
| `actions/ai.ts` | Nueva acción `generateReflectionQuestions` |
| `components/stages/stage-closure.tsx` | Rediseño completo — 3 tarjetas + reflexión IA |
| `components/stages/stage-conflicts.tsx` | Sección colapsable de frases sin mapear |
| `components/stages/patient-record.tsx` | Nuevo componente — vista clínica completa |
| `app/page.tsx` | Nueva vista RECORD, función handleNewSession |
