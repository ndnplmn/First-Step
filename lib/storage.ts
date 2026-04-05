import { Patient, PatientSession, DiaryEntry } from './types';

const PATIENTS_KEY = 'fs_patients';
const SESSIONS_KEY = 'fs_sessions';
const DIARY_KEY_PREFIX = 'fs_diary_';

export const storage = {
  getPatients(): Patient[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]');
    } catch { return []; }
  },

  savePatient(patient: Patient): void {
    const patients = this.getPatients();
    const idx = patients.findIndex(p => p.id === patient.id);
    if (idx >= 0) patients[idx] = patient;
    else patients.unshift(patient);
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  },

  getSessions(patientId?: string): PatientSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const all = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') as PatientSession[];
      return patientId ? all.filter(s => s.patientId === patientId) : all;
    } catch { return []; }
  },

  saveSession(session: PatientSession): void {
    const sessions = this.getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  },

  getActiveSession(patientId: string): PatientSession | null {
    const sessions = this.getSessions(patientId);
    return sessions.find(s => s.stage < 5) ?? null;
  },

  getDiaryEntries(patientId: string): DiaryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(`${DIARY_KEY_PREFIX}${patientId}`) || '[]');
    } catch { return []; }
  },

  saveDiaryEntry(entry: DiaryEntry): void {
    const entries = this.getDiaryEntries(entry.patientId);
    entries.unshift(entry);
    localStorage.setItem(`${DIARY_KEY_PREFIX}${entry.patientId}`, JSON.stringify(entries));
  },

  deleteDiaryEntry(patientId: string, entryId: string): void {
    const entries = this.getDiaryEntries(patientId).filter(e => e.id !== entryId);
    localStorage.setItem(`${DIARY_KEY_PREFIX}${patientId}`, JSON.stringify(entries));
  },
};
