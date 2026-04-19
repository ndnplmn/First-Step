'use client';

import { motion } from 'motion/react';
import { CRISIS_LINES } from '@/lib/crisis';

interface CrisisScreenProps {
  onDismiss: () => void;
}

export function CrisisScreen({ onDismiss }: CrisisScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--color-base)' }}
    >
      <div className="flex-1 flex flex-col max-w-[680px] mx-auto w-full px-6 py-12 overflow-y-auto">
        {/* Accent bar */}
        <div
          className="w-12 h-1 rounded-full mb-8"
          style={{ background: 'var(--color-terracotta)' }}
        />

        <h1
          className="text-3xl leading-snug mb-4"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
        >
          Estamos aquí contigo.
        </h1>

        <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-muted)' }}>
          Parece que estás pasando por un momento muy difícil. Tend es un espacio de apoyo,
          pero no puede reemplazar la ayuda profesional inmediata cuando más la necesitas.
        </p>

        <div
          className="rounded-2xl p-5 mb-8 space-y-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p
            className="text-xs font-medium tracking-wide uppercase"
            style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Líneas de crisis — disponibles ahora
          </p>
          <div className="space-y-3">
            {CRISIS_LINES.map(line => (
              <a
                key={line.country}
                href={`tel:${line.number.replace(/\s/g, '')}`}
                className="flex items-center justify-between py-3 px-4 rounded-xl transition-opacity hover:opacity-80 active:opacity-60"
                style={{
                  background: 'var(--color-base)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {line.country}
                </span>
                <span
                  className="text-lg font-semibold tracking-wide"
                  style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
                >
                  {line.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-muted)' }}>
          Si en este momento sientes que puedes estar a salvo y quieres continuar usando Tend,
          puedes volver. Estamos aquí cuando lo necesites.
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl font-semibold tracking-wide"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-deep)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          Estoy a salvo — volver a Tend
        </button>
      </div>
    </motion.div>
  );
}
