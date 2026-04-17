import type { Patient, PatientSession } from '@/lib/types';
import { ChapterProgress } from './chapter-progress';

interface SessionHeaderProps {
  patient: Patient;
  session: PatientSession;
}

export function SessionHeader({ patient, session }: SessionHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'var(--color-glass-heavy)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3.5">
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--color-deep)' }}
        >
          {patient.name}
        </p>
        <ChapterProgress currentStage={session.stage} />
      </div>
    </header>
  );
}
