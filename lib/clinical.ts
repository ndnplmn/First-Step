import type { PHQ9Response, GAD7Response } from './types';

/* ── Frequency labels (same for both instruments) ──────── */

export const FREQUENCY_OPTIONS = [
  { value: 0, short: '0', label: 'Ningún día' },
  { value: 1, short: '1', label: 'Varios días' },
  { value: 2, short: '2', label: 'Más de la mitad' },
  { value: 3, short: '3', label: 'Casi todos los días' },
] as const;

/* ── PHQ-9 ─────────────────────────────────────────────── */

export const PHQ9_QUESTIONS = [
  'Poco interés o placer en hacer las cosas',
  'Sentirte decaído/a, deprimido/a o sin esperanzas',
  'Dificultad para dormir o para no dejar de dormir',
  'Sentirte cansado/a o con poca energía',
  'Tener poco apetito o comer en exceso',
  'Sentirte mal contigo mismo/a o que eres un fracaso',
  'Dificultad para concentrarte en cosas como leer o ver algo',
  'Moverte o hablar más lento de lo normal, o al contrario estar tan agitado/a que no puedes quedarte quieto/a',
  'Tener pensamientos de que estarías mejor muerto/a o de hacerte daño',
] as const;

export function scorePHQ9(answers: number[]): PHQ9Response {
  const score = answers.reduce((s, a) => s + a, 0);
  let severity: PHQ9Response['severity'];
  if (score <= 4) severity = 'minimal';
  else if (score <= 9) severity = 'mild';
  else if (score <= 14) severity = 'moderate';
  else if (score <= 19) severity = 'moderately-severe';
  else severity = 'severe';
  return { answers, score, severity, completedAt: Date.now() };
}

export const PHQ9_SEVERITY_LABELS: Record<PHQ9Response['severity'], string> = {
  'minimal': 'Mínimo',
  'mild': 'Leve',
  'moderate': 'Moderado',
  'moderately-severe': 'Mod. grave',
  'severe': 'Grave',
};

export const PHQ9_SEVERITY_COLORS: Record<PHQ9Response['severity'], { bg: string; text: string }> = {
  'minimal': { bg: 'rgba(61,107,71,0.1)', text: 'var(--color-sage)' },
  'mild': { bg: 'rgba(196,163,90,0.12)', text: 'var(--color-terracotta)' },
  'moderate': { bg: 'rgba(180,110,69,0.12)', text: 'var(--color-terracotta)' },
  'moderately-severe': { bg: 'rgba(160,70,50,0.12)', text: '#a04632' },
  'severe': { bg: 'rgba(140,40,40,0.12)', text: '#8c2828' },
};

/* ── GAD-7 ─────────────────────────────────────────────── */

export const GAD7_QUESTIONS = [
  'Sentirte nervioso/a, ansioso/a o al límite',
  'No poder dejar de preocuparte o no poder controlar la preocupación',
  'Preocuparte demasiado por diferentes cosas',
  'Dificultad para relajarte',
  'Estar tan intranquilo/a que es difícil permanecer sentado/a quieto/a',
  'Molestarte o ponerte irritable fácilmente',
  'Sentir miedo de que algo terrible podría pasar',
] as const;

export function scoreGAD7(answers: number[]): GAD7Response {
  const score = answers.reduce((s, a) => s + a, 0);
  let severity: GAD7Response['severity'];
  if (score <= 4) severity = 'minimal';
  else if (score <= 9) severity = 'mild';
  else if (score <= 14) severity = 'moderate';
  else severity = 'severe';
  return { answers, score, severity, completedAt: Date.now() };
}

export const GAD7_SEVERITY_LABELS: Record<GAD7Response['severity'], string> = {
  'minimal': 'Mínimo',
  'mild': 'Leve',
  'moderate': 'Moderado',
  'severe': 'Grave',
};

export const GAD7_SEVERITY_COLORS: Record<GAD7Response['severity'], { bg: string; text: string }> = {
  'minimal': { bg: 'rgba(61,107,71,0.1)', text: 'var(--color-sage)' },
  'mild': { bg: 'rgba(196,163,90,0.12)', text: 'var(--color-terracotta)' },
  'moderate': { bg: 'rgba(180,110,69,0.12)', text: 'var(--color-terracotta)' },
  'severe': { bg: 'rgba(140,40,40,0.12)', text: '#8c2828' },
};

/* ── Trigger logic ─────────────────────────────────────── */

/** Show assessments on session 1, then every 4 sessions (1, 5, 9, 13…) */
export function shouldShowAssessment(sessionNumber: number): boolean {
  return sessionNumber === 1 || (sessionNumber - 1) % 4 === 0;
}
