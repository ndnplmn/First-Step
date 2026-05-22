import type { PHQ9Response, GAD7Response } from './types';

/* ── PHQ-9 ─────────────────────────────────────────────── */

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

export const PHQ9_SEVERITY_COLORS: Record<PHQ9Response['severity'], { bg: string; text: string }> = {
  'minimal': { bg: 'rgba(61,107,71,0.1)', text: 'var(--color-sage)' },
  'mild': { bg: 'rgba(196,163,90,0.12)', text: 'var(--color-terracotta)' },
  'moderate': { bg: 'rgba(180,110,69,0.12)', text: 'var(--color-terracotta)' },
  'moderately-severe': { bg: 'rgba(160,70,50,0.12)', text: '#a04632' },
  'severe': { bg: 'rgba(140,40,40,0.12)', text: '#8c2828' },
};

/* ── GAD-7 ─────────────────────────────────────────────── */

export function scoreGAD7(answers: number[]): GAD7Response {
  const score = answers.reduce((s, a) => s + a, 0);
  let severity: GAD7Response['severity'];
  if (score <= 4) severity = 'minimal';
  else if (score <= 9) severity = 'mild';
  else if (score <= 14) severity = 'moderate';
  else severity = 'severe';
  return { answers, score, severity, completedAt: Date.now() };
}

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
