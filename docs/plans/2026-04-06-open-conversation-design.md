# Conversación abierta en Stage Conflicts — Diseño

**Fecha:** 2026-04-06
**Feature:** Flujo conversacional indefinido con mensaje puente en Stage 2

## Problema

El flujo actual corta la conversación tras un máximo hardcodeado de 4 preguntas (`MAX_QUESTIONS = 4`). El usuario no puede seguir hablando aunque sienta que no ha dicho todo lo que quería. Esto contradice el principio terapéutico central de la app: que el paciente se sienta plenamente escuchado.

## Decisión de diseño: Opción B — La IA propone, el usuario confirma

Cuando la IA evalúa que tiene suficiente información para el análisis, en lugar de proceder directamente, muestra un **mensaje puente** personalizado y le pregunta al usuario si quiere seguir explorando o si está listo para continuar. El ciclo puede repetirse indefinidamente.

## Flujo nuevo

```
Usuario escribe
  → IA pregunta (sin límite de rondas)
  → IA evalúa: done: true
      → Mensaje puente + dos opciones
          ├── "Quiero profundizar en algo" → textarea vuelve, conversación continúa
          │     └── IA evalúa de nuevo → mismo puente cuando corresponda
          └── "Estoy listo/a para continuar" → Análisis
```

## Mensaje puente

Generado por la IA (modificación de `getNextTherapistQuestion`). Cuando `done: true`, el modelo genera además un `bridgeMessage` que:
1. Valida el esfuerzo del usuario en 1 oración cálida
2. Menciona 1-2 temas centrales que emergieron (sin lenguaje clínico)
3. Formula la pregunta abierta de si hay algo más

Ejemplo: *"Has compartido mucho hoy — todo lo que sientes con tu trabajo y la distancia que percibes en casa. Antes de que lo destilemos juntos: ¿hay algo más que quieras contarme, o algún tema que sientas que no tuvimos espacio de tocar?"*

## UI del estado puente

El mensaje puente aparece como burbuja del terapeuta en el hilo conversacional.

FloatingBar en estado puente:
- CTA principal: "Estoy listo/a para continuar →" (color sage, dispara análisis)
- Enlace secundario: "Quiero profundizar en algo" (color muted, reactiva textarea)

## Cambios técnicos

### `actions/ai.ts`
- `getNextTherapistQuestion` retorna `bridgeMessage: string | null`
- Cuando `done: true`, el prompt genera el bridgeMessage personalizado
- Cuando `done: false`, `bridgeMessage` es `null`

### `components/stages/stage-conflicts.tsx`
- Eliminar `MAX_QUESTIONS = 4`
- Agregar estado: `showBridge: boolean`, `bridgeMessage: string`
- Cuando IA retorna `done: true` → activar estado puente en lugar de ir al análisis
- Nuevo handler `handleContinueDeep`: desactiva puente, reactiva textarea
- 2 skips seguidos en modo libre → re-evaluar (no ir directo al análisis)
- FloatingBar condicional según `showBridge`

### Sin cambios
- `synthesizeConflicts` y resto de AI actions
- Tipos, storage, otros stages
