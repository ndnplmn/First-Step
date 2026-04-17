'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Eye, BookOpen, Path, Plus, SignOut } from '@phosphor-icons/react';
import { ChapterProgress } from '@/components/ui/chapter-progress';
import { TendLogo } from '@/components/ui/logo';
import type { Patient, PatientSession } from '@/lib/types';

const STAGE_NAMES: Record<number, string> = {
  1: 'Apertura',
  2: 'Conflictos',
  3: 'Exploración',
  4: 'Comprensión',
  5: 'Integración',
  6: 'Cierre',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff <= 0) return 'hace un momento';
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return 'hace un momento';
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

interface DashboardProps {
  patient: Patient;
  sessions: PatientSession[];
  activeSession: PatientSession | null;
  onStartSession: () => void;
  onViewRecord: () => void;
  onViewDiary: () => void;
  onViewProgress: () => void;
  onNew: () => void;
  onSignOut: () => void;
  showMigrationPrompt?: boolean;
  onMigrate?: () => void;
  onDismissMigration?: () => void;
}

export function Dashboard({
  patient,
  sessions,
  activeSession,
  onStartSession,
  onViewRecord,
  onViewDiary,
  onViewProgress,
  onNew,
  onSignOut,
  showMigrationPrompt,
  onMigrate,
  onDismissMigration,
}: DashboardProps) {
  const shouldReduce = useReducedMotion();
  const completedSessions = sessions.filter(s => s.stage >= 5);
  const sessionCount = sessions.length;

  return (
    <div className="min-h-dvh">
      {/* Sticky glass header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--color-glass-heavy)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
          <TendLogo size={26} />

          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              onClick={onNew}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
            >
              <Plus size={14} />
              Nueva sesión
            </motion.button>
            <motion.button
              type="button"
              onClick={onSignOut}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              title="Cerrar sesión"
              style={{ color: 'var(--color-muted)', padding: '0.5rem' }}
            >
              <SignOut size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[680px] mx-auto px-6 pt-10 pb-16">
        {/* Migration banner */}
        {showMigrationPrompt && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-[var(--radius-card)] border"
            style={{
              background: 'rgba(107,127,110,0.07)',
              borderColor: 'var(--color-sage)',
            }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--color-deep)' }}>
              Encontramos datos de sesiones anteriores en este dispositivo. ¿Quieres conservarlos?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onMigrate}
                className="text-sm font-medium px-4 py-2 rounded-lg text-white"
                style={{ background: 'var(--color-sage)' }}
              >
                Migrar mis datos
              </button>
              <button
                onClick={onDismissMigration}
                className="text-sm"
                style={{ color: 'var(--color-muted)' }}
              >
                Ignorar
              </button>
            </div>
          </motion.div>
        )}

        {/* Greeting */}
        <div className="mb-8">
          <h1
            className="leading-tight breathe"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 7vw, 56px)',
              color: 'var(--color-deep)',
            }}
          >
            Hola, {patient.name.split(' ')[0]}
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-muted)',
            }}
          >
            {sessionCount === 0
              ? 'Aún no has iniciado ninguna sesión'
              : `${completedSessions.length} ${completedSessions.length === 1 ? 'sesión completada' : 'sesiones completadas'}`}
          </p>
        </div>

        {/* Active session card */}
        {activeSession && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
              En curso
            </p>
            <motion.div
              role="button"
              tabIndex={0}
              onClick={onStartSession}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartSession(); } }}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.99 }}
              className="w-full p-5 rounded-[var(--radius-card)] text-left cursor-pointer"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                borderLeft: '3px solid var(--color-sage)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-deep)', fontSize: '1rem' }}>
                    Sesión {activeSession.sessionNumber}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {STAGE_NAMES[activeSession.stage] ?? 'En progreso'} · {formatRelativeTime(activeSession.updatedAt)}
                  </p>
                </div>
                <ChapterProgress currentStage={activeSession.stage as 1 | 2 | 3 | 4 | 5} />
              </div>
              <p className="text-sm mt-3 font-medium" style={{ color: 'var(--color-sage)' }}>
                Continuar →
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* No active session — start new */}
        {!activeSession && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <motion.button
              type="button"
              onClick={onStartSession}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.99 }}
              className="w-full p-5 rounded-[var(--radius-card)] text-left"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                border: '1.5px dashed var(--color-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    background: 'rgba(107,127,110,0.1)',
                    color: 'var(--color-sage)',
                  }}
                >
                  <Plus size={16} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-deep)' }}>
                    Iniciar {sessionCount > 0 ? 'nueva sesión' : 'primera sesión'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                    {sessionCount > 0 ? `Sesión ${sessionCount + 1}` : 'Comenzar tu proceso'}
                  </p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[
            { icon: <Eye size={18} />, label: 'Mi resumen', onClick: onViewRecord },
            { icon: <BookOpen size={18} />, label: 'Mi diario', onClick: onViewDiary },
            { icon: <Path size={18} />, label: 'Tu camino', onClick: onViewProgress },
          ].map(({ icon, label, onClick }) => (
            <motion.button
              key={label}
              type="button"
              onClick={onClick}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-card)]"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
                color: 'var(--color-muted)',
              }}
            >
              {icon}
              <span className="text-xs font-medium" style={{ color: 'var(--color-deep)' }}>{label}</span>
            </motion.button>
          ))}
        </div>

        {/* Session history */}
        {completedSessions.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
              Historial
            </p>
            <div className="space-y-2">
              {completedSessions.slice(0, 5).map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-deep)' }}>
                    Sesión {session.sessionNumber}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    {formatRelativeTime(session.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
