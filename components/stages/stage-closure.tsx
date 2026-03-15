'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { PatientSession, Closure } from '@/lib/types';
import { generateClosure } from '@/actions/ai';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowCounterClockwise, ArrowSquareOut, Sparkle } from '@phosphor-icons/react';

const THINKING_PHRASES = [
  'Preparando tu cierre...',
  'Destilando lo esencial...',
  'Abriendo un nuevo camino...',
];

const NEXT_STEPS = [
  { icon: '🧘', label: 'Practica un momento de quietud hoy' },
  { icon: '📓', label: 'Escribe lo que descubriste en sesión' },
  { icon: '💬', label: 'Comparte una reflexión con alguien de confianza' },
];

interface StageClosureProps {
  session: PatientSession;
  onComplete: () => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageClosure({ session, onComplete, onUpdate }: StageClosureProps) {
  const [fullClosure, setFullClosure] = useState<Closure | null>(session.closure ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const { text, isStreaming, isDone, startStream } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.closure) {
      startStream(session.closure.text);
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullClosure(null);
    try {
      const result = await generateClosure({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
        interpretation: session.interpretation!.text,
      });
      setFullClosure(result);
      onUpdate({ closure: result });
      startStream(result.text);
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const displayText = shouldReduce ? (fullClosure?.text ?? '') : text;
  const showContent = shouldReduce ? !!fullClosure : (isDone || isStreaming);

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 5 — Cierre
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          Un nuevo comienzo
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Antes de cerrar, quiero dejarte con algo que llevar contigo.
        </p>
      </div>

      {isGenerating && <AIThinking phrases={THINKING_PHRASES} />}

      {isError && !isGenerating && (
        <div
          className="rounded-2xl p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Hubo un problema al generar el cierre.
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
        <AICard sources={[]} actions={null}>
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

          {isDone && fullClosure?.groundingSources && fullClosure.groundingSources.length > 0 && (
            <div
              className="mt-4 pt-4 flex flex-wrap gap-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              {fullClosure.groundingSources.map((s, i) => (
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

      <AnimatePresence>
        {isDone && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-3"
          >
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
              <Sparkle size={14} weight="fill" style={{ color: 'var(--color-terracotta)' }} />
              Próximos pasos sugeridos
            </p>
            {NEXT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
              >
                <span className="text-xl">{step.icon}</span>
                <p className="text-sm leading-snug" style={{ color: 'var(--color-deep)' }}>
                  {step.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingBar visible={isDone || (!!shouldReduce && !!fullClosure)}>
        <motion.button
          type="button"
          onClick={onComplete}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Finalizar sesión
        </motion.button>
      </FloatingBar>
    </div>
  );
}
