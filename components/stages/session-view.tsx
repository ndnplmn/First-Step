'use client';

import type { Patient, PatientSession, Conflict, TheoryMatch, Memory, Interpretation, UnmappedPhrase } from '@/lib/types';
import { SessionHeader } from '@/components/ui/session-header';
import { StageConflicts } from './stage-conflicts';
import { StageMemories } from './stage-memories';
import { StageInterpretation } from './stage-interpretation';
import { StageClosure } from './stage-closure';

interface SessionViewProps {
  patient: Patient;
  session: PatientSession;
  onSessionUpdate: (session: PatientSession) => void;
  onComplete: () => void;
}

export function SessionView({ patient, session, onSessionUpdate, onComplete }: SessionViewProps) {
  const advanceStage = (updates: Partial<PatientSession>) => {
    const updated: PatientSession = {
      ...session,
      ...updates,
      stage: (Math.min(session.stage + 1, 5)) as 1 | 2 | 3 | 4 | 5,
      updatedAt: Date.now(),
    };
    onSessionUpdate(updated);
  };

  const updateSession = (updates: Partial<PatientSession>) => {
    const updated: PatientSession = { ...session, ...updates, updatedAt: Date.now() };
    onSessionUpdate(updated);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SessionHeader patient={patient} session={session} />

      <main className="flex-1 max-w-[680px] mx-auto w-full px-6 py-8 pb-48">
        {session.stage === 2 && (
          <StageConflicts
            session={session}
            onAdvance={(conflicts: Conflict[], theoryMatch: TheoryMatch, unmapped: string[]) =>
              advanceStage({
                conflicts,
                theoryMatch,
                unmappedPhrases: unmapped.map((text: string): UnmappedPhrase => ({ text, sessionNumber: session.sessionNumber })),
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 3 && (
          <StageMemories
            session={session}
            onAdvance={(memories: Memory[], newUnmapped: string[]) =>
              advanceStage({
                memories,
                unmappedPhrases: [
                  ...session.unmappedPhrases,
                  ...newUnmapped.map((text: string): UnmappedPhrase => ({ text, sessionNumber: session.sessionNumber })),
                ],
              })
            }
            onUpdate={updateSession}
          />
        )}

        {session.stage === 4 && (
          <StageInterpretation
            session={session}
            onAdvance={(interpretation: Interpretation) => advanceStage({ interpretation })}
            onUpdate={updateSession}
          />
        )}

        {session.stage === 5 && (
          <StageClosure
            session={session}
            onComplete={onComplete}
            onUpdate={updateSession}
          />
        )}
      </main>
    </div>
  );
}
