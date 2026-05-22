import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { computeStreak } from '../lib/streak';
import type { PatientSession } from '../lib/types';

function makeSession(daysAgo: number, id = 'x'): PatientSession {
  const ts = Date.now() - daysAgo * 86_400_000;
  return {
    id,
    patientId: 'p1',
    sessionNumber: 1,
    stage: 6,
    conflicts: [],
    frameworkMatches: [],
    gestaltActivity: null,
    memories: [],
    interpretation: null,
    closure: null,
    unmappedPhrases: [],
    reflectionQuestions: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

describe('computeStreak', () => {
  it('returns 0 for empty sessions', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('returns 1 for a single session today', () => {
    expect(computeStreak([makeSession(0)])).toBe(1);
  });

  it('counts consecutive days correctly', () => {
    const sessions = [makeSession(0, 'a'), makeSession(1, 'b'), makeSession(2, 'c')];
    expect(computeStreak(sessions)).toBe(3);
  });

  it('does not count a gap in streak', () => {
    const sessions = [makeSession(0, 'a'), makeSession(2, 'b')]; // gap at day 1
    expect(computeStreak(sessions)).toBe(1);
  });

  it('streak is still alive if active yesterday but not today', () => {
    const sessions = [makeSession(1, 'a'), makeSession(2, 'b')];
    expect(computeStreak(sessions)).toBe(2);
  });

  it('returns 0 if last active more than 1 day ago', () => {
    expect(computeStreak([makeSession(3)])).toBe(0);
  });
});
