'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import type { Patient, PatientSession, ExplorationRecord, ExplorationPhase, Stage3Type, FrameworkKey } from '@/lib/types';
import { getExplorationResponse, synthesizeExploration } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { VoiceMicButton } from '@/components/ui/voice-mic-button';
import { useVoice } from '@/hooks/use-voice';
import { useLanguage } from '@/contexts/language-context';

type Message = { role: 'patient' | 'therapist'; text: string; isInsight?: boolean };

type Props = {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  lastDiaryEntry?: import('@/lib/types').DiaryEntry | null;
  onAdvance: (record: ExplorationRecord) => void;
  onUpdate: (session: PatientSession) => void;
};

const STAGE3_TO_FRAMEWORK: Record<Stage3Type, FrameworkKey> = {
  memories: 'freudiano',
  bodywork: 'bioenergetico',
  social_context: 'adleriano',
  gestalt_activity: 'gestalt',
  exposure: 'conductual',
};

const FRAMEWORK_KEYS: Record<Stage3Type, string> = {
  memories: 'stage3.framework.memories',
  bodywork: 'stage3.framework.bodywork',
  social_context: 'stage3.framework.social_context',
  gestalt_activity: 'stage3.framework.gestalt_activity',
  exposure: 'stage3.framework.exposure',
};


const MIN_TURNS_DEFAULT = 4;
const MIN_TURNS_LIGHT = 2; // when wellbeing on arrival is very low (1-2/5)

