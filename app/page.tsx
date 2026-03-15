'use client';

import { useState, useEffect } from 'react';
import { Welcome } from '@/components/stages/welcome';
import { Dashboard } from '@/components/stages/dashboard';
import { Intake } from '@/components/stages/intake';
import { SessionView } from '@/components/stages/session-view';
import { storage } from '@/lib/storage';
import type { Patient, PatientSession, AppView } from '@/lib/types';

export default function Home() {
  const [view, setView] = useState<AppView>('WELCOME');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeSession, setActiveSession] = useState<PatientSession | null>(null);

  useEffect(() => {
    setPatients(storage.getPatients());
  }, []);

  const handlePatientSelect = (patient: Patient) => {
    setActivePatient(patient);
    const session = storage.getActiveSession(patient.id);
    if (session) {
      setActiveSession(session);
      setView('SESSION');
    } else {
      // Paciente ya completó su proceso — iniciar nueva sesión
      setActiveSession(null);
      setView('INTAKE');
    }
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

  const handleComplete = () => {
    setPatients(storage.getPatients());
    setView('DASHBOARD');
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

  return null;
}
