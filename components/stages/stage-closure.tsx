'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Closure, Strategy } from '@/lib/types';
import { generateStrategies, generateReflectionQuestions } from '@/actions/ai';
import { buildClosurePrompt } from '@/lib/ai-prompts';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowCounterClockwise, FileText, ArrowsClockwise, House } from '@phosphor-icons/react';
import { useLanguage } from '@/contexts/language-context';

type ClosureAction = 'dashboard' | 'record' | 'new-session' | 'diary';

function StrategiesSection({ strategies, label, shouldReduce }: { strategies: Strategy[]; label: string; shouldReduce: boolean }) {
  const [expanded, setExpanded] = useState<number>(0);
  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: shouldReduce ? 0 : 1.2 }}
      className="rounded-[var(--radius-card)] p-6 space-y-3"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
        {label}
      </p>
      <div className="space-y-2">
        {strategies.map((s, i) => (
          <motion.div
            key={i}
            initial={shouldReduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (shouldReduce ? 0 : 1.3) + i * 0.12, duration: 0.4 }}
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === i ? -1 : i)}
              className="w-full text-left pl-3 py-2"
              style={{ borderLeft: `2px solid ${expanded === i ? 'var(--color-terracotta)' : 'var(--color-border)'}`, background: 'none', border: 'none', cursor: 'pointer', transition: 'border-color 0.2s' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>{s.title}</p>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.p
                  initial={shouldReduce ? {} : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={shouldReduce ? {} : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm leading-relaxed pl-3 mt-1 overflow-hidden"
                  style={{ color: 'var(--color-muted)', borderLeft: '2px solid var(--color-terracotta)' }}
                >
                  {s.description}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

interface StageClosureProps {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  onComplete: (action: 'dashboard' | 'record' | 'new-session' | 'diary') => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageClosure({ session, patient, priorSessions = [], onComplete, onUpdate }: StageClosureProps) {
  const { t, locale } = useLanguage();

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
  const [intentionOutcome, setIntentionOutcome] = useState<'yes' | 'related' | 'no' | null>(
    session.intentionOutcome ?? null
  );
  const [celebrating, setCelebrating] = useState(false);
  const [pendingAction, setPendingAction] = useState<ClosureAction | null>(null);
  const [gestaltResponse, setGestaltResponse] = useState(session.gestaltActivityResponse ?? '');
  const [gestaltResponseSaved, setGestaltResponseSaved] = useState(!!session.gestaltActivityResponse);
  const [resolutionAnswer, setResolutionAnswer] = useState<'much_better' | 'better' | 'still_working' | null>(
    session.resolutionAnswer ?? null
  );
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>(
    session.reflectionQuestions ?? []
  );
  const { text, isStreaming, isDone, startStream, streamFromUrl } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.closure) {
      startStream(session.closure.text);
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show actions after wellbeing is selected
  useEffect(() => {
    if (isDone && strategies.length > 0 && wellbeingAfter !== null) {
      const timer = setTimeout(() => setShowActions(true), shouldReduce ? 0 : 800);
      return () => clearTimeout(timer);
    }
  }, [isDone, strategies.length, wellbeingAfter, shouldReduce]);

  // 30-second fallback: show actions even if wellbeing is never selected
  useEffect(() => {
    if (!(isDone && strategies.length > 0)) return;
    const timer = setTimeout(() => setShowActions(true), 30000);
    return () => clearTimeout(timer);
  }, [isDone, strategies.length]);

  // Celebration overlay then navigate
  useEffect(() => {
    if (!celebrating || !pendingAction) return;
    const timer = setTimeout(() => onComplete(pendingAction), shouldReduce ? 0 : 1800);
    return () => clearTimeout(timer);
  }, [celebrating, pendingAction, shouldReduce, onComplete]);

  const handleComplete = (action: ClosureAction) => {
    setPendingAction(action);
    setCelebrating(true);
  };

  const generate = async () => {
    setIsGenerating(true);
    setIsError(false);
    setFullClosure(null);
    setStrategies([]);
    setShowActions(false);
    try {
      const priorGestaltResponse = priorSessions
        .filter(s => s.gestaltActivityResponse)
        .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
        ?.gestaltActivityResponse;

      const prompt = buildClosurePrompt({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        memories: session.memories,
        interpretation: session.interpretation?.text ?? '',
        gestaltActivity: session.gestaltActivity ?? null,
        gestaltActivityResponse: priorGestaltResponse,
        patient,
        deepWorkSynthesis: session.deepWork?.synthesis,
        interpretationResponse: session.interpretationResponse,
        priorSessions,
        locale,
      });

      // Start streaming the letter immediately; fetch strategies in parallel
      setIsGenerating(false);
      const [, strats] = await Promise.all([
        streamFromUrl('/api/stream', { prompt, temperature: 0.7 }),
        generateStrategies({
          conflicts: session.conflicts,
          frameworkMatches: session.frameworkMatches,
          interpretation: session.interpretation?.text ?? '',
          gestaltActivity: session.gestaltActivity ?? null,
          patient,
          explorationRecord: session.explorationRecord ?? undefined,
          locale,
        }),
      ]);
      setStrategies(strats);
    } catch (e) {
      console.error(e);
      setIsError(true);
      setIsGenerating(false);
    }
  };

  // When real streaming completes, save the closure and generate reflection questions
  useEffect(() => {
    if (!isDone || !text || fullClosure) return;
    const result: Closure = { text, groundingSources: [] };
    setFullClosure(result);
    // Generate reflection questions if not already present
    if (reflectionQuestions.length === 0) {
      generateReflectionQuestions({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        closure: text,
        explorationRecord: session.explorationRecord ?? undefined,
        locale,
      }).then(questions => {
        setReflectionQuestions(questions);
        onUpdate({ reflectionQuestions: questions });
      }).catch(() => {
        // Silently fail — reflection questions are non-critical
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // Persist closure + strategies whenever both are available
  useEffect(() => {
    if (!fullClosure || strategies.length === 0) return;
    const closureWithStrategies = { ...fullClosure, strategies };
    onUpdate({ closure: closureWithStrategies });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullClosure, strategies]);

  const displayText = shouldReduce ? (fullClosure?.text ?? text) : text;
  const showContent = isDone || isStreaming || (!!shouldReduce && !!fullClosure);
  const showReady = isDone || (!!shouldReduce && !!fullClosure);

  if (celebrating) {
    return (
      <motion.div
        initial={shouldReduce ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center gap-3 z-50"
        style={{ background: 'var(--color-base)' }}
      >
        <motion.p
          initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
            color: 'var(--color-deep)',
          }}
        >
          {t('stage6.celebrate.line')}
        </motion.p>
        <motion.p
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: 'var(--color-muted)', fontSize: '1rem' }}
        >
          {t('stage6.celebrate.sub')}
        </motion.p>
      </motion.div>
    );
  }

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
            <AnimatePresence>
              {!gestaltResponseSaved ? (
                <motion.div
                  initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <textarea
                    value={gestaltResponse}
                    onChange={e => setGestaltResponse(e.target.value)}
                    placeholder={t('stage6.gestalt.response.placeholder')}
                    rows={3}
                    className="w-full bg-transparent outline-none resize-none p-3 rounded-[var(--radius-inner)] border-2 text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--color-violet)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                  {gestaltResponse.trim().length >= 5 && (
                    <motion.button
                      type="button"
                      onClick={() => {
                        onUpdate({ gestaltActivityResponse: gestaltResponse.trim() });
                        setGestaltResponseSaved(true);
                      }}
                      initial={shouldReduce ? {} : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileTap={shouldReduce ? {} : { scale: 0.97 }}
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-violet)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                    >
                      {t('stage6.gestalt.response.save')}
                    </motion.button>
                  )}
                </motion.div>
              ) : (
                <motion.p
                  initial={shouldReduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm italic"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {gestaltResponse}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estrategias prácticas */}
      <AnimatePresence>
        {showReady && strategies.length > 0 && (
          <StrategiesSection strategies={strategies} label={t('stage6.strategies.label')} shouldReduce={!!shouldReduce} />
        )}
      </AnimatePresence>

      {/* Checkout card — intention + wellbeing combined */}
      <AnimatePresence>
        {showReady && strategies.length > 0 && wellbeingAfter === null && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 1.35 }}
            className="rounded-[var(--radius-card)] p-6 space-y-6"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              {t('stage6.checkout.label')}
            </p>

            {session.sessionIntention && (
              <div className="space-y-3">
                <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
                  {t('stage6.intention.question')}
                </p>
                {intentionOutcome === null ? (
                  <div className="flex gap-3 flex-wrap">
                    {(['yes', 'related', 'no'] as const).map(opt => (
                      <motion.button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setIntentionOutcome(opt);
                          onUpdate({ intentionOutcome: opt });
                        }}
                        whileTap={shouldReduce ? {} : { scale: 0.95 }}
                        className="px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-medium"
                        style={{
                          background: 'var(--color-base)',
                          border: '1.5px solid var(--color-border)',
                          color: 'var(--color-deep)',
                          cursor: 'pointer',
                        }}
                      >
                        {t(`stage6.intention.${opt}` as Parameters<typeof t>[0])}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-sage)', fontStyle: 'italic' }}>
                    {t(`stage6.intention.${intentionOutcome}` as Parameters<typeof t>[0])}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
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

      {/* Reflection questions — visible once actions are ready */}
      <AnimatePresence>
        {showActions && reflectionQuestions.length > 0 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 0.1 }}
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-terracotta)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-terracotta)' }}
            >
              {t('stage6.reflection.label')}
            </p>
            <div className="space-y-3">
              {reflectionQuestions.map((q, i) => (
                <motion.p
                  key={i}
                  initial={shouldReduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (shouldReduce ? 0 : 0.15) + i * 0.1 }}
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
                >
                  {q}
                </motion.p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolution question — session 5+ milestone */}
      <AnimatePresence>
        {showActions && session.sessionNumber >= 5 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 0.2 }}
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-sage)' }}
          >
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '17px', lineHeight: 1.4 }}>
              {t('stage6.resolution.question')}
            </p>
            {resolutionAnswer === null ? (
              <div className="flex flex-col gap-2">
                {(['much_better', 'better', 'still_working'] as const).map(opt => (
                  <motion.button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setResolutionAnswer(opt);
                      onUpdate({ resolutionAnswer: opt });
                    }}
                    whileTap={shouldReduce ? {} : { scale: 0.98 }}
                    className="w-full text-left px-4 py-3 rounded-[var(--radius-inner)] text-sm"
                    style={{
                      background: 'var(--color-base)',
                      border: '1.5px solid var(--color-border)',
                      color: 'var(--color-deep)',
                      cursor: 'pointer',
                    }}
                  >
                    {t(`stage6.resolution.${opt}` as Parameters<typeof t>[0])}
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-sage)', fontStyle: 'italic' }}>
                {t(`stage6.resolution.${resolutionAnswer}` as Parameters<typeof t>[0])}
              </p>
            )}
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
              onClick={() => handleComplete('record')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-[var(--radius-card)] text-left"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-violet-light)' }}
              >
                <FileText size={18} style={{ color: 'var(--color-violet)' }} />
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
              onClick={() => handleComplete('new-session')}
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
              onClick={() => handleComplete('dashboard')}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ color: 'var(--color-muted)' }}
            >
              <House size={15} />
              {t('stage6.actions.home')}
            </motion.button>

            {/* Diary nudge — subtle, below all main actions */}
            <motion.div
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: shouldReduce ? 0 : 0.6 }}
              className="pt-2 text-center"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>
                {t('stage6.diary.nudge')}
              </p>
              <button
                type="button"
                onClick={() => handleComplete('diary')}
                className="text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-sage)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('stage6.diary.cta')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
