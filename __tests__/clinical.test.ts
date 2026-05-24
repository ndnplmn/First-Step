import { describe, it, expect } from 'vitest';
import { scorePHQ9, scoreGAD7, shouldShowAssessment, getAssessmentInstrument } from '../lib/clinical';

describe('scorePHQ9', () => {
  it('classifies 0–4 as minimal', () => {
    expect(scorePHQ9([0, 0, 1, 0, 0, 0, 0, 0, 0]).severity).toBe('minimal');
    expect(scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 0]).score).toBe(0);
  });

  it('classifies 5–9 as mild', () => {
    const r = scorePHQ9([1, 1, 1, 1, 1, 0, 0, 0, 0]);
    expect(r.score).toBe(5);
    expect(r.severity).toBe('mild');
  });

  it('classifies 10–14 as moderate', () => {
    expect(scorePHQ9([2, 2, 2, 2, 2, 0, 0, 0, 0]).severity).toBe('moderate');
  });

  it('classifies 15–19 as moderately-severe', () => {
    expect(scorePHQ9([2, 2, 2, 2, 2, 2, 1, 1, 1]).severity).toBe('moderately-severe');
  });

  it('classifies 20–27 as severe', () => {
    expect(scorePHQ9([3, 3, 3, 3, 3, 3, 2, 1, 0]).severity).toBe('severe');
  });

  it('sums answers correctly', () => {
    expect(scorePHQ9([1, 2, 3, 0, 1, 2, 0, 1, 1]).score).toBe(11);
  });
});

describe('scoreGAD7', () => {
  it('classifies 0–4 as minimal', () => {
    expect(scoreGAD7([1, 1, 0, 0, 0, 0, 0]).severity).toBe('minimal');
  });

  it('classifies 5–9 as mild', () => {
    expect(scoreGAD7([1, 1, 1, 1, 1, 0, 0]).severity).toBe('mild');
  });

  it('classifies 10–14 as moderate', () => {
    expect(scoreGAD7([2, 2, 2, 2, 2, 0, 0]).severity).toBe('moderate');
  });

  it('classifies 15–21 as severe', () => {
    expect(scoreGAD7([3, 3, 3, 3, 3, 0, 0]).severity).toBe('severe');
  });

  it('max score is 21', () => {
    expect(scoreGAD7([3, 3, 3, 3, 3, 3, 3]).score).toBe(21);
  });
});

describe('shouldShowAssessment', () => {
  it('returns false for session 1 (no assessment on first session)', () => {
    expect(shouldShowAssessment(1)).toBe(false);
  });

  it('returns true for session 2 (PHQ-9 baseline)', () => {
    expect(shouldShowAssessment(2)).toBe(true);
  });

  it('returns true for session 3 (GAD-7 baseline)', () => {
    expect(shouldShowAssessment(3)).toBe(true);
  });

  it('returns true every 4 sessions from session 6 (6, 10, 14)', () => {
    expect(shouldShowAssessment(6)).toBe(true);
    expect(shouldShowAssessment(10)).toBe(true);
    expect(shouldShowAssessment(14)).toBe(true);
  });

  it('returns false for sessions 1, 4, 5', () => {
    expect(shouldShowAssessment(1)).toBe(false);
    expect(shouldShowAssessment(4)).toBe(false);
    expect(shouldShowAssessment(5)).toBe(false);
  });

  it('returns false for sessions 7, 8, 9', () => {
    expect(shouldShowAssessment(7)).toBe(false);
    expect(shouldShowAssessment(8)).toBe(false);
    expect(shouldShowAssessment(9)).toBe(false);
  });
});

describe('getAssessmentInstrument', () => {
  it('returns phq9 for session 2', () => {
    expect(getAssessmentInstrument(2)).toBe('phq9');
  });

  it('returns gad7 for session 3', () => {
    expect(getAssessmentInstrument(3)).toBe('gad7');
  });

  it('returns both for follow-up sessions (6, 10, 14)', () => {
    expect(getAssessmentInstrument(6)).toBe('both');
    expect(getAssessmentInstrument(10)).toBe('both');
    expect(getAssessmentInstrument(14)).toBe('both');
  });
});
