'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Patient, PatientSession, Conflict, FrameworkMatch, GestaltActivity, Interpretation, UnmappedPhrase, Stage3Type, ExplorationRecord, WorkCard } from '@/lib/types';
import { useLanguage } from '@/contexts/language-context';
import { SessionHeader } from '@/components/ui/session-header';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { StageConflicts } from './stage-conflicts';
import { StageExploration } from '@/components/stages/stage-exploration';
import { StageInterpretation } from './stage-interpretation';
import { StageClosure } from './stage-closure';

const STAGE_GRADIENTS: Record<number, string> = {
  2: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(44,39,30,0.06), transparent)',
  3: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(107,94,158,0.06), transparent)',
  4: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(61,107,71,0.06), transparent)',
  5: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(180,110,69,0.06), transparent)',
  6: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(61,107,71,0.06), transparent)',
};

interface SessionViewProps {
  patient: Patient;
  session: PatientSession;
  priorSessions?: PatientSession[];
  onSessionUpdate: (session: PatientSession) => void;
  onComplete: (action: 'dashboard' | 'record' | 'new-session' | 'diary') => void;
  onViewSettings?: () => void;
}

export function SessionView({ patient, session, priorSessions = [], onSessionUpdate, onComplete, onViewSettings }: SessionViewProps) {
  const { t } = useLanguage();
  const [pendingUpdates, setPendingUpdates] = useState<Partial<PatientSession> | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [targetStage, setTargetStage] = useState<number>(session.stage);

  const advanceStage = (updates: Partial<PatientSession>, toStage?: number) => {
    const nextStage = toStage ?? Math.min(session.stage + 1, 6);
    setPendingUpdates(updates);
    setTargetStage(nextStage);
    setShowTransition(true);
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    const updated: PatientSession = {
      ...session,
      ...(pendingUpdates ?? {}),
      stage: targetStage as 1 | 2 | 3 | 4 | 5 | 6,
      updatedAt: Date.now(),
    };
    setPendingUpdates(null);
    onSessionUpdate(updated);
  };

  const updateSession = (updates: Partial<PatientSession>) => {
    const updated: PatientSession = { ...session, ...updates, updatedAt: Date.now() };
    onSessionUpdate(updated);
  };

  const handleStage2Advance = (
    conflicts: Conflict[],
    frameworkMatches: FrameworkMatch[],
    gestaltActivity: GestaltActivity | null,
    unmappedPhrases: string[],
    narrativeSummary: string,
    stage3Type: Stage3Type,
    selectedWorkCard: WorkCard,
  ) => {
    advanceStage({
      conflicts,
      frameworkMatches,
      gestaltActivity: gestaltActivity ?? undefined,
      unmappedPhrases: unmappedPhrases.map((text: string): UnmappedPhrase => ({
        text,
        sessionNumber: session.sessionNumber,
      })),
      narrativeSummary,
      stage3Type,
      selectedWorkCard,
    });
  };

  const handleStage3Advance = (record: ExplorationRecord) => {
    advanceStage({ explorationRecord: record, interpretation: null }, 4);
  };


  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background: STAGE_GRADIENTS[session.stage] ?? 'none',
        transition: 'background 0.8s ease',
      }}
    >
      <SessionHeader patient={patient} session={session} onSettings={onViewSettings} />

      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-8 pb-48">
        {session.stage === 2 && (
          <StageConflicts
            session={session}
            patient={patient}
            priorSessions={priorSessions}
            onAdvance={handleStage2Advance}
            onUpdate={updateSession}
          />
        )}

        {session.stage === 3 && session.selectedWorkCard && (
          <div
            style={{
              marginBottom: '0.5rem',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-inner)',
              background: 'rgba(107,94,158,0.07)',
              border: '1px solid rgba(107,94,158,0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              {t('session.exploring')}
            </p>
            <p style={{ color: 'var(--color-deep)', fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>
              {session.selectedWorkCard.title}
            </p>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
              {session.selectedWorkCard.subtitle}
            </p>
          </div>
        )}

        {session.stage === 3 && (
          <StageExploration
            session={session}
            patient={patient}
            priorSessions={priorSessions}
            onAdvance={handleStage3Advance}
            onUpdate={updateSession}
          />
        )}

        {session.stage === 4 && (
          <StageInterpretation
            session={session}
            patient={patient}
            priorSessions={priorSessions}
            onAdvance={(interpretation: Interpretation) => advanceStage({ interpretation }, 6)}
            onUpdate={updateSession}
          />
        )}

        {session.stage === 6 && (
          <StageClosure
            session={session}
            patient={patient}
            priorSessions={priorSessions}
            onComplete={onComplete}
            onUpdate={updateSession}
          />
        )}
      </main>

      <AnimatePresence>
        {showTransition && (
          <ChapterTransition
            toStage={targetStage}
            onComplete={handleTransitionComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
