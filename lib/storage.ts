import { Patient, PatientSession } from './types';

const PATIENTS_KEY = 'fs_patients';
const SESSIONS_KEY = 'fs_sessions';

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
};
