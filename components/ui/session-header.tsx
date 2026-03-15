import type { Patient, PatientSession } from '@/lib/types';
import { ChapterProgress } from './chapter-progress';

interface SessionHeaderProps {
  patient: Patient;
  session: PatientSession;
}

export function SessionHeader({ patient, session }: SessionHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)]" style={{ background: 'var(--color-glass)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
        <div>
          <p className="text-xs text-[var(--color-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {patient.id}
          </p>
          <p className="text-sm font-medium text-[var(--color-deep)]">
            {patient.name}
          </p>
        </div>
        <ChapterProgress currentStage={session.stage} />
      </div>
    </header>
  );
}
