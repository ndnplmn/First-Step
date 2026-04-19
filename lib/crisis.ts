/**
 * Crisis detection utilities
 * Detects high-risk language in Spanish-language text inputs.
 */

const CRISIS_PATTERNS = [
  // Suicidal ideation
  /suicid/i,
  /quitarme\s+la\s+vida/i,
  /matarme/i,
  /no\s+quiero\s+vivir/i,
  /no\s+vale\s+la\s+pena\s+vivir/i,
  /mejor\s+estar\s+muerto/i,
  /mejor\s+muerta/i,
  /prefiero\s+morir/i,
  /deseo\s+morir/i,
  /ganas\s+de\s+morir/i,
  /pensar\s+en\s+morir/i,
  /pienso\s+en\s+morir/i,
  /hacerme\s+da[ñn]o/i,
  /hacerme\s+daño/i,
  /lastimar(me)?/i,
  /cortar(me)?/i,
  /autolesion/i,
  /auto\s*lesion/i,
  /pastillas\s+para\s+morir/i,
  /tomar\s+pastillas\s+para/i,
  // Self-harm
  /me\s+hago\s+da[ñn]o/i,
  /me\s+corto/i,
  /me\s+hiero/i,
  // Hopelessness with severity
  /ya\s+no\s+aguanto/i,
  /no\s+puedo\s+m[aá]s\s+con/i,
  /no\s+veo\s+salida/i,
  /no\s+hay\s+salida/i,
  /plan\s+para\s+morir/i,
  /manera\s+de\s+morir/i,
  /forma\s+de\s+morir/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some(pattern => pattern.test(text));
}

export const CRISIS_LINES = [
  { country: 'España', number: '024', label: '024' },
  { country: 'México', number: '800 290 0024', label: '800 290 0024' },
  { country: 'Argentina', number: '135', label: '135' },
  { country: 'Chile', number: '600 360 7777', label: '600 360 7777' },
  { country: 'Colombia', number: '106', label: '106' },
];
