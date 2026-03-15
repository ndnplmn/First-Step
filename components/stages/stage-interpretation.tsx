'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { PatientSession, Interpretation } from '@/lib/types';
import { generateInterpretation } from '@/actions/ai';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { Heart, ArrowCounterClockwise, ArrowSquareOut } from '@phosphor-icons/react';

const THINKING_PHRASES = [
  'Analizando tu historia...',
  'Conectando perspectivas...',
  'Formulando comprensión...',
];

interface StageInterpretationProps {
  session: PatientSession;
  onAdvance: (interpretation: Interpretation) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageInterpretation({ session, onAdvance, onUpdate }: StageInterpretationProps) {
  const [fullInterpretation, setFullInterpretation] = useState<Interpretation | null>(
    session.interpretation ?? null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [resonated, setResonated] = useState(false);
  const [showRing, setShowRing] = useState(false);
  const { text, isStreaming, isDone, startStream } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.interpretation) {
      startStream(session.interpretation.text);
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullInterpretation(null);
    try {
      const result = await generateInterpretation({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
      });
      setFullInterpretation(result);
      onUpdate({ interpretation: result });
      startStream(result.text);
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResonate = () => {
    if (!fullInterpretation) return;
    setResonated(true);
    setShowRing(true);
    setTimeout(() => setShowRing(false), 600);
    const updated: Interpretation = { ...fullInterpretation, resonatedAt: Date.now() };
    setFullInterpretation(updated);
    onUpdate({ interpretation: updated });
  };

  const displayText = shouldReduce ? (fullInterpretation?.text ?? '') : text;
  const showContent = shouldReduce ? !!fullInterpretation : (isDone || isStreaming);

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 4 — Comprensión
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          Tu historia vista con claridad
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Basándome en todo lo que has compartido, aquí está lo que encuentro.
        </p>
      </div>

      {isGenerating && <AIThinking phrases={THINKING_PHRASES} />}

      {isError && !isGenerating && (
        <div
          className="rounded-2xl p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Hubo un problema al generar la interpretación.
          </p>
          <button
            type="button"
            onClick={generate}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}
          >
            <ArrowCounterClockwise size={14} />
            Intentar de nuevo
          </button>
        </div>
      )}

      {showContent && (
        <AICard
          sources={[]}
          actions={
            isDone ? (
              <>
                <div className="relative">
                  <motion.button
                    type="button"
                    onClick={handleResonate}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all"
                    style={{
                      background: resonated ? 'var(--color-terracotta)' : 'var(--color-surface)',
                      color: resonated ? 'white' : 'var(--color-muted)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <motion.span
                      animate={resonated && !shouldReduce ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Heart size={14} weight={resonated ? 'fill' : 'regular'} />
                    </motion.span>
                    {resonated ? 'Me resuena' : 'Esto me resuena'}
                  </motion.button>
                  <AnimatePresence>
                    {showRing && !shouldReduce && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{}}
                        transition={{ duration: 0.5 }}
                        style={{ border: '2px solid var(--color-terracotta)' }}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  type="button"
                  onClick={generate}
                  whileTap={shouldReduce ? {} : { scale: 0.98 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-muted)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <ArrowCounterClockwise size={14} />
                  Reformular
                </motion.button>
              </>
            ) : null
          }
        >
          <p className="leading-relaxed whitespace-pre-wrap">
            {displayText}
            {isStreaming && !shouldReduce && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ color: 'var(--color-sage)', marginLeft: 1 }}
              >
                |
              </motion.span>
            )}
          </p>

          {isDone && fullInterpretation?.groundingSources && fullInterpretation.groundingSources.length > 0 && (
            <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              {fullInterpretation.groundingSources.map((s, i) => (
                <motion.a
                  key={i}
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--color-sage-light)', color: 'var(--color-sage)' }}
                >
                  <ArrowSquareOut size={10} />
                  {s.title}
                </motion.a>
              ))}
            </div>
          )}
        </AICard>
      )}

      <FloatingBar visible={isDone || (!!shouldReduce && !!fullInterpretation)}>
        <motion.button
          type="button"
          onClick={() => onAdvance(fullInterpretation!)}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Continuar al cierre →
        </motion.button>
      </FloatingBar>
    </div>
  );
}
