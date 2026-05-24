'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Interpretation } from '@/lib/types';
import { buildInterpretationPrompt } from '@/lib/ai-prompts';
import { useAIStream } from '@/hooks/use-ai-stream';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { Heart, ArrowCounterClockwise, ArrowSquareOut } from '@phosphor-icons/react';
import { useLanguage } from '@/contexts/language-context';

interface StageInterpretationProps {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  onAdvance: (interpretation: Interpretation) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageInterpretation({ session, patient, priorSessions = [], onAdvance, onUpdate }: StageInterpretationProps) {
  const { locale, t } = useLanguage();

  const THINKING_PHRASES = [
    t('stage4.thinking.1'),
    t('stage4.thinking.2'),
    t('stage4.thinking.3'),
  ];
  const [fullInterpretation, setFullInterpretation] = useState<Interpretation | null>(
    session.interpretation ?? null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [awaitingConsent, setAwaitingConsent] = useState(!session.interpretation);
  const [pauseMode, setPauseMode] = useState(false);
  const [isError, setIsError] = useState(false);
  const [resonated, setResonated] = useState(!!session.interpretation?.resonatedAt);
  const [showRing, setShowRing] = useState(false);
  const [responseText, setResponseText] = useState(session.interpretationResponse ?? '');
  const [responseSaved, setResponseSaved] = useState(!!session.interpretationResponse);
  const { text, isStreaming, isDone, startStream, streamFromUrl } = useAIStream();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (session.interpretation) {
      setAwaitingConsent(false);
      startStream(session.interpretation.text);
    }
    // If no interpretation, we wait for consent — no auto-generate
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When real streaming completes, save the interpretation from streamed text
  useEffect(() => {
    if (!isDone || !text || fullInterpretation) return;
    const result: Interpretation = { text, groundingSources: [] };
    setFullInterpretation(result);
    onUpdate({ interpretation: result });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  const handleConsent = () => {
    setAwaitingConsent(false);
    generate();
  };

  const handlePause = () => {
    setPauseMode(true);
  };

  const generate = async (priorText?: string) => {
    setIsGenerating(true);
    setIsError(false);
    setFullInterpretation(null);
    try {
      const prompt = buildInterpretationPrompt({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        memories: session.memories,
        patient,
        lifeChanges: session.lifeChanges,
        stage3Notes: session.stage3Notes,
        explorationRecord: session.explorationRecord,
        priorSessions,
        priorInterpretation: priorText,
        locale,
      });
      setIsGenerating(false);
      await streamFromUrl('/api/stream', { prompt, temperature: 0.7 });
    } catch (e) {
      console.error(e);
      setIsError(true);
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

  const displayText = shouldReduce ? (fullInterpretation?.text ?? text) : text;
  const showContent = isDone || isStreaming || (!!shouldReduce && !!fullInterpretation);

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          {t('stage4.label')}
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          {t('stage4.title')}
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('stage4.subtitle')}
        </p>
      </div>

      {/* Consentimiento antes de interpretar */}
      <AnimatePresence>
        {awaitingConsent && !pauseMode && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="rounded-[var(--radius-card)] p-6 space-y-4"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              {t('stage4.consent.title')}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {t('stage4.consent.body')}
            </p>
            <div className="flex gap-3 pt-2">
              <motion.button
                type="button"
                onClick={handleConsent}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
                style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
              >
                {t('stage4.consent.yes')}
              </motion.button>
              <motion.button
                type="button"
                onClick={handlePause}
                whileTap={shouldReduce ? {} : { scale: 0.98 }}
                className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-medium"
                style={{ color: 'var(--color-muted)' }}
              >
                {t('stage4.consent.wait')}
              </motion.button>
            </div>
          </motion.div>
        )}
        {awaitingConsent && pauseMode && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[var(--radius-card)] p-6 space-y-4 text-center"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {t('stage4.pause.text')}
            </p>
            <motion.button
              type="button"
              onClick={handleConsent}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
            >
              {t('stage4.pause.ready')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {isGenerating && <AIThinking phrases={THINKING_PHRASES} />}

      {isError && !isGenerating && (
        <div
          className="rounded-[var(--radius-card)] p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('stage4.error')}
          </p>
          <button
            type="button"
            onClick={() => generate()}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}
          >
            <ArrowCounterClockwise size={14} />
            {t('stage4.retry')}
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
                    disabled={resonated}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all disabled:cursor-default"
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
                    {resonated ? t('stage4.resonated') : t('stage4.resonate')}
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
                  onClick={() => generate(fullInterpretation?.text ?? (text || undefined))}
                  whileTap={shouldReduce ? {} : { scale: 0.98 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-muted)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <ArrowCounterClockwise size={14} />
                  {t('stage4.reframe')}
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

      {/* Patient response to interpretation */}
      <AnimatePresence>
        {(isDone || (!!shouldReduce && !!fullInterpretation)) && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldReduce ? 0 : 0.4 }}
            className="rounded-[var(--radius-card)] p-6 space-y-3"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '17px', lineHeight: 1.4 }}>
              {t('stage4.response.question')}
            </p>
            {responseSaved ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                {responseText}
              </p>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  placeholder={t('stage4.response.placeholder')}
                  rows={3}
                  className="w-full bg-transparent outline-none resize-none p-3 rounded-[var(--radius-inner)] border-2 text-sm"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-violet)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
                <div className="flex gap-3">
                  {responseText.trim().length >= 5 && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        onUpdate({ interpretationResponse: responseText.trim() });
                        setResponseSaved(true);
                      }}
                      whileTap={shouldReduce ? {} : { scale: 0.97 }}
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-violet)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                    >
                      {t('stage4.response.save')}
                    </motion.button>
                  )}
                  <button
                    type="button"
                    onClick={() => setResponseSaved(true)}
                    className="text-sm"
                    style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                  >
                    {t('stage4.response.skip')}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA solo visible cuando el streaming ha terminado y el paciente respondió o saltó */}
      <FloatingBar visible={(isDone || (!!shouldReduce && !!fullInterpretation)) && responseSaved}>
        <motion.button
          type="button"
          onClick={() => {
            const interp: Interpretation = fullInterpretation ?? { text, groundingSources: [] };
            onAdvance(interp);
          }}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
          style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
        >
          {t('stage4.advance')}
        </motion.button>
      </FloatingBar>
    </div>
  );
}
