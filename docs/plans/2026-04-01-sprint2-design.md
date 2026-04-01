# Sprint 2: Onboarding Conversacional, Bienestar y Carta Personal — Design

## Decisions

1. **Intake conversacional**: Conversación guiada con estructura fija — preguntas estáticas una por una con tono cálido, mismos campos del Patient type
2. **Indicador de bienestar**: Integrado naturalmente — paso 0 del intake + tarjeta pre-acciones en cierre
3. **Carta personal**: Reemplazar prompt de cierre por formato carta epistolar

## Feature 1: Intake Conversacional

Reescribir `intake.tsx` de accordion a flujo step-by-step conversacional. 12 pasos, cada uno muestra una pregunta con input. Respuestas anteriores visibles como burbujas. Mismos campos de Patient, misma validación.

## Feature 2: Indicador de Bienestar

Agregar `wellbeingBefore?: number` y `wellbeingAfter?: number` (1-5) a PatientSession. Escala: Muy mal / Mal / Regular / Bien / Muy bien. Inicio en paso 0 del intake, cierre en stage-closure antes de acciones.

## Feature 3: Carta Personal

Modificar prompt de `generateClosure` para formato carta: "Querido/a [nombre]," ... "Con cariño, tu primer paso". Header del cierre cambia a "Una carta para ti".
