'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Patient, PatientSession, Conflict, FrameworkMatch, GestaltActivity, Memory, Interpretation, UnmappedPhrase } from '@/lib/types';
import { SessionHeader } from '@/components/ui/session-header';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { StageConflicts } from './stage-conflicts';
import { StageMemories } from './stage-memories';
import { StageInterpretation } from './stage-interpretation';
import { StageClosure } from './stage-closure';

const STAGE_GRADIENTS: Record<number, string> = {
  2: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(44,39,30,0.06), transparent)',
  3: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(107,94,158,0.06), transparent)',
  4: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(61,107,71,0.06), transparent)',
  5: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(180,110,69,0.06), transparent)',
};

interface SessionViewProps {
  patient: Patient;
  session: PatientSession;
  onSessionUpdate: (session: PatientSession) => void;
  onComplete: (action: 'dashboard' | 'record' | 'new-session') => void;
}

export function SessionView({ patient, session, onSessionUpdate, onComplete }: SessionViewProps) {
  const [pendingUpdates, setPendingUpdates] = useState<Partial<PatientSession> | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [targetStage, setTargetStage] = useState<number>(session.stage);

  const advanceStage = (updates: Partial<PatientSession>) => {
    const nextStage = Math.min(session.stage + 1, 5);
    setPendingUpdates(updates);
    setTargetStage(nextStage);
    setShowTransition(true);
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    const updated: PatientSession = {
      ...session,
      ...(pendingUpdates ?? {}),
      stage: targetStage as 1 | 2 | 3 | 4 | 5,
      updatedAt: Date.now(),
    };
    setPendingUpdates(null);
    onSessionUpdate(updated);
  };

  const updateSession = (updates: Partial<PatientSession>) => {
    const updated: PatientSession = { ...session, ...updates, updatedAt: Date.now() };
    onSessionUpdate(updated);
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background: STAGE_GRADIENTS[session.stage] ?? 'none',
        transition: 'background 0.8s ease',
      }}
    >
      <SessionHeader patient={patient} session={session} />

      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-8 pb-48">
        {session.stage === 2 && (
          <StageConflicts
            session={session}
            patient={patient}
            onAdvance={(conflicts: Conflict[], frameworkMatches: FrameworkMatch[], gestaltActivity: GestaltActivity, unmapped: string[]) =>
              advanceStage({
                conflicts,
                frameworkMatches,
                gestaltActivity,
                unmappedPhrases: unmapped.map((text: string): UnmappedPhrase => ({
                  text,
                  sessionNumber: session.sessionNumber,
                })),
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 3 && (
          <StageMemories
            session={session}
            patient={patient}
            onAdvance={(memories: Memory[], newUnmapped: string[]) =>
              advanceStage({
                memories,
                unmappedPhrases: [
                  ...session.unmappedPhrases,
                  ...newUnmapped.map((text: string): UnmappedPhrase => ({
                    text,
                    sessionNumber: session.sessionNumber,
                  })),
                ],
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 4 && (
          <StageInterpretation
            session={session}
            patient={patient}
            onAdvance={(interpretation: Interpretation) => advanceStage({ interpretation })}
            onUpdate={updateSession}
          />
        )}

        {session.stage === 5 && (
          <StageClosure
            session={session}
            patient={patient}
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
