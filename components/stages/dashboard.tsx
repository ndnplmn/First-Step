'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Patient } from '@/lib/types';
import { storage } from '@/lib/storage';
import { ArrowLeft, Plus } from '@phosphor-icons/react';
import { ChapterProgress } from '@/components/ui/chapter-progress';

const STAGE_NAMES: Record<number, string> = {
  1: 'Apertura',
  2: 'Conflictos',
  3: 'Recuerdos',
  4: 'Comprensión',
  5: 'Cierre',
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
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  onNew: () => void;
  onBack: () => void;
}

export function Dashboard({ patients, onSelect, onNew, onBack }: DashboardProps) {
  const shouldReduce = useReducedMotion();

  const sessionMap = useMemo(() => {
    const map: Record<string, { stage: 1 | 2 | 3 | 4 | 5; updatedAt: number }> = {};
    for (const patient of patients) {
      const session = storage.getActiveSession(patient.id);
      if (session) {
        map[patient.id] = { stage: session.stage, updatedAt: session.updatedAt };
      }
    }
    return map;
  }, [patients]);

  const countLabel =
    patients.length === 0
      ? 'Aún no hay expedientes'
      : patients.length === 1
      ? '1 en proceso'
      : `${patients.length} en proceso`;

  return (
    <div className="min-h-screen">
      {/* Sticky glass header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--color-glass)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-[680px] mx-auto flex items-center justify-between px-6 py-3">
          <motion.button
            type="button"
            onClick={onBack}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="flex items-center gap-2"
            style={{ color: 'var(--color-muted)' }}
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Volver</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onNew}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--color-sage)' }}
          >
            <Plus size={16} />
            Nuevo paciente
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[680px] mx-auto px-6 pt-10 pb-16">
        {/* Title */}
        <div className="mb-8">
          <h1
            className="leading-tight breathe"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 7vw, 64px)',
              color: 'var(--color-deep)',
            }}
          >
            Expedientes
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-muted)',
            }}
          >
            {countLabel}
          </p>
        </div>

        {/* Patient list */}
        <div className="space-y-3">
          {patients.map((patient, i) => {
            const info = sessionMap[patient.id];
            const stage = (info?.stage ?? 5) as 1 | 2 | 3 | 4 | 5;
            const stageName = STAGE_NAMES[stage] ?? 'Completado';
            const relativeTime = info ? formatRelativeTime(info.updatedAt) : '';

            return (
              <motion.button
                key={patient.id}
                type="button"
                onClick={() => onSelect(patient)}
                initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.06,
                  type: 'spring',
                  stiffness: 280,
                  damping: 22,
                }}
                whileHover={shouldReduce ? {} : { y: -2 }}
                whileTap={shouldReduce ? {} : { scale: 0.99 }}
                className="w-full p-5 rounded-2xl text-left"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '18px',
                        color: 'var(--color-deep)',
                      }}
                    >
                      {patient.name}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {patient.age} años · {patient.gender}
                    </p>
                    <p
                      className="mt-2"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-muted)',
                      }}
                    >
                      {stageName}{relativeTime ? ` · ${relativeTime}` : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0 pt-1">
                    <ChapterProgress currentStage={stage} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Empty state */}
        {patients.length === 0 && (
          <div className="flex flex-col items-center pt-20 gap-6">
            <svg width="320" height="80" viewBox="0 0 320 80" fill="none">
              <motion.path
                d="M 0 40 Q 80 0 160 40 Q 240 80 320 40"
                stroke="var(--color-sage)"
                strokeWidth="1.5"
                fill="none"
                initial={shouldReduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
            </svg>
            <div className="text-center space-y-3">
              <p style={{ color: 'var(--color-muted)' }}>Aún no hay expedientes</p>
              <motion.button
                type="button"
                onClick={onNew}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="text-sm font-medium"
                style={{ color: 'var(--color-sage)' }}
              >
                Crear el primero →
              </motion.button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
