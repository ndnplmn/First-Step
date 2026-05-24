import { shouldShowAssessment } from './clinical';
import type { Patient, PatientSession, AppView } from './types';

export function getViewAfterSessionStart(
  session: PatientSession,
): AppView {
  // Session 1: skip check-in and assessment, go straight to session
  if (session.sessionNumber === 1) {
    return 'SESSION';
  }
  return 'CHECK_IN';
}

export function getViewAfterCheckIn(session: PatientSession): AppView {
  return shouldShowAssessment(session.sessionNumber) ? 'ASSESSMENT' : 'SESSION';
}

export function getViewAfterAssessment(): AppView {
  return 'SESSION';
}

export function isSessionActive(session: PatientSession): boolean {
  return session.stage < 6;
}

export function nextSessionNumber(completedSessions: PatientSession[]): number {
  const completed = completedSessions.filter(s => s.stage >= 6);
  return completed.length + 1;
}

export function resolveInitialSessionView(
  patient: Patient,
  sessions: PatientSession[],
): { view: AppView; sessionToUse: PatientSession | null } {
  const active = sessions.find(s => isSessionActive(s)) ?? null;
  if (active) {
    return { view: 'SESSION', sessionToUse: active };
  }
  return { view: null as unknown as AppView, sessionToUse: null };
}
