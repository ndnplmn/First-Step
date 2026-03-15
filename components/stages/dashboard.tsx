'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { Patient } from '@/lib/types';
import { storage } from '@/lib/storage';
import { ArrowLeft, Plus, Clock } from '@phosphor-icons/react';

const STAGE_NAMES = ['', 'Apertura', 'Conflictos', 'Recuerdos', 'Comprensión', 'Cierre'];

interface DashboardProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  onNew: () => void;
  onBack: () => void;
}

export function Dashboard({ patients, onSelect, onNew, onBack }: DashboardProps) {
  const progressMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const patient of patients) {
      const session = storage.getActiveSession(patient.id);
      map[patient.id] = session ? STAGE_NAMES[session.stage] : 'Completado';
    }
    return map;
  }, [patients]);

  return (
    <div className="min-h-screen max-w-[680px] mx-auto px-6 pt-16 pb-12">
      <button onClick={onBack} className="flex items-center gap-2 mb-12" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} />
        <span className="text-sm">Volver</span>
      </button>

      <div className="flex items-end justify-between mb-8">
        <h1 className="text-[48px] leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
          Expedientes
        </h1>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      <div className="space-y-3">
        {patients.map((patient, i) => (
          <motion.button
            key={patient.id}
            onClick={() => onSelect(patient)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="w-full p-5 rounded-2xl text-left transition-all"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--color-deep)' }}>{patient.name}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {patient.age} años · {patient.gender}
                </p>
              </div>
              <div className="text-right">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage)' }}
                >
                  {progressMap[patient.id]}
                </span>
                <p className="text-xs mt-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                  {patient.id}
                </p>
              </div>
            </div>
          </motion.button>
        ))}

        {patients.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
            <Clock size={32} className="mx-auto mb-3 opacity-40" />
            <p>No hay expedientes aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