export function StageExploration({ session, patient, priorSessions = [], lastDiaryEntry, onAdvance, onUpdate: _onUpdate }: Props) {
  const shouldReduce = useReducedMotion();
  const { t, locale } = useLanguage();

  const PHASE_LABELS: Record<ExplorationPhase, string> = {
    exploring: t('stage3.phase.exploring'),
    deepening: t('stage3.phase.deepening'),
    pattern_linking: t('stage3.phase.pattern_linking'),
    challenging: t('stage3.phase.challenging'),
    insight: t('stage3.phase.insight'),
    consolidating: t('stage3.phase.consolidating'),
  };

  const stage3Type = (session.stage3Type ?? 'memories') as Stage3Type;
  const frameworkKey = STAGE3_TO_FRAMEWORK[stage3Type];
  const frameworkName = session.frameworkMatches[0]?.name ?? t(FRAMEWORK_KEYS[stage3Type] as Parameters<typeof t>[0]);

  const fallbackTitle = session.conflicts[0]?.synthesized ?? t('stage3.fallback.title');
  const workCard = session.selectedWorkCard ?? {
    id: '0',
    title: fallbackTitle,
    subtitle: fallbackTitle,
    openingLine: t('stage3.fallback.opening'),
  };

  const STORAGE_KEY = `exploration_draft_${session.id}`;

  // Restore mid-session messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed) && parsed.length > 1) return parsed;
      }
    } catch { /* ignore */ }
    return [{ role: 'therapist', text: workCard.openingLine }];
  });
  const [currentInput, setCurrentInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<ExplorationPhase>('exploring');
  const [phaseTransitionMsg, setPhaseTransitionMsg] = useState<string | null>(null);
  const prevPhaseRef = useRef<ExplorationPhase>('exploring');

  // Synthesis state
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);
  const [editedCommitment, setEditedCommitment] = useState('');

  // Voice
  const {
    isVoiceMode, isRecording, isTranscribing, isSpeaking, transcribedText, voiceError,
    toggleVoiceMode, startRecording, stopRecording, speak, cancelSpeech, clearTranscribedText,
  } = useVoice();

  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLightMode = (session.wellbeingBefore ?? 3) <= 2;
  const MIN_TURNS_TO_END = isLightMode ? MIN_TURNS_LIGHT : MIN_TURNS_DEFAULT;

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const lastMessage = messages[messages.length - 1];
  const awaitingPatient = lastMessage?.role === 'therapist' && synthesisState === 'idle';
  const canEndEarly = patientTurns >= MIN_TURNS_TO_END && !isThinking;

  const lastExploration = [...priorSessions].reverse().find(s => s.explorationRecord)?.explorationRecord;
  const lastActionCommitment = lastExploration?.actionCommitment;
  const lastTherapistMsg = [...messages].reverse().find(m => m.role === 'therapist');

  // Seed editable commitment when synthesis completes
  useEffect(() => {
    if (explorationRecord?.actionCommitment) {
      setEditedCommitment(explorationRecord.actionCommitment);
    }
  }, [explorationRecord]);

  // Phase transition notification
  useEffect(() => {
    if (currentPhase === prevPhaseRef.current) return;
    const transitionKey = `stage3.phase.transition.${currentPhase}` as Parameters<typeof t>[0];
    const msg = currentPhase !== 'exploring' ? t(transitionKey) : null;
    prevPhaseRef.current = currentPhase;
    if (!msg) return;
    setPhaseTransitionMsg(msg);
    const timer = setTimeout(() => setPhaseTransitionMsg(null), 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase]);

  // Auto-scroll
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  // Persist mid-session draft every 3 patient turns
  useEffect(() => {
    const turns = messages.filter(m => m.role === 'patient').length;
    if (turns > 0 && turns % 3 === 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Auto-focus input when therapist speaks
  useEffect(() => {
    if (awaitingPatient && !isVoiceMode && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [awaitingPatient, messages.length, isVoiceMode]);

  // Auto-play TTS in voice mode when therapist responds
  useEffect(() => {
    if (!isVoiceMode || !lastTherapistMsg?.text) return;
    speak(lastTherapistMsg.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTherapistMsg?.text, isVoiceMode]);

  // Auto-submit after voice transcription
  useEffect(() => {
    if (!transcribedText || !isVoiceMode) return;
    const t = setTimeout(() => {
      handleSubmit(transcribedText);
      clearTranscribedText();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcribedText]);

  const handleSubmit = async (text?: string) => {
    const trimmed = (text ?? currentInput).trim();
    if (!trimmed || isThinking) return;

    const updatedMessages: Message[] = [...messages, { role: 'patient', text: trimmed }];
    setMessages(updatedMessages);
    setCurrentInput('');
    setIsThinking(true);

    try {
      const result = await getExplorationResponse({
        selectedCard: workCard,
        messages: updatedMessages,
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        patient,
        stage3Type,
        currentPhase,
        priorSessions,
        locale,
        lifeChanges: session.lifeChanges,
        sessionIntention: session.sessionIntention,
        wellbeingBefore: session.wellbeingBefore,
        phq9: session.phq9,
        gad7: session.gad7,
        recentDiaryEntry: lastDiaryEntry?.note
          ? `${lastDiaryEntry.emotion}: ${lastDiaryEntry.note}`
          : (lastDiaryEntry ? lastDiaryEntry.emotion : undefined),
        quickSession: session.quickSession,
        solutionVision: patient.solutionVision,
      });

      setCurrentPhase(result.nextPhase);
      const therapistMessage: Message = {
        role: 'therapist',
        text: result.response,
        isInsight: result.insightDetected,
      };

      setMessages(prev => [...prev, therapistMessage]);
      setIsThinking(false);

      if (result.done) {
        handleSynthesize([...updatedMessages, therapistMessage]);
      }
    } catch {
      setIsThinking(false);
      handleSynthesize(messages);
    }
  };

  const handleEndEarly = () => handleSynthesize(messages);

  const handleSynthesize = async (finalMessages: Message[]) => {
    setSynthesisState('loading');
    const rawData = finalMessages
      .map(m => `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`)
      .join('\n\n');

    try {
      const priorExplorations = priorSessions.filter(s => s.explorationRecord).map(s => s.explorationRecord!);
      const record = await synthesizeExploration({
        rawData, patient, conflicts: session.conflicts,
        frameworkKey, frameworkName, stage3Type,
        sessionNumber: session.sessionNumber, priorExplorations,
        locale,
      });
      setExplorationRecord(record);
      setSynthesisState('done');
    } catch {
      setSynthesisState('idle');
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      onAdvance(
        { sessionNumber: session.sessionNumber, framework: frameworkKey, frameworkName, stage3Type, insights: [], aiReflection: '', completedAt: Date.now() },
      );
    }
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', outline: 'none', resize: 'none',
    padding: '1rem', borderRadius: 'var(--radius-inner)', border: '2px solid var(--color-border)',
    color: 'var(--color-deep)', fontSize: '1rem', lineHeight: 1.6, boxSizing: 'border-box',
    transition: 'border-color 0.2s ease', fontFamily: 'inherit',
  };

  const stepVariants = {
    initial: shouldReduce ? {} : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduce ? {} : { opacity: 0, y: -8 },
  };
  const transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

  return (
    <div style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', margin: 0 }}>
            {t('stage3.label')} — {frameworkName}
          </p>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4.5vw, 42px)', color: 'var(--color-deep)', lineHeight: 1.1, margin: 0 }}>
          {t('stage3.title')}
        </h2>
      </div>

      {/* Prior session continuity */}
      {lastExploration && synthesisState === 'idle' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)', overflow: 'hidden' }}
        >
          {lastActionCommitment && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(107,94,158,0.08)', borderBottom: '1px solid rgba(107,94,158,0.12)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.7rem', fontWeight: 600, margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('stage3.prior.commitment')}
              </p>
              <p style={{ color: 'var(--color-deep)', fontSize: '0.875rem', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                "{lastActionCommitment}"
              </p>
            </div>
          )}
          {lastExploration.insights.length > 0 && (
            <div style={{ padding: '0.75rem 1rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.7rem', fontWeight: 500, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('stage3.prior.explored')} {lastExploration.sessionNumber}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.375rem' }}>
                {lastExploration.insights.map(i => (
                  <span key={i.theme} style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}>
                    {i.theme}
                  </span>
                ))}
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                {lastExploration.aiReflection}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Synthesis loading */}
      {synthesisState === 'loading' && (
        <motion.div initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '2rem' }}>
          <AIThinking phrases={[t('stage3.synthesis.loading.1'), t('stage3.synthesis.loading.2'), t('stage3.synthesis.loading.3')]} />
        </motion.div>
      )}

      {/* Synthesis result */}
      {synthesisState === 'done' && explorationRecord && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.75rem', fontWeight: 500, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('stage3.synthesis.label')}
            </p>
            <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
              {explorationRecord.aiReflection}
            </p>
            {explorationRecord.insights.length > 0 && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {explorationRecord.insights.map((insight, i) => (
                    <motion.span
                      key={insight.theme}
                      initial={shouldReduce ? {} : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      title={insight.observation}
                      style={{ padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'var(--color-violet-light)', color: 'var(--color-violet)', cursor: 'default' }}
                    >
                      {insight.theme}
                    </motion.span>
                  ))}
                </div>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', margin: 0 }}>
                  {t('stage3.synthesis.sessions.note')}
                </p>
              </div>
            )}
          </div>
          {explorationRecord.actionCommitment && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)', fontSize: '0.75rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('stage3.synthesis.commitment.label')}
              </p>
              <textarea
                value={editedCommitment}
                onChange={e => setEditedCommitment(e.target.value)}
                rows={2}
                style={{ width: '100%', background: 'var(--color-surface)', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-inner)', padding: '0.75rem 1rem', fontSize: '0.9375rem', color: 'var(--color-deep)', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
              />
              <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', margin: 0 }}>
                {t('stage3.synthesis.commitment.edit_hint')}
              </p>
            </div>
          )}
          <motion.button
            type="button"
            onClick={() => {
              try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
              const finalRecord = editedCommitment.trim()
                ? { ...explorationRecord!, actionCommitment: editedCommitment.trim() }
                : explorationRecord!;
              onAdvance(finalRecord);
            }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)', color: 'white', border: 'none', borderRadius: 'var(--radius-inner)', padding: '1rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'stretch', textAlign: 'center' }}
          >
            {t('stage3.close')}
          </motion.button>
        </motion.div>
      )}

      {/* Active conversation */}
      {synthesisState === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Progress line + phase label */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ height: '2px', borderRadius: '9999px', background: 'var(--color-border)', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', borderRadius: '9999px', background: currentPhase === 'insight' ? 'var(--color-violet)' : 'var(--color-sage)' }}
                animate={{
                  width: `${Math.round({ exploring: 10, deepening: 30, pattern_linking: 50, challenging: 65, insight: 80, consolidating: 92 }[currentPhase] ?? 10)}%`,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: currentPhase === 'insight' ? 'var(--color-violet)' : 'var(--color-muted)', margin: 0, letterSpacing: '0.04em' }}>
                {PHASE_LABELS[currentPhase]}
              </p>
              <AnimatePresence>
                {phaseTransitionMsg && (
                  <motion.p
                    key={phaseTransitionMsg}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: currentPhase === 'insight' ? 'var(--color-violet)' : 'var(--color-sage)', margin: 0, letterSpacing: '0.04em' }}
                  >
                    {phaseTransitionMsg}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Session intention chip */}
          {session.sessionIntention && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                {t('stage3.intention.label')}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-deep)', background: 'var(--color-surface)', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--color-border)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {session.sessionIntention}
              </span>
            </div>
          )}

          {/* Conversation history */}
          {messages.length > 1 && (
            <div ref={historyRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
              {messages.slice(0, awaitingPatient ? -1 : messages.length).map((msg, i) => (
                <motion.div
                  key={i}
                  initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] px-4 py-3.5 rounded-[18px]"
                    style={msg.role === 'patient' ? {
                      background: 'var(--color-sage)',
                      color: 'white',
                      borderBottomRightRadius: 6,
                    } : {
                      background: 'var(--color-surface)',
                      color: 'var(--color-deep)',
                      borderBottomLeftRadius: 6,
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <p className="leading-relaxed text-[15px]"
                      style={{
                        ...(msg.role === 'therapist' ? { fontFamily: 'var(--font-display)' } : {}),
                        ...(msg.isInsight ? { fontStyle: 'italic' } : {}),
                      }}>
                      {msg.text}
                    </p>
                    {msg.isInsight && msg.role === 'therapist' && (
                      <p style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', marginTop: '0.375rem', fontWeight: 600 }}>
                        {t('stage3.insight.label')}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Current question + input */}
          <AnimatePresence mode="wait">
            {awaitingPatient && !isThinking && (
              <motion.div
                key={`q-${messages.length}`}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                <div className="flex justify-start">
                  <div
                    className="max-w-[85%] px-4 py-3.5 rounded-[18px]"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-deep)',
                      borderBottomLeftRadius: 6,
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'var(--color-deep)', lineHeight: 1.5, margin: 0, ...(lastMessage.isInsight ? { fontStyle: 'italic' } : {}) }}>
                      {lastMessage.text}
                    </p>
                    {lastMessage.isInsight && (
                      <p style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', marginTop: '0.375rem', fontWeight: 600 }}>
                        {t('stage3.insight.label')}
                      </p>
                    )}
                  </div>
                </div>

                {/* TTS speaking indicator */}
                {isSpeaking && (
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 16 }}>
                    {[0, 1, 2, 3].map(i => (
                      <motion.span
                        key={i}
                        animate={shouldReduce ? {} : { scaleY: [1, 2.5, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                        style={{ display: 'block', width: 3, height: 8, borderRadius: 99, background: 'var(--color-violet)', opacity: 0.5 }}
                      />
                    ))}
                  </div>
                )}

                {/* Input — voice mode or text mode */}
                {isVoiceMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <motion.button
                        type="button"
                        onClick={() => { toggleVoiceMode(); if (isSpeaking) cancelSpeech(); }}
                        whileTap={shouldReduce ? {} : { scale: 0.95 }}
                        style={{
                          width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--color-sage)',
                          color: 'white',
                          boxShadow: 'var(--shadow-card)', border: 'none', cursor: 'pointer',
                        }}
                        aria-label={t('stage3.voice.deactivate')}
                        aria-pressed={true}
                      >
                        <SpeakerHigh size={18} aria-hidden />
                      </motion.button>
                    </div>
                    <VoiceMicButton
                      isRecording={isRecording}
                      isTranscribing={isTranscribing}
                      pendingText={transcribedText}
                      onStart={startRecording}
                      onStop={stopRecording}
                    />
                  </div>
                ) : (
                  <>
                    <textarea
                      ref={inputRef}
                      key={`input-${messages.length}`}
                      value={currentInput}
                      onChange={e => setCurrentInput(e.target.value)}
                      placeholder={lastMessage.isInsight ? t('stage3.input.insight') : t('stage3.input.placeholder')}
                      rows={4}
                      style={textareaStyle}
                      onFocus={e => (e.target.style.borderColor = lastMessage.isInsight ? 'var(--color-violet)' : 'var(--color-sage)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && currentInput.trim().length >= 1) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <motion.button
                        type="button"
                        onClick={() => { toggleVoiceMode(); if (isSpeaking) cancelSpeech(); }}
                        whileTap={shouldReduce ? {} : { scale: 0.95 }}
                        style={{
                          width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--color-surface)',
                          color: 'var(--color-muted)',
                          boxShadow: 'var(--shadow-card)', border: 'none', cursor: 'pointer',
                        }}
                        aria-label={t('stage3.voice.activate')}
                        aria-pressed={false}
                      >
                        <SpeakerSlash size={18} aria-hidden />
                      </motion.button>
                      <AnimatePresence>
                        {currentInput.trim().length >= 1 && (
                          <motion.button
                            type="button"
                            onClick={() => handleSubmit()}
                            initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={shouldReduce ? {} : { opacity: 0 }}
                            whileTap={shouldReduce ? {} : { scale: 0.97 }}
                            style={{
                              background: lastMessage.isInsight ? 'var(--color-violet)' : 'var(--color-sage)',
                              boxShadow: 'var(--shadow-glow-sage)', color: 'white', border: 'none',
                              borderRadius: 'var(--radius-inner)', padding: '0.875rem 1.5rem',
                              fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', flex: 1,
                            }}
                          >
                            {t('stage3.send')}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {voiceError && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-terracotta)', margin: 0 }}>{voiceError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI thinking */}
          {isThinking && (
            <motion.div initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '0.5rem' }}>
              <AIThinking phrases={[t('stage3.thinking.1'), t('stage3.thinking.2'), t('stage3.thinking.3')]} />
            </motion.div>
          )}

          {/* Soft nudge after 8 turns without insight */}
          <AnimatePresence>
            {patientTurns >= 8 && awaitingPatient && !isThinking &&
             currentPhase !== 'insight' && currentPhase !== 'consolidating' && (
              <motion.p
                initial={shouldReduce ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textAlign: 'center', fontStyle: 'italic', margin: 0 }}
              >
                {t('stage3.nudge.long')}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Patient-controlled early end */}
          <AnimatePresence>
            {canEndEarly && awaitingPatient && !isThinking && (
              <motion.div
                initial={shouldReduce ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduce ? {} : { opacity: 0 }}
                style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem' }}
              >
                <motion.button
                  type="button"
                  onClick={handleEndEarly}
                  whileTap={shouldReduce ? {} : { scale: 0.97 }}
                  style={{ background: 'none', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-inner)', color: 'var(--color-muted)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.625rem 1.25rem', transition: 'border-color 0.2s, color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-sage)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-sage)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)'; }}
                >
                  {t('stage3.end.early')}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}


    </div>
  );
}
