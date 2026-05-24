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
import { shouldShowAssessment, getAssessmentInstrument } from '@/lib/clinical';
import { ErrorBoundary } from '@/components/ui/error-boundary';
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
  const [preSettingsView, setPreSettingsView] = useState<AppView>('DASHBOARD');
  const [lastDiaryEntry, setLastDiaryEntry] = useState<DiaryEntry | null>(null);

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

    const diaryEntries = await db.getDiaryEntries().catch(() => []);
    const recent = diaryEntries.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
    setLastDiaryEntry(recent);

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
    setPreSettingsView(view);
    setView('SETTINGS');
  };

  const handleIntakeComplete = async (patient: Patient, session: PatientSession) => {
    await db.saveProfile(patient);
    await db.saveSession(session);
    const allSessions = await db.getSessions();
    setSessions(allSessions);
    setActivePatient(patient);
    setActiveSession(session);
    // Session 1: show a brief interstitial so the user can start later if overwhelmed
    setView(session.sessionNumber === 1 ? 'SESSION_INTRO' : (shouldShowAssessment(session.sessionNumber) ? 'ASSESSMENT' : 'SESSION'));
  };

  const handleSessionIntroStart = () => {
    if (!activeSession) return;
    setView(shouldShowAssessment(activeSession.sessionNumber) ? 'ASSESSMENT' : 'SESSION');
  };

  const handleCheckInComplete = async (updatedSession: PatientSession) => {
    let sessionToSave = updatedSession;

    if (updatedSession.quickSession) {
      // Pre-fill from the most recent completed session so Stage 2 can be skipped
      const lastCompleted = sessions
        .filter(s => s.stage === 6 && s.selectedWorkCard)
        .sort((a, b) => b.sessionNumber - a.sessionNumber)[0];
      if (lastCompleted) {
        sessionToSave = {
          ...updatedSession,
          conflicts: lastCompleted.conflicts,
          frameworkMatches: lastCompleted.frameworkMatches,
          gestaltActivity: lastCompleted.gestaltActivity,
          stage3Type: lastCompleted.stage3Type,
          selectedWorkCard: lastCompleted.selectedWorkCard,
          stage: 3,
        };
      }
    }

    await db.saveSession(sessionToSave);
    setActiveSession(sessionToSave);
    if (!sessionToSave.quickSession && shouldShowAssessment(sessionToSave.sessionNumber)) {
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

  const handleComplete = async (action: 'dashboard' | 'record' | 'new-session' | 'diary') => {
    const allSessions = await db.getSessions();
    setSessions(allSessions);
    if (action === 'dashboard') {
      setView('DASHBOARD');
    } else if (action === 'record') {
      setRecordSessions(allSessions);
      setView('RECORD');
    } else if (action === 'diary') {
      setView('DIARY');
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

  const handleDeleteSession = async (sessionId: string) => {
    await db.deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession?.id === sessionId) setActiveSession(null);
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
        onDeleteSession={handleDeleteSession}
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

  if (view === 'SESSION_INTRO' && activePatient) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 gap-8 max-w-[480px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3 text-center"
        >
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', color: 'var(--color-deep)', lineHeight: 1.2 }}>
            Tu espacio está listo.
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: '1rem', lineHeight: 1.6 }}>
            Cuando estés preparado/a, empieza tu primera sesión.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full space-y-3"
        >
          <button
            type="button"
            onClick={handleSessionIntroStart}
            className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
            style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
          >
            Empezar ahora →
          </button>
          <button
            type="button"
            onClick={() => setView('DASHBOARD')}
            className="w-full py-3 rounded-2xl text-sm font-medium"
            style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Continuar después
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === 'CHECK_IN' && activePatient && activeSession) {
    const priorCheckInSessions = sessions.filter(
      s => s.stage >= 6 && s.sessionNumber < activeSession.sessionNumber
    );
    return (
      <CheckIn
        patient={activePatient}
        session={activeSession}
        priorSessions={priorCheckInSessions}
        lastDiaryEntry={lastDiaryEntry}
        onComplete={handleCheckInComplete}
        onViewSettings={handleViewSettings}
      />
    );
  }

  if (view === 'ASSESSMENT' && activeSession) {
    return (
      <ClinicalAssessment
        session={activeSession}
        instrument={getAssessmentInstrument(activeSession.sessionNumber)}
        onComplete={handleAssessmentComplete}
      />
    );
  }

  if (view === 'SESSION' && activePatient && activeSession) {
    const priorSessions = sessions.filter(
      s => s.stage === 6 && s.sessionNumber < activeSession.sessionNumber
    );
    return (
      <ErrorBoundary>
        <SessionView
          patient={activePatient}
          session={activeSession}
          priorSessions={priorSessions}
          lastDiaryEntry={lastDiaryEntry}
          onSessionUpdate={handleSessionUpdate}
          onComplete={handleComplete}
          onViewSettings={handleViewSettings}
        />
      </ErrorBoundary>
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
        onBack={() => setView(preSettingsView)}
        onSignOut={handleSignOut}
      />
    );
  }

  return null;
}
