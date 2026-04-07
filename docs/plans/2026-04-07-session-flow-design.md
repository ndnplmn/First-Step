# Session Flow & Enriched Check-in — Design

**Date:** 2026-04-07

## Problem

Two separate issues:

1. **Routing bug:** `handleComplete('new-session')` in `app/page.tsx` sends the user directly to SESSION, bypassing CHECK_IN entirely. Every session started from the closure screen has no wellbeing capture, no life changes, no session intention.

2. **Incomplete check-in:** The current CHECK_IN only asks "did anything change in your life?". It doesn't capture `wellbeingBefore` (only captured in intake) or what the user wants to work on today (`sessionIntention`). The AI in Stage 2 starts every session 2+ without knowing the user's emotional state or their specific intention.

## Solution

### Routing fix

Change `handleComplete('new-session')` in `app/page.tsx` from `setView('SESSION')` to `setView('CHECK_IN')`. One-line fix. All sessions 2+ — regardless of origin — always pass through CHECK_IN.

### Enriched CHECK_IN (3 conversational steps)

Replace the single-screen CHECK_IN with a 3-step conversational flow matching intake's visual pattern: progress bar, AnimatePresence between steps, previous answers as compact bubbles.

| Step | Question | Input | Skip? | Saves to |
|------|----------|-------|-------|----------|
| 0 | "Hola [nombre], ¿cómo te sientes hoy?" | 5 wellbeing chips | No | `session.wellbeingBefore` |
| 1 | "¿Hubo algún cambio importante desde la última vez?" | Life change chips + optional textarea | Yes ("Todo sigue igual") | `session.lifeChanges` |
| 2 | "¿Qué quieres trabajar hoy?" | Free textarea | Yes ("Continuar sin definir un tema") | `session.sessionIntention` |

### New field: `sessionIntention`

Add `sessionIntention?: string` to `PatientSession` in `lib/types.ts`.

### AI context enrichment

In `actions/ai.ts`, `buildPatientContext` includes `sessionIntention` when present:
```
Intención para esta sesión: "quiero hablar sobre mi relación con mi madre"
```
This gives `getNextTherapistQuestion` a concrete starting point for the first question.

## Files to change

- `lib/types.ts` — add `sessionIntention?: string` to PatientSession
- `components/stages/check-in.tsx` — full rewrite to 3-step flow
- `app/page.tsx` — fix `handleComplete('new-session')` routing
- `actions/ai.ts` — add `sessionIntention` to `buildPatientContext`
