'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Closure, Strategy } from '@/lib/types';
import { generateClosure, generateStrategies } from '@/actions/ai';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowCounterClockwise, Users, ArrowsClockwise, House } from '@phosphor-icons/react';
import { useLanguage } from '@/contexts/language-context';

type ClosureAction = 'dashboard' | 'record' | 'new-session';

interface StageClosureProps {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  onComplete: (action: ClosureAction) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageClosure({ session, patient, priorSessions = [], onComplete, onUpdate }: StageClosureProps) {
  const { t } = useLanguage();

  const THINKING_PHRASES = [
    t('stage6.thinking.1'),
    t('stage6.thinking.2'),
    t('stage6.thinking.3'),
  ];

  const WELLBEING_OPTIONS = [
    { value: 1, label: t('stage6.wellbeing.1') },
    { value: 2, label: t('stage6.wellbeing.2') },
    { value: 3, label: t('stage6.wellbeing.3') },
    { value: 4, label: t('stage6.wellbeing.4') },
    { value: 5, label: t('stage6.wellbeing.5') },
  ];

  const [fullClosure, setFullClosure] = useState<Closure | null>(session.closure ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>(
    session.closure?.strategies ?? []
  );
  const [showActions, setShowActions] = useState(false);
  const [wellbeingAfter, setWellbeingAfter] = useState<number | null>(
    session.wellbeingAfter ?? null
  );
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

  // Las acciones solo aparecen cuando el wellbeing check-out está completo
  useEffect(() => {
    if (isDone && strategies.length > 0 && wellbeingAfter !== null) {
      const timer = setTimeout(() => setShowActions(true), shouldReduce ? 0 : 800);
      return () => clearTimeout(timer);
    }
  }, [isDone, strategies.length, wellbeingAfter, shouldReduce]);

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullClosure(null);
    setStrategies([]);
    setShowActions(false);
    try {
      const result = await generateClosure({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        memories: session.memories,
        interpretation: session.interpretation!.text,
        gestaltActivity: session.gestaltActivity!,
        patient,
        deepWorkSynthesis: session.deepWork?.synthesis,
        priorSessions,
      });
      setFullClosure(result);
      onUpdate({ closure: result });
      startStream(result.text);

      const strats = await generateStrategies({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        interpretation: session.interpretation!.text,
        gestaltActivity: session.gestaltActivity!,
        patient,
      });
      setStrategies(strats);
      const closureWithStrategies = { ...result, strategies: strats };
      setFullClosure(closureWithStrategies);
      onUpdate({ closure: closureWithStrategies });
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
          {t('stage6.label')}
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          {t('stage6.title')}
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('stage6.subtitle')}
        </p>
      </div>

      {isGenerating && <AIThinking phrases={THINKING_PHRASES} />}

      {isError && !isGenerating && (
        <div
          className="rounded-[var(--radius-card)] p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('stage6.error')}
          </p>
          <button
            type="button"
            onClick={generate}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}
          >
            <ArrowCounterClockwise size={14} />
            {t('stage6.retry')}
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

      {/* Actividad Gestalt experiencial */}
      <AnimatePresence>
        {showReady && session.gestaltActivity && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 1.0 }}
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-violet)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)' }}
            >
              {t('stage6.gestalt.label')}
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
              {session.gestaltActivity.title}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {session.gestaltActivity.description}
            </p>
            <div
              className="rounded-[var(--radius-inner)] p-4"
              style={{ background: 'var(--color-violet-light)' }}
            >
              <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-deep)' }}>
                {session.gestaltActivity.prompt}
              </p>
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
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              {t('stage6.strategies.label')}
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

      {/* Wellbeing check-out */}
      <AnimatePresence>
        {showReady && strategies.length > 0 && wellbeingAfter === null && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 1.4 }}
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              {t('stage6.wellbeing.label')}
            </p>
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              {t('stage6.wellbeing.question')}
            </p>
            <div className="flex gap-3 flex-wrap">
              {WELLBEING_OPTIONS.map(opt => (
                <motion.button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setWellbeingAfter(opt.value);
                    onUpdate({ wellbeingAfter: opt.value });
                  }}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  className="px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-medium"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-deep)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation after wellbeing selection */}
      <AnimatePresence>
        {showReady && wellbeingAfter !== null && !showActions && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {t('stage6.thanks')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarjetas de acción — aparecen después del wellbeing check-out */}
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
              {t('stage6.actions.label')}
            </p>

            {/* Tarjeta: Ver mi resumen */}
            <motion.button
              type="button"
              onClick={() => onComplete('record')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-[var(--radius-card)] text-left"
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
                  {t('stage6.actions.record.title')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {t('stage6.actions.record.subtitle')}
                </p>
              </div>
            </motion.button>

            {/* Tarjeta: Nuevo proceso */}
            <motion.button
              type="button"
              onClick={() => onComplete('new-session')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-[var(--radius-card)] text-left"
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
                  {t('stage6.actions.new.title')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {t('stage6.actions.new.subtitle')}
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
              {t('stage6.actions.home')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
