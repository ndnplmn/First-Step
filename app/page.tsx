'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Welcome } from '@/components/stages/welcome';
import { TendLogo } from '@/components/ui/logo';
import { Dashboard } from '@/components/stages/dashboard';
import { Intake } from '@/components/stages/intake';
import { SessionView } from '@/components/stages/session-view';
import { PatientRecord } from '@/components/stages/patient-record';
import { CheckIn } from '@/components/stages/check-in';
import { Diary } from '@/components/stages/diary';
import { Progress } from '@/components/stages/progress';
import { Settings } from '@/components/stages/settings';
import { AuthForm } from '@/components/auth/auth-form';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { ClinicalAssessment } from '@/components/stages/clinical-assessment';
import { db } from '@/lib/db';
import { createClient } from '@/lib/supabase';
import { generateId } from '@/lib/id';
import { shouldShowAssessment } from '@/lib/clinical';
import type { Patient, PatientSession, DiaryEntry, AppView } from '@/lib/types';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <TendLogo size={36} />
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<AppView>('WELCOME');
  const [loading, setLoading] = useState(true);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [activeSession, setActiveSession] = useState<PatientSession | null>(null);
  const [recordSessions, setRecordSessions] = useState<PatientSession[]>([]);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

  const initApp = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setView('AUTH');
      setLoading(false);
      return;
    }

    const profile = await db.getProfile();
    if (!profile) {
      const onboardingDone = await db.isOnboardingCompleted();
      setView(onboardingDone ? 'INTAKE' : 'ONBOARDING');
      setLoading(false);
      return;
    }

    // Check for localStorage data to migrate
    try {
      const localPatients = localStorage.getItem('fs_patients');
      if (localPatients && JSON.parse(localPatients).length > 0) {
        setShowMigrationPrompt(true);
      }
    } catch {}

    setActivePatient(profile);

    const allSessions = await db.getSessions();
    setSessions(allSessions);
    const active = allSessions.find(s => s.stage < 6) ?? null;
    if (active) setActiveSession(active);

    setView('DASHBOARD');
    setLoading(false);
  };

  useEffect(() => {
    initApp();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string) => {
      if (event === 'SIGNED_OUT') {
        setView('AUTH');
        setActivePatient(null);
        setActiveSession(null);
        setSessions([]);
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthSuccess = async () => {
    setLoading(true);
    await initApp();
  };

  const handleOnboardingComplete = async () => {
    await db.markOnboardingCompleted();
    setView('INTAKE');
  };

  const createNewSession = (patient: Patient): PatientSession => {
    return {
      id: generateId(),
      patientId: patient.id,
      sessionNumber: sessions.length + 1,
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
    };
  };

  const handlePatientSelect = async (patient: Patient) => {
    setActivePatient(patient);
    const active = sessions.find(s => s.stage < 6) ?? null;
    if (active) {
      setActiveSession(active);
      setView('SESSION');
    } else {
      const newSession = createNewSession(patient);
      await db.saveSession(newSession);
      setActiveSession(newSession);
      setView(newSession.sessionNumber > 1 ? 'CHECK_IN' : 'SESSION');
    }
  };

  const handleViewRecord = () => {
    setRecordSessions(sessions);
    setView('RECORD');
  };

  const handleViewDiary = () => {
    setView('DIARY');
  };

  const handleViewProgress = () => {
    setRecordSessions(sessions);
    setView('PROGRESS');
  };

  const handleViewSettings = () => {
    setView('SETTINGS');
  };

  const handleIntakeComplete = async (patient: Patient, session: PatientSession) => {
    await db.saveProfile(patient);
    await db.saveSession(session);
    const allSessions = await db.getSessions();
    setSessions(allSessions);
    setActivePatient(patient);
    setActiveSession(session);
    setView('SESSION');
  };

  const handleCheckInComplete = async (updatedSession: PatientSession) => {
    await db.saveSession(updatedSession);
    setActiveSession(updatedSession);
    if (shouldShowAssessment(updatedSession.sessionNumber)) {
      setView('ASSESSMENT');
    } else {
      setView('SESSION');
    }
  };

  const handleAssessmentComplete = async (updatedSession: PatientSession) => {
    await db.saveSession(updatedSession);
    setActiveSession(updatedSession);
    setView('SESSION');
  };

  const handleSessionUpdate = async (updated: PatientSession) => {
    await db.saveSession(updated);
    setActiveSession(updated);
  };

  const handleComplete = async (action: 'dashboard' | 'record' | 'new-session') => {
    const allSessions = await db.getSessions();
    setSessions(allSessions);
    if (action === 'dashboard') {
      setView('DASHBOARD');
    } else if (action === 'record') {
      setRecordSessions(allSessions);
      setView('RECORD');
    } else if (action === 'new-session' && activePatient) {
      const newSession = createNewSession(activePatient);
      await db.saveSession(newSession);
      setActiveSession(newSession);
      setView('CHECK_IN');
    } else {
      setView('DASHBOARD');
    }
  };

  const handleMigrate = async () => {
    try {
      const localPatients: Patient[] = JSON.parse(localStorage.getItem('fs_patients') || '[]');
      const localSessions: PatientSession[] = JSON.parse(localStorage.getItem('fs_sessions') || '[]');
      const user = await db.getUser();
      if (!user) return;

      for (const session of localSessions) {
        await db.saveSession({ ...session, patientId: user.id });
      }

      for (const patient of localPatients) {
        const localDiary: DiaryEntry[] = JSON.parse(
          localStorage.getItem(`fs_diary_${patient.id}`) || '[]'
        );
        for (const entry of localDiary) {
          await db.saveDiaryEntry({ ...entry, patientId: user.id });
        }
        localStorage.removeItem(`fs_diary_${patient.id}`);
      }

      localStorage.removeItem('fs_patients');
      localStorage.removeItem('fs_sessions');

      const allSessions = await db.getSessions();
      setSessions(allSessions);
      setShowMigrationPrompt(false);
    } catch (err) {
      console.error('Migration failed:', err);
    }
  };

  const handleSignOut = async () => {
    await db.signOut();
  };

  if (loading) return <LoadingScreen />;

  if (view === 'AUTH') {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  if (view === 'ONBOARDING') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (view === 'WELCOME') {
    return (
      <Welcome
        hasExistingPatients={sessions.length > 0}
        onStart={() => setView('INTAKE')}
        onContinue={() => setView('DASHBOARD')}
      />
    );
  }

  if (view === 'DASHBOARD' && activePatient) {
    return (
      <Dashboard
        patient={activePatient}
        sessions={sessions}
        activeSession={activeSession}
        onStartSession={() => handlePatientSelect(activePatient)}
        onViewRecord={handleViewRecord}
        onViewDiary={handleViewDiary}
        onViewProgress={handleViewProgress}
        onViewSettings={handleViewSettings}
        onNew={() => handlePatientSelect(activePatient)}
        onSignOut={handleSignOut}
        showMigrationPrompt={showMigrationPrompt}
        onMigrate={handleMigrate}
        onDismissMigration={() => setShowMigrationPrompt(false)}
      />
    );
  }

  if (view === 'INTAKE') {
    return (
      <Intake
        onComplete={handleIntakeComplete}
        onBack={() => setView(activePatient ? 'DASHBOARD' : 'AUTH')}
      />
    );
  }

  if (view === 'CHECK_IN' && activePatient && activeSession) {
    return (
      <CheckIn
        patient={activePatient}
        session={activeSession}
        onComplete={handleCheckInComplete}
      />
    );
  }

  if (view === 'ASSESSMENT' && activeSession) {
    return (
      <ClinicalAssessment
        session={activeSession}
        onComplete={handleAssessmentComplete}
      />
    );
  }

  if (view === 'SESSION' && activePatient && activeSession) {
    const priorSessions = sessions.filter(
      s => s.stage === 6 && s.sessionNumber < activeSession.sessionNumber
    );
    return (
      <SessionView
        patient={activePatient}
        session={activeSession}
        priorSessions={priorSessions}
        onSessionUpdate={handleSessionUpdate}
        onComplete={handleComplete}
      />
    );
  }

  if (view === 'RECORD' && activePatient) {
    return (
      <PatientRecord
        patient={activePatient}
        sessions={recordSessions}
        onBack={() => setView('DASHBOARD')}
      />
    );
  }

  if (view === 'DIARY' && activePatient) {
    return (
      <Diary
        patient={activePatient}
        onBack={() => setView('DASHBOARD')}
      />
    );
  }

  if (view === 'PROGRESS' && activePatient) {
    return (
      <Progress
        patient={activePatient}
        sessions={recordSessions}
        onBack={() => setView('DASHBOARD')}
      />
    );
  }

  if (view === 'SETTINGS') {
    return (
      <Settings
        onBack={() => setView('DASHBOARD')}
        onSignOut={handleSignOut}
      />
    );
  }

  return null;
}
