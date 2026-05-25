'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Closure, Strategy } from '@/lib/types';
import { generateStrategies, generateReflectionQuestions, suggestCommitment } from '@/actions/ai';
import { buildClosurePrompt } from '@/lib/ai-prompts';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { ArrowCounterClockwise, FileText, ArrowsClockwise, House } from '@phosphor-icons/react';
import { useLanguage } from '@/contexts/language-context';

type ClosureAction = 'dashboard' | 'record' | 'new-session' | 'diary';
type ClosurePhase = 'checkout' | 'content' | 'complete';

function StrategiesSection({ strategies, label, shouldReduce }: { strategies: Strategy[]; label: string; shouldReduce: boolean }) {
  const [expanded, setExpanded] = useState<number>(-1);
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

  const textareaStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', outline: 'none', resize: 'none',
    padding: '0.875rem 1rem', borderRadius: 'var(--radius-inner)', border: '2px solid var(--color-border)',
    color: 'var(--color-deep)', fontSize: '0.9375rem', lineHeight: 1.6, boxSizing: 'border-box',
    transition: 'border-color 0.2s ease', fontFamily: 'inherit',
  };

  // ─── Phase state machine ────────────────────────────────────────────
  const getInitialPhase = (): ClosurePhase => {
    if (session.closure) return 'content';
    if (session.wellbeingAfter != null) return 'content'; // wellbeing already captured, skip checkout
    return 'checkout';
  };

  const [phase, setPhase] = useState<ClosurePhase>(getInitialPhase);

  // ─── Checkout state ─────────────────────────────────────────────────
  const [wellbeingAfter, setWellbeingAfter] = useState<number | null>(
    session.wellbeingAfter ?? null
  );
  const [intentionOutcome, setIntentionOutcome] = useState<'yes' | 'related' | 'no' | null>(
    session.intentionOutcome ?? null
  );

  // ─── Commitment state (captured inline in complete phase) ───────────
  const [localCommitment, setLocalCommitment] = useState<string | undefined>(
    session.explorationRecord?.actionCommitment
  );
  const [commitmentText, setCommitmentText] = useState('');
  const [commitmentSkipped, setCommitmentSkipped] = useState(false);
  const [aiCommitmentSuggestion, setAiCommitmentSuggestion] = useState<string | null>(null);

  // ─── Content state ──────────────────────────────────────────────────
  const [fullClosure, setFullClosure] = useState<Closure | null>(session.closure ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>(
    session.closure?.strategies ?? []
  );
  const [gestaltResponse, setGestaltResponse] = useState(session.gestaltActivityResponse ?? '');
  const [gestaltResponseSaved, setGestaltResponseSaved] = useState(!!session.gestaltActivityResponse);

  // ─── Complete state ─────────────────────────────────────────────────
  const [resolutionAnswer, setResolutionAnswer] = useState<'much_better' | 'better' | 'still_working' | null>(
    session.resolutionAnswer ?? null
  );
  const [consultationAnswer, setConsultationAnswer] = useState<'yes' | 'partial' | 'not_yet' | null>(
    session.consultationAnswer ?? null
  );
  const [reflectionExpanded, setReflectionExpanded] = useState(false);
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>(
    session.reflectionQuestions ?? []
  );
  const [reflectionCopied, setReflectionCopied] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // ─── Celebration ────────────────────────────────────────────────────
  const [celebrating, setCelebrating] = useState(false);
  const [pendingAction, setPendingAction] = useState<ClosureAction | null>(null);

  const { text, isStreaming, isDone, startStream, streamFromUrl } = useAIStream();
  const shouldReduce = useReducedMotion();

  // ─── Trigger generation when entering 'content' phase ───────────────
  useEffect(() => {
    if (phase !== 'content') return;
    if (session.closure) {
      startStream(session.closure.text);
    } else {
      generate(localCommitment);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Advance to 'complete' when letter is done and strategies are ready
  useEffect(() => {
    if (phase === 'content' && (isDone || (!!shouldReduce && !!fullClosure)) && strategies.length > 0) {
      const timer = setTimeout(() => setPhase('complete'), shouldReduce ? 0 : 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, fullClosure, strategies.length]);

  // 30-second fallback: advance even if strategies never arrive
  useEffect(() => {
    if (phase !== 'content' || !(isDone || (!!shouldReduce && !!fullClosure))) return;
    const timer = setTimeout(() => setPhase('complete'), 30000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, fullClosure]);

  // Celebration then navigate
  useEffect(() => {
    if (!celebrating || !pendingAction) return;
    const timer = setTimeout(() => onComplete(pendingAction), shouldReduce ? 0 : 1800);
    return () => clearTimeout(timer);
  }, [celebrating, pendingAction, shouldReduce, onComplete]);

  // Fetch AI commitment suggestion when commitment section appears
  useEffect(() => {
    if (phase !== 'complete') return;
    if (localCommitment || commitmentSkipped || aiCommitmentSuggestion) return;
    if (!session.interpretation?.text) return;
    suggestCommitment({
      conflicts: session.conflicts,
      interpretation: session.interpretation.text,
      patient,
      explorationRecord: session.explorationRecord ?? undefined,
      locale,
    }).then(suggestion => {
      if (suggestion) setAiCommitmentSuggestion(suggestion);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleComplete = (action: ClosureAction) => {
    if (gestaltResponse.trim().length >= 5 && !gestaltResponseSaved) {
      onUpdate({ gestaltActivityResponse: gestaltResponse.trim() });
      setGestaltResponseSaved(true);
    }
    setPendingAction(action);
    setCelebrating(true);
  };

  const generate = async (commitment?: string) => {
    setIsGenerating(true);
    setIsError(false);
    setFullClosure(null);
    setStrategies([]);
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
        quickSession: session.quickSession,
      });

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
          actionCommitment: commitment ?? session.explorationRecord?.actionCommitment ?? undefined,
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

  // Save closure + strategies when both are ready
  useEffect(() => {
    if (!isDone || !text || fullClosure) return;
    const result: Closure = { text, groundingSources: [] };
    setFullClosure(result);
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
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  useEffect(() => {
    if (!fullClosure || strategies.length === 0) return;
    const closureWithStrategies = { ...fullClosure, strategies };
    onUpdate({ closure: closureWithStrategies });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullClosure, strategies]);

  const handleCheckoutContinue = () => {
    onUpdate({ wellbeingAfter: wellbeingAfter ?? undefined, intentionOutcome: intentionOutcome ?? undefined });
    setPhase('content');
  };

  const commitmentReady = session.quickSession || !session.explorationRecord || localCommitment !== undefined || commitmentSkipped;

  const displayText = shouldReduce ? (fullClosure?.text ?? text) : text;
  const showContent = isDone || isStreaming || (!!shouldReduce && !!fullClosure);

  // ─── Celebration overlay ─────────────────────────────────────────────
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
          {resolutionAnswer === 'much_better' ? t('stage6.celebrate.line.resolved') : t('stage6.celebrate.line')}
        </motion.p>
        <motion.p
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: 'var(--color-muted)', fontSize: '1rem' }}
        >
          {resolutionAnswer === 'much_better' ? t('stage6.celebrate.sub.resolved') : t('stage6.celebrate.sub')}
        </motion.p>
        {wellbeingAfter != null && session.wellbeingBefore != null && wellbeingAfter > session.wellbeingBefore && (
          <motion.p
            initial={shouldReduce ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{ color: 'var(--color-sage)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
          >
            {t('stage6.celebrate.delta')
              .replace('{delta}', String(wellbeingAfter - session.wellbeingBefore))
              .replace('{before}', String(session.wellbeingBefore))
              .replace('{after}', String(wellbeingAfter))}
          </motion.p>
        )}
      </motion.div>
    );
  }

  // ─── Phase: checkout ────────────────────────────────────────────────
  if (phase === 'checkout') {
    return (
      <motion.div
        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 pb-48"
      >
        <div>
          <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
            {t('stage6.label')}
          </p>
          <h2
            className="leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 56px)', color: 'var(--color-deep)' }}
          >
            {t('stage6.title')}
          </h2>
          <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t('stage6.subtitle')}
          </p>
        </div>

        <div
          className="rounded-[var(--radius-card)] p-6 space-y-6"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
            {t('stage6.checkout.label')}
          </p>

          {/* Intention outcome */}
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
                      onClick={() => setIntentionOutcome(opt)}
                      whileTap={shouldReduce ? {} : { scale: 0.95 }}
                      className="px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-medium"
                      style={{ background: 'var(--color-base)', border: '1.5px solid var(--color-border)', color: 'var(--color-deep)', cursor: 'pointer' }}
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

          {/* Wellbeing after */}
          <div className="space-y-3">
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              {t('stage6.wellbeing.question')}
            </p>
            <div className="flex gap-3 flex-wrap">
              {WELLBEING_OPTIONS.map(opt => (
                <motion.button
                  key={opt.value}
                  type="button"
                  onClick={() => setWellbeingAfter(opt.value)}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  className="px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-medium"
                  style={{
                    background: wellbeingAfter === opt.value ? 'var(--color-sage)' : 'var(--color-surface)',
                    color: wellbeingAfter === opt.value ? 'white' : 'var(--color-deep)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'background 0.2s ease, color 0.2s ease',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Wellbeing delta confirmation */}
          <AnimatePresence>
            {wellbeingAfter !== null && (
              <motion.div
                initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {t('stage6.thanks')}
                </p>
                {session.wellbeingBefore !== undefined && (
                  <p className="text-xs" style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                    {wellbeingAfter > session.wellbeingBefore
                      ? t('stage6.wellbeing.delta.up')
                          .replace('{before}', String(session.wellbeingBefore))
                          .replace('{after}', String(wellbeingAfter))
                      : wellbeingAfter === session.wellbeingBefore
                        ? t('stage6.wellbeing.delta.same').replace('{after}', String(wellbeingAfter))
                        : t('stage6.wellbeing.delta.down')}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {wellbeingAfter !== null && (
            <motion.button
              type="button"
              onClick={handleCheckoutContinue}
              initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)', border: 'none', cursor: 'pointer', fontSize: '0.9375rem' }}
            >
              {t('stage6.checkout.continue')}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ─── Phase: content + complete ───────────────────────────────────────
  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          {t('stage6.label')}
        </p>
        <h2
          className="leading-tight breathe"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 56px)', color: 'var(--color-deep)' }}
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
            onClick={() => generate(localCommitment)}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}
          >
            <ArrowCounterClockwise size={14} />
            {t('stage6.retry')}
          </button>
        </div>
      )}

      {/* Carta terapéutica */}
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

      {/* Commitment summary — shown if patient entered one */}
      <AnimatePresence>
        {phase === 'complete' && localCommitment && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldReduce ? 0 : 0.3 }}
            className="rounded-[var(--radius-card)] p-5 space-y-2"
            style={{ background: 'rgba(61,107,71,0.06)', border: '1px solid rgba(61,107,71,0.18)' }}
          >
            <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)' }}>
              {t('stage3.synthesis.commitment.label')}
            </p>
            <p className="text-sm italic" style={{ color: 'var(--color-deep)', lineHeight: 1.6 }}>
              "{localCommitment}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actividad Gestalt experiencial */}
      <AnimatePresence>
        {phase === 'complete' && session.gestaltActivity && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 0.5 }}
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-violet)' }}
          >
            <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)' }}>
              {t('stage6.gestalt.label')}
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>
              {session.gestaltActivity.title}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {session.gestaltActivity.description}
            </p>
            <div className="rounded-[var(--radius-inner)] p-4" style={{ background: 'var(--color-violet-light)' }}>
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

      {/* Commitment capture — inline, after reading the letter */}
      <AnimatePresence>
        {phase === 'complete' && !commitmentReady && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldReduce ? 0 : 0.4 }}
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'rgba(61,107,71,0.06)', border: '1px solid rgba(61,107,71,0.18)' }}
          >
            <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)' }}>
              {t('stage6.commitment.intro')}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--color-deep)', lineHeight: 1.4 }}>
              {t('stage3.action.experiment.q')}
            </p>
            {aiCommitmentSuggestion && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                  {t('stage6.commitment.suggest.label')}
                </p>
                <button
                  type="button"
                  onClick={() => setCommitmentText(aiCommitmentSuggestion)}
                  className="w-full text-left text-sm px-4 py-3 rounded-[var(--radius-inner)] transition-all hover:opacity-80"
                  style={{ background: 'rgba(61,107,71,0.08)', border: '1px solid rgba(61,107,71,0.2)', color: 'var(--color-deep)', lineHeight: 1.5 }}
                >
                  {aiCommitmentSuggestion}
                  <span className="block text-[11px] mt-1.5 font-medium" style={{ color: 'var(--color-sage)' }}>
                    {t('stage6.commitment.suggest.use')} →
                  </span>
                </button>
              </div>
            )}
            <textarea
              value={commitmentText}
              onChange={e => setCommitmentText(e.target.value)}
              placeholder={t('stage3.action.placeholder')}
              rows={3}
              style={textareaStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <div className="space-y-2">
              <AnimatePresence>
                {commitmentText.trim().length >= 5 && (
                  <motion.button
                    type="button"
                    onClick={() => {
                      const c = commitmentText.trim();
                      setLocalCommitment(c);
                      if (session.explorationRecord) {
                        onUpdate({ explorationRecord: { ...session.explorationRecord, actionCommitment: c } });
                      }
                    }}
                    initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduce ? {} : { opacity: 0 }}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    className="w-full py-3.5 rounded-2xl font-semibold text-white"
                    style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)', border: 'none', cursor: 'pointer', fontSize: '0.9375rem' }}
                  >
                    {t('stage3.action.commit')}
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setCommitmentSkipped(true)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.5rem', textAlign: 'center', width: '100%' }}
              >
                {t('stage3.action.skip')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estrategias prácticas */}
      <AnimatePresence>
        {phase === 'complete' && commitmentReady && strategies.length > 0 && (
          <StrategiesSection strategies={strategies} label={t('stage6.strategies.label')} shouldReduce={!!shouldReduce} />
        )}
      </AnimatePresence>

      {/* Reflection questions — collapsed by default, with copy button */}
      <AnimatePresence>
        {phase === 'complete' && commitmentReady && reflectionQuestions.length > 0 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 1.6 }}
            className="rounded-[var(--radius-card)] overflow-hidden"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-terracotta)' }}
          >
            <button
              type="button"
              onClick={() => setReflectionExpanded(e => !e)}
              className="w-full flex items-center justify-between px-6 py-4"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-terracotta)' }}>
                {t('stage6.reflection.label')}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(reflectionQuestions.join('\n\n'));
                    setReflectionCopied(true);
                    setTimeout(() => setReflectionCopied(false), 2500);
                  }}
                  className="text-xs font-medium"
                  style={{ color: reflectionCopied ? 'var(--color-sage)' : 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                >
                  {reflectionCopied ? t('stage6.reflection.copied') : t('stage6.reflection.copy')}
                </button>
                <motion.span animate={{ rotate: reflectionExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'var(--color-muted)' }}>▾</motion.span>
              </div>
            </button>
            <AnimatePresence>
              {reflectionExpanded && (
                <motion.div
                  initial={shouldReduce ? {} : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={shouldReduce ? {} : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden px-6 pb-5 space-y-3"
                >
                  {reflectionQuestions.map((q, i) => (
                    <motion.p
                      key={i}
                      initial={shouldReduce ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
                    >
                      {q}
                    </motion.p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Process reflection — combined resolution + consultation card, sessions 3+ */}
      <AnimatePresence>
        {phase === 'complete' && commitmentReady && session.sessionNumber >= 3 && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: shouldReduce ? 0 : 2.2 }}
            className="rounded-[var(--radius-card)] p-6 space-y-5"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--color-sage)' }}
          >
            {/* Resolution sub-question */}
            <div className="space-y-3">
              <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '16px', lineHeight: 1.4 }}>
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
                      style={{ background: 'var(--color-base)', border: '1.5px solid var(--color-border)', color: 'var(--color-deep)', cursor: 'pointer' }}
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
            </div>

            {/* Consultation reason sub-question — shown after resolution is answered */}
            {resolutionAnswer !== null && patient.consultationReason && (
              <motion.div
                initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.35 }}
                className="space-y-3 overflow-hidden pt-2"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '16px', lineHeight: 1.4 }}>
                  {t('stage6.consultation.question').replace('{reason}', patient.consultationReason.slice(0, 80))}
                </p>
                {consultationAnswer === null ? (
                  <div className="flex flex-col gap-2">
                    {(['yes', 'partial', 'not_yet'] as const).map(opt => (
                      <motion.button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setConsultationAnswer(opt);
                          onUpdate({ consultationAnswer: opt });
                        }}
                        whileTap={shouldReduce ? {} : { scale: 0.98 }}
                        className="w-full text-left px-4 py-3 rounded-[var(--radius-inner)] text-sm"
                        style={{ background: 'var(--color-base)', border: '1.5px solid var(--color-border)', color: 'var(--color-deep)', cursor: 'pointer' }}
                      >
                        {t(`stage6.consultation.${opt}` as Parameters<typeof t>[0])}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-violet)', fontStyle: 'italic' }}>
                    {t(`stage6.consultation.${consultationAnswer}` as Parameters<typeof t>[0])}
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action cards — 2 primary + collapsed secondary */}
      <AnimatePresence>
        {phase === 'complete' && commitmentReady && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldReduce ? 0 : 3.0 }}
            className="space-y-3"
          >
            <p className="text-xs font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
              {t('stage6.actions.label')}
            </p>

            {/* Primary — Record */}
            <motion.button
              type="button"
              onClick={() => handleComplete('record')}
              whileHover={shouldReduce ? {} : { y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full flex items-center gap-4 p-5 rounded-[var(--radius-card)] text-left"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-violet-light)' }}>
                <FileText size={18} style={{ color: 'var(--color-violet)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>{t('stage6.actions.record.title')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{t('stage6.actions.record.subtitle')}</p>
              </div>
            </motion.button>

            {/* Primary — Home */}
            <motion.button
              type="button"
              onClick={() => handleComplete('dashboard')}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-3.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)', background: 'transparent' }}
            >
              <House size={15} />
              {t('stage6.actions.home')}
            </motion.button>

            {/* Secondary — collapsed */}
            <AnimatePresence>
              {showMoreActions ? (
                <motion.div
                  initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden space-y-3"
                >
                  <motion.button
                    type="button"
                    onClick={() => handleComplete('new-session')}
                    whileHover={shouldReduce ? {} : { y: -2 }}
                    whileTap={shouldReduce ? {} : { scale: 0.98 }}
                    className="w-full flex items-center gap-4 p-5 rounded-[var(--radius-card)] text-left"
                    style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-sage-light)' }}>
                      <ArrowsClockwise size={18} style={{ color: 'var(--color-sage)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-deep)' }}>{t('stage6.actions.new.title')}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{t('stage6.actions.new.subtitle')}</p>
                    </div>
                  </motion.button>

                  <div className="pt-1 text-center" style={{ borderTop: '1px solid var(--color-border)' }}>
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
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => setShowMoreActions(true)}
                  className="w-full py-2 text-xs text-center hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t('stage6.actions.more')} ↓
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
