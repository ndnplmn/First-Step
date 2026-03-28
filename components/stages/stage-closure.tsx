'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Closure, Strategy } from '@/lib/types';
import { generateClosure, generateReflectionQuestions, generateStrategies } from '@/actions/ai';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowCounterClockwise, Users, ArrowsClockwise, House } from '@phosphor-icons/react';

const THINKING_PHRASES = [
  'Preparando tu cierre...',
  'Destilando lo esencial...',
  'Abriendo un nuevo camino...',
];

type ClosureAction = 'dashboard' | 'record' | 'new-session';

interface StageClosureProps {
  session: PatientSession;
  patient: Patient;
  onComplete: (action: ClosureAction) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageClosure({ session, patient, onComplete, onUpdate }: StageClosureProps) {
  const [fullClosure, setFullClosure] = useState<Closure | null>(session.closure ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>(
    session.reflectionQuestions ?? []
  );
  const [strategies, setStrategies] = useState<Strategy[]>(
    session.closure?.strategies ?? []
  );
  const [showActions, setShowActions] = useState(false);
  const { text, isStreaming, isDone, startStream } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.closure) {
      startStream(session.closure.text);
      if (session.reflectionQuestions?.length) {
        setReflectionQuestions(session.reflectionQuestions);
      }
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Las acciones solo aparecen cuando el streaming ha terminado
  useEffect(() => {
    if (isDone && reflectionQuestions.length > 0 && strategies.length > 0) {
      const timer = setTimeout(() => setShowActions(true), shouldReduce ? 0 : 2000);
      return () => clearTimeout(timer);
    }
  }, [isDone, reflectionQuestions.length, strategies.length, shouldReduce]);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullClosure(null);
    setReflectionQuestions([]);
    setStrategies([]);
    setShowActions(false);
    try {
      const result = await generateClosure({
        conflicts: session.conflicts,
        theoryMatch: session.theoryMatch!,
        memories: session.memories,
        interpretation: session.interpretation!.text,
        patient,
      });
      setFullClosure(result);
      onUpdate({ closure: result });
      startStream(result.text);

      const [questions, strats] = await Promise.all([
        generateReflectionQuestions({
          conflicts: session.conflicts,
          theoryMatch: session.theoryMatch!,
          closure: result.text,
        }),
        generateStrategies({
          conflicts: session.conflicts,
          theoryMatch: session.theoryMatch!,
          interpretation: session.interpretation!.text,
          patient,
        }),
      ]);
      setReflectionQuestions(questions);
      setStrategies(strats);
      const closureWithStrategies = { ...result, strategies: strats };
      setFullClosure(closureWithStrategies);
      onUpdate({ closure: closureWithStrategies, reflectionQuestions: questions });
    } catch (e) {
      console.error(e);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const displayText = shouldReduce ? (fullClosure?.text ?? '') : text;
  const showContent = shouldReduce ? !!fullClosure : (isDone || isStreaming);
  const showReady = isDone || (!!shouldReduce && !!fullClosure);

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

      {/* Cierre simbólico */}
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
        </AICard>
      )}

      {/* Preguntas de reflexión — con pausa después del cierre */}
      <AnimatePresence>
        {showReady && reflectionQuestions.length > 0 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 0.8 }}
            className="rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              Antes de irte, tres preguntas para el camino
            </p>
            <div className="space-y-3">
              {reflectionQuestions.map((q, i) => (
                <motion.p
                  key={i}
                  initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (shouldReduce ? 0 : 0.9) + i * 0.12, duration: 0.4 }}
                  className="text-sm leading-relaxed pl-3"
                  style={{
                    color: 'var(--color-deep)',
                    borderLeft: '2px solid var(--color-sage)',
                  }}
                >
                  {q}
                </motion.p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estrategias prácticas */}
      <AnimatePresence>
        {showReady && strategies.length > 0 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 1.2 }}
            className="rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              Estrategias para tu día a día
            </p>
            <div className="space-y-4">
              {strategies.map((s, i) => (
                <motion.div
                  key={i}
                  initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (shouldReduce ? 0 : 1.3) + i * 0.15, duration: 0.4 }}
                  className="pl-3"
                  style={{ borderLeft: '2px solid var(--color-terracotta)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                    {s.title}
                  </p>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    {s.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarjetas de acción — aparecen después de las estrategias */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldReduce ? 0 : 0.3 }}
            className="space-y-3"
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              ¿Qué quieres hacer ahora?
            </p>

            {/* Tarjeta: Ver mi resumen */}
            <motion.button
              type="button"
              onClick={() => onComplete('record')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-violet-light)' }}
              >
                <Users size={18} style={{ color: 'var(--color-violet)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                  Ver mi resumen
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Revisa todo lo que exploraste en esta sesión
                </p>
              </div>
            </motion.button>

            {/* Tarjeta: Nuevo proceso */}
            <motion.button
              type="button"
              onClick={() => onComplete('new-session')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-sage-light)' }}
              >
                <ArrowsClockwise size={18} style={{ color: 'var(--color-sage)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
                  Iniciar nuevo proceso
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Explora otro conflicto con una nueva sesión
                </p>
              </div>
            </motion.button>

            {/* Volver al inicio — al final, discreto */}
            <motion.button
              type="button"
              onClick={() => onComplete('dashboard')}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ color: 'var(--color-muted)' }}
            >
              <House size={15} />
              Volver al inicio
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
