'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { PatientSession, Interpretation } from '@/lib/types';
import { generateInterpretation } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { Heart, ArrowCounterClockwise } from '@phosphor-icons/react';

interface StageInterpretationProps {
  session: PatientSession;
  onAdvance: (interpretation: Interpretation) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageInterpretation({ session, onAdvance, onUpdate }: StageInterpretationProps) {
  const [interpretation, setInterpretation] = useState<Interpretation | null>(session.interpretation);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [resonated, setResonated] = useState(false);

  useEffect(() => {
    if (!interpretation && !isGenerating) generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    try {
      const result = await generateInterpretation({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
      });
      setInterpretation(result);
      onUpdate({ interpretation: result });
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResonate = () => {
    if (!interpretation) return;
    const updated: Interpretation = { ...interpretation, resonatedAt: Date.now() };
    setInterpretation(updated);
    setResonated(true);
    onUpdate({ interpretation: updated });
  };

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 4 — Comprensión
        </p>
        <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
          Tu historia vista con claridad
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Basándome en todo lo que has compartido, aquí está lo que encuentro.
        </p>
      </div>

      {isGenerating && <AIThinking />}

      {isError && !isGenerating && (
        <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Hubo un problema al generar la interpretación.</p>
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

      {interpretation && !isGenerating && (
        <AICard
          sources={interpretation.groundingSources}
          actions={
            <>
              <button
                onClick={handleResonate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all"
                style={{
                  background: resonated ? 'var(--color-terracotta)' : 'var(--color-surface)',
                  color: resonated ? 'white' : 'var(--color-muted)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <Heart size={14} weight={resonated ? 'fill' : 'regular'} />
                {resonated ? 'Me resuena' : 'Esto me resuena'}
              </button>
              <button
                onClick={generate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)' }}
              >
                <ArrowCounterClockwise size={14} />
                Reformular
              </button>
            </>
          }
        >
          {interpretation.text.split('\n').filter(Boolean).map((para, i, arr) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="leading-relaxed"
              style={{ marginBottom: i < arr.length - 1 ? '1rem' : 0 }}
            >
              {para}
            </motion.p>
          ))}
        </AICard>
      )}

      <FloatingBar visible={!!interpretation && !isGenerating}>
        <button
          onClick={() => onAdvance(interpretation!)}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Continuar al cierre →
        </button>
      </FloatingBar>
    </div>
  );
}
