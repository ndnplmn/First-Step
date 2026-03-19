'use client';

import { useState, useEffect } from 'react';
import { Welcome } from '@/components/stages/welcome';
import { Dashboard } from '@/components/stages/dashboard';
import { Intake } from '@/components/stages/intake';
import { SessionView } from '@/components/stages/session-view';
import { PatientRecord } from '@/components/stages/patient-record';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/id';
import type { Patient, PatientSession, AppView } from '@/lib/types';

export default function Home() {
  const [view, setView] = useState<AppView>('WELCOME');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeSession, setActiveSession] = useState<PatientSession | null>(null);
  const [recordPatient, setRecordPatient] = useState<Patient | null>(null);
  const [recordSessions, setRecordSessions] = useState<PatientSession[]>([]);

  useEffect(() => {
    setPatients(storage.getPatients());
  }, []);

  const createNewSession = (patient: Patient): PatientSession => {
    const existingSessions = storage.getSessions(patient.id);
    return {
      id: generateId(),
      patientId: patient.id,
      sessionNumber: existingSessions.length + 1,
      stage: 2,
      conflicts: [],
      theoryMatch: null,
      memories: [],
      interpretation: null,
      closure: null,
      unmappedPhrases: [],
      reflectionQuestions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  };

  const handlePatientSelect = (patient: Patient) => {
    setActivePatient(patient);
    const session = storage.getActiveSession(patient.id);
    if (session) {
      setActiveSession(session);
      setView('SESSION');
    } else {
      const newSession = createNewSession(patient);
      storage.saveSession(newSession);
      setActiveSession(newSession);
      setView('SESSION');
    }
  };

  const handleViewRecord = (patient: Patient) => {
    const sessions = storage.getSessions(patient.id);
    setRecordPatient(patient);
    setRecordSessions(sessions);
    setView('RECORD');
  };

  const handleIntakeComplete = (patient: Patient, session: PatientSession) => {
    storage.savePatient(patient);
    storage.saveSession(session);
    setPatients(storage.getPatients());
    setActivePatient(patient);
    setActiveSession(session);
    setView('SESSION');
  };

  const handleSessionUpdate = (updated: PatientSession) => {
    storage.saveSession(updated);
    setActiveSession(updated);
  };

  const handleComplete = (action: 'dashboard' | 'record' | 'new-session') => {
    setPatients(storage.getPatients());
    if (action === 'dashboard') {
      setView('DASHBOARD');
    } else if (action === 'record' && activePatient) {
      handleViewRecord(activePatient);
    } else if (action === 'new-session' && activePatient) {
      const newSession = createNewSession(activePatient);
      storage.saveSession(newSession);
      setActiveSession(newSession);
      setView('SESSION');
    }
  };

  if (view === 'WELCOME') {
    return (
      <Welcome
        hasExistingPatients={patients.length > 0}
        onStart={() => setView('INTAKE')}
        onContinue={() => setView('DASHBOARD')}
      />
    );
  }

  if (view === 'DASHBOARD') {
    return (
      <Dashboard
        patients={patients}
        onSelect={handlePatientSelect}
        onViewRecord={handleViewRecord}
        onNew={() => setView('INTAKE')}
        onBack={() => setView('WELCOME')}
      />
    );
  }

  if (view === 'INTAKE') {
    return (
      <Intake
        onComplete={handleIntakeComplete}
        onBack={() => setView('WELCOME')}
      />
    );
  }

  if (view === 'SESSION' && activePatient && activeSession) {
    return (
      <SessionView
        patient={activePatient}
        session={activeSession}
        onSessionUpdate={handleSessionUpdate}
        onComplete={handleComplete}
      />
    );
  }

  if (view === 'RECORD' && recordPatient) {
    return (
      <PatientRecord
        patient={recordPatient}
        sessions={recordSessions}
        onBack={() => setView('DASHBOARD')}
      />
    );
  }

  return null;
}
