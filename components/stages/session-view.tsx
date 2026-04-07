'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Patient, PatientSession, Conflict, FrameworkMatch, GestaltActivity, Memory, Interpretation, UnmappedPhrase, Stage3Type } from '@/lib/types';
import { SessionHeader } from '@/components/ui/session-header';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { StageConflicts } from './stage-conflicts';
import { StageMemories } from './stage-memories';
import { StageBodywork } from '@/components/stages/stage-bodywork';
import { StageSocialContext } from '@/components/stages/stage-social-context';
import { StageGestaltActivity } from '@/components/stages/stage-gestalt-activity';
import { StageExposure } from '@/components/stages/stage-exposure';
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

  const handleStage2Advance = (
    conflicts: Conflict[],
    frameworkMatches: FrameworkMatch[],
    gestaltActivity: GestaltActivity | null,
    unmappedPhrases: string[],
    narrativeSummary: string,
    stage3Type: Stage3Type
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
    });
  };

  const handleStage3MemoriesAdvance = (memories: Memory[], newUnmapped: string[]) => {
    advanceStage({
      memories,
      unmappedPhrases: [
        ...session.unmappedPhrases,
        ...newUnmapped.map((text: string): UnmappedPhrase => ({
          text,
          sessionNumber: session.sessionNumber,
        })),
      ],
    });
  };

  const handleStage3BodyworkAdvance = (bodyworkNotes: string) => {
    void bodyworkNotes;
    advanceStage({ stage: 4 });
  };

  const handleStage3SocialAdvance = (socialHistory: string) => {
    void socialHistory;
    advanceStage({ stage: 4 });
  };

  const handleStage3GestaltAdvance = (gestaltLog: string) => {
    void gestaltLog;
    advanceStage({ stage: 4 });
  };

  const handleStage3ExposureAdvance = (exposureLog: string) => {
    void exposureLog;
    advanceStage({ stage: 4 });
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
            onAdvance={handleStage2Advance}
            onUpdate={updateSession}
          />
        )}

        {session.stage === 3 && (() => {
          const s3type = session.stage3Type ?? 'memories';
          const stage3CommonProps = {
            session,
            patient,
            onUpdate: updateSession,
          };
          if (s3type === 'memories') {
            return <StageMemories {...stage3CommonProps} onAdvance={handleStage3MemoriesAdvance} />;
          }
          if (s3type === 'bodywork') {
            return <StageBodywork {...stage3CommonProps} onAdvance={handleStage3BodyworkAdvance} />;
          }
          if (s3type === 'social_context') {
            return <StageSocialContext {...stage3CommonProps} onAdvance={handleStage3SocialAdvance} />;
          }
          if (s3type === 'gestalt_activity') {
            return <StageGestaltActivity {...stage3CommonProps} onAdvance={handleStage3GestaltAdvance} />;
          }
          if (s3type === 'exposure') {
            return <StageExposure {...stage3CommonProps} onAdvance={handleStage3ExposureAdvance} />;
          }
          return null;
        })()}

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
