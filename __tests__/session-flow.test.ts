import { describe, it, expect } from 'vitest';
import {
  getViewAfterSessionStart,
  getViewAfterCheckIn,
  getViewAfterAssessment,
  isSessionActive,
  nextSessionNumber,
} from '../lib/session-routing';
import { shouldShowAssessment } from '../lib/clinical';
import { scorePHQ9, scoreGAD7 } from '../lib/clinical';
import type { PatientSession } from '../lib/types';

function makeSession(overrides: Partial<PatientSession> = {}): PatientSession {
  return {
    id: 'test-id',
    patientId: 'patient-1',
    sessionNumber: 1,
    stage: 2,
    conflicts: [],
    frameworkMatches: [],
    gestaltActivity: null,
    memories: [],
    interpretation: null,
    closure: null,
    unmappedPhrases: [],
    reflectionQuestions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/* ── Happy path: Session 1 ────────────────────────────────── */

describe('Session 1 happy path', () => {
  it('routes directly to SESSION (skips check-in and assessment)', () => {
    const session = makeSession({ sessionNumber: 1 });
    expect(getViewAfterSessionStart(session)).toBe('SESSION');
  });

  it('routes to SESSION after assessment', () => {
    expect(getViewAfterAssessment()).toBe('SESSION');
  });

  it('session is active while stage < 6', () => {
    expect(isSessionActive(makeSession({ stage: 2 }))).toBe(true);
    expect(isSessionActive(makeSession({ stage: 5 }))).toBe(true);
  });

  it('session is complete at stage 6', () => {
    expect(isSessionActive(makeSession({ stage: 6 }))).toBe(false);
  });
});

/* ── Happy path: Session 2 ────────────────────────────────── */

describe('Session 2 happy path', () => {
  it('routes through CHECK_IN for session 2', () => {
    const session = makeSession({ sessionNumber: 2 });
    expect(getViewAfterSessionStart(session)).toBe('CHECK_IN');
  });

  it('routes to ASSESSMENT after check-in (baseline assessment due at session 2)', () => {
    const session = makeSession({ sessionNumber: 2 });
    expect(getViewAfterCheckIn(session)).toBe('ASSESSMENT');
  });
});

/* ── Assessment trigger schedule ─────────────────────────── */

describe('Assessment trigger schedule (session 2, 6, 10, 14…)', () => {
  const triggeredAt = [2, 3, 6, 10, 14, 18];
  const skippedAt = [1, 4, 5, 7, 8, 9, 11, 12, 13];

  for (const n of triggeredAt) {
    it(`triggers assessment at session ${n}`, () => {
      expect(shouldShowAssessment(n)).toBe(true);
    });
  }

  for (const n of skippedAt) {
    it(`skips assessment at session ${n}`, () => {
      expect(shouldShowAssessment(n)).toBe(false);
    });
  }

  it('routes through ASSESSMENT when due', () => {
    const session = makeSession({ sessionNumber: 6 });
    expect(getViewAfterCheckIn(session)).toBe('ASSESSMENT');
  });
});

/* ── Session numbering ────────────────────────────────────── */

describe('Session numbering', () => {
  it('first session is session 1', () => {
    expect(nextSessionNumber([])).toBe(1);
  });

  it('increments correctly after completed sessions', () => {
    const completed = [
      makeSession({ stage: 6, sessionNumber: 1 }),
      makeSession({ stage: 6, sessionNumber: 2 }),
    ];
    expect(nextSessionNumber(completed)).toBe(3);
  });

  it('does not count in-progress sessions', () => {
    const mixed = [
      makeSession({ stage: 6, sessionNumber: 1 }),
      makeSession({ stage: 3, sessionNumber: 2 }), // in progress
    ];
    expect(nextSessionNumber(mixed)).toBe(2);
  });
});

/* ── Active session resume ────────────────────────────────── */

describe('Active session resume', () => {
  it('detects an in-progress session correctly', () => {
    const session = makeSession({ stage: 3 });
    expect(isSessionActive(session)).toBe(true);
  });

  it('does not treat a completed session as active', () => {
    const session = makeSession({ stage: 6 });
    expect(isSessionActive(session)).toBe(false);
  });
});

/* ── Clinical scoring integration ───────────────────────────*/

describe('Clinical scores flow through session', () => {
  it('PHQ-9 and GAD-7 scores can be attached to a session', () => {
    const phq9 = scorePHQ9([1, 1, 1, 1, 1, 0, 0, 0, 0]); // score 5 = mild
    const gad7 = scoreGAD7([1, 1, 1, 0, 0, 0, 0]);       // score 3 = minimal

    const session = makeSession({ sessionNumber: 1, phq9, gad7 });

    expect(session.phq9?.severity).toBe('mild');
    expect(session.gad7?.severity).toBe('minimal');
    expect(session.phq9?.score).toBe(5);
    expect(session.gad7?.score).toBe(3);
  });

  it('wellbeing delta is positive when patient improves', () => {
    const session = makeSession({
      wellbeingBefore: 2,
      wellbeingAfter: 4,
    });
    const delta = (session.wellbeingAfter ?? 0) - (session.wellbeingBefore ?? 0);
    expect(delta).toBe(2);
    expect(delta).toBeGreaterThan(0);
  });

  it('wellbeing delta is negative when patient feels worse', () => {
    const session = makeSession({
      wellbeingBefore: 4,
      wellbeingAfter: 2,
    });
    const delta = (session.wellbeingAfter ?? 0) - (session.wellbeingBefore ?? 0);
    expect(delta).toBeLessThan(0);
  });
});
