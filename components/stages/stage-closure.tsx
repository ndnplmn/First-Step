'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { PatientSession } from '@/lib/types';
import { generateClosure } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { User, ShareNetwork, Sparkle, ArrowCounterClockwise } from '@phosphor-icons/react';

interface StageClosureProps {
  session: PatientSession;
  onComplete: () => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

const NEXT_STEPS = [
  { Icon: User, title: 'Reflexionar solo', description: 'Continúa con un ejercicio guiado de escritura reflexiva.' },
  { Icon: ShareNetwork, title: 'Hablar con un terapeuta', description: 'Comparte tu expediente con un profesional para profundizar.' },
  { Icon: Sparkle, title: 'Explorar otro conflicto', description: 'Inicia un nuevo proceso sobre otra área de tu vida.' },
];

export function StageClosure({ session, onComplete, onUpdate }: StageClosureProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [closure, setClosure] = useState(session.closure);

  useEffect(() => {
    if (!closure) generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    try {
      const result = await generateClosure({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
        interpretation: session.interpretation?.text || '',
      });
      setClosure(result);
      onUpdate({ closure: result });
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 5 — Cierre
        </p>
        <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
          Un nuevo comienzo
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Este es el cierre de este ciclo. No el final, sino el primer paso hacia adelante.
        </p>
      </div>

      {isGenerating && <AIThinking />}

      {isError && !isGenerating && (
        <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Hubo un problema al generar el cierre.</p>
          <button
            onClick={generate}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}
          >
            <ArrowCounterClockwise size={14} />
            Intentar de nuevo
          </button>
        </div>
      )}

      {closure && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <AICard sources={closure.groundingSources}>
            <p className="text-lg italic leading-relaxed" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
              {closure.text}
            </p>
          </AICard>
        </motion.div>
      )}

      {closure && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>¿Qué deseas hacer ahora?</p>
          {NEXT_STEPS.map(({ Icon, title, description }) => (
            <button
              key={title}
              onClick={onComplete}
              className="w-full p-4 rounded-2xl text-left transition-all"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl" style={{ background: 'var(--color-sage-light)' }}>
                  <Icon size={20} color="var(--color-sage)" />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-deep)' }}>{title}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{description}</p>
                </div>
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
