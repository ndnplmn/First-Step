'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SpeakerHigh, SpeakerSlash, Heart, ArrowCounterClockwise } from '@phosphor-icons/react';
import type { Patient, PatientSession, ExplorationRecord, ExplorationPhase, Stage3Type, FrameworkKey, Interpretation } from '@/lib/types';
import { getExplorationResponse, synthesizeExploration, generateInterpretation } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { AICard } from '@/components/ai/ai-card';
import { VoiceMicButton } from '@/components/ui/voice-mic-button';
import { useVoice } from '@/hooks/use-voice';
import { useAIStream } from '@/hooks/use-ai-stream';

type Message = { role: 'patient' | 'therapist'; text: string; isInsight?: boolean };

type Props = {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  onAdvance: (record: ExplorationRecord, interpretation: Interpretation) => void;
  onUpdate: (session: PatientSession) => void;
};

const STAGE3_TO_FRAMEWORK: Record<Stage3Type, FrameworkKey> = {
  memories: 'freudiano',
  bodywork: 'bioenergetico',
  social_context: 'adleriano',
  gestalt_activity: 'gestalt',
  exposure: 'conductual',
};

const FRAMEWORK_NAMES: Record<Stage3Type, string> = {
  memories: 'Psicoanálisis',
  bodywork: 'Bioenergética',
  social_context: 'Psicología Individual de Adler',
  gestalt_activity: 'Terapia Gestalt',
  exposure: 'Terapia Conductual',
};

const PHASE_LABELS: Record<ExplorationPhase, string> = {
  exploring: 'Explorando',
  deepening: 'Profundizando',
  pattern_linking: 'Conectando patrones',
  challenging: 'Examinando creencias',
  insight: 'Algo emergió',
  consolidating: 'Integrando',
};

const MIN_TURNS_TO_END = 3;

export function StageExploration({ session, patient, priorSessions = [], onAdvance, onUpdate: _onUpdate }: Props) {
  const shouldReduce = useReducedMotion();
  const stage3Type = (session.stage3Type ?? 'memories') as Stage3Type;
  const frameworkKey = STAGE3_TO_FRAMEWORK[stage3Type];
  const frameworkName = session.frameworkMatches[0]?.name ?? FRAMEWORK_NAMES[stage3Type];

  const workCard = session.selectedWorkCard ?? {
    id: '0',
    title: session.conflicts[0]?.synthesized ?? 'Lo que te trajo aquí',
    subtitle: session.conflicts[0]?.synthesized ?? 'Lo que te trajo aquí',
    openingLine: '¿Qué es lo primero que surge cuando piensas en lo que compartiste?',
  };

  // Conversation state
  const [messages, setMessages] = useState<Message[]>([
    { role: 'therapist', text: workCard.openingLine },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<ExplorationPhase>('exploring');

  // Synthesis + action step
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);
  const [showActionStep, setShowActionStep] = useState(false);
  const [actionInput, setActionInput] = useState('');

  // Interpretation (merged from Stage 4)
  const [interpretationPhase, setInterpretationPhase] = useState<'hidden' | 'consent' | 'pause' | 'generating' | 'done'>('hidden');
  const [fullInterpretation, setFullInterpretation] = useState<Interpretation | null>(null);
  const [resonated, setResonated] = useState(false);
  const [showRing, setShowRing] = useState(false);
  const { text: streamText, isStreaming, isDone: streamDone, startStream } = useAIStream();

  // Voice
  const {
    isVoiceMode, isRecording, isTranscribing, isSpeaking, transcribedText, voiceError,
    toggleVoiceMode, startRecording, stopRecording, speak, cancelSpeech, clearTranscribedText,
  } = useVoice();

  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const lastMessage = messages[messages.length - 1];
  const awaitingPatient = lastMessage?.role === 'therapist' && !showActionStep && synthesisState === 'idle';
  const canEndEarly = patientTurns >= MIN_TURNS_TO_END && !isThinking;

  const lastExploration = [...priorSessions].reverse().find(s => s.explorationRecord)?.explorationRecord;
  const lastActionCommitment = lastExploration?.actionCommitment;
  const lastTherapistMsg = [...messages].reverse().find(m => m.role === 'therapist');

  // Auto-scroll
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
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
        setShowActionStep(true);
      }
    } catch {
      setIsThinking(false);
      setShowActionStep(true);
    }
  };

  const handleEndEarly = () => setShowActionStep(true);

  const handleActionCommit = () => {
    const commitment = actionInput.trim();
    handleSynthesize(messages, commitment);
  };

  const handleSkipAction = () => handleSynthesize(messages, '');

  const handleSynthesize = async (finalMessages: Message[], commitment: string) => {
    setSynthesisState('loading');
    setShowActionStep(false);
    const rawData = [
      finalMessages
        .map(m => `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`)
        .join('\n\n'),
      commitment ? `\nCompromiso de acción del paciente: "${commitment}"` : '',
    ].join('');

    try {
      const priorExplorations = priorSessions.filter(s => s.explorationRecord).map(s => s.explorationRecord!);
      const record = await synthesizeExploration({
        rawData, patient, conflicts: session.conflicts,
        frameworkKey, frameworkName, stage3Type,
        sessionNumber: session.sessionNumber, priorExplorations,
      });
      setExplorationRecord({ ...record, actionCommitment: commitment || undefined });
      setSynthesisState('done');
    } catch {
      setSynthesisState('idle');
      onAdvance(
        { sessionNumber: session.sessionNumber, framework: frameworkKey, frameworkName, stage3Type, insights: [], aiReflection: '', completedAt: Date.now(), actionCommitment: commitment || undefined },
        { text: '', groundingSources: [] },
      );
    }
  };

  const generateInterp = async () => {
    setInterpretationPhase('generating');
    setFullInterpretation(null);
    try {
      const result = await generateInterpretation({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        memories: session.memories,
        patient,
        lifeChanges: session.lifeChanges,
        explorationRecord: explorationRecord ?? undefined,
        priorSessions,
      });
      setFullInterpretation(result);
      startStream(result.text);
      setInterpretationPhase('done');
    } catch {
      onAdvance(explorationRecord!, { text: '', groundingSources: [] });
    }
  };

  const handleResonate = () => {
    if (!fullInterpretation) return;
    setResonated(true);
    setShowRing(true);
    setTimeout(() => setShowRing(false), 600);
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
            Fase 3 — {frameworkName}
          </p>
          {synthesisState === 'idle' && (
            <AnimatePresence mode="wait">
              <motion.span
                key={currentPhase}
                initial={shouldReduce ? {} : { opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduce ? {} : { opacity: 0, x: -6 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600,
                  color: currentPhase === 'insight' ? 'var(--color-violet)' : 'var(--color-sage)',
                  padding: '0.125rem 0.5rem', borderRadius: '9999px',
                  background: currentPhase === 'insight' ? 'rgba(107,94,158,0.1)' : 'rgba(61,107,71,0.08)',
                }}
              >
                {PHASE_LABELS[currentPhase]}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4.5vw, 42px)', color: 'var(--color-deep)', lineHeight: 1.1, margin: 0 }}>
          Exploración
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
                Tu compromiso de la sesión anterior
              </p>
              <p style={{ color: 'var(--color-deep)', fontSize: '0.875rem', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                "{lastActionCommitment}"
              </p>
            </div>
          )}
          {lastExploration.insights.length > 0 && (
            <div style={{ padding: '0.75rem 1rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.7rem', fontWeight: 500, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lo explorado en la sesión {lastExploration.sessionNumber}
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
          <AIThinking phrases={['Integrando lo explorado...', 'Encontrando los hilos...', 'Construyendo el mapa terapéutico...']} />
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
              Lo que emergió en esta exploración
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
                  Estas piezas se acumulan sesión a sesión para que la IA te entienda mejor
                </p>
              </div>
            )}
            {explorationRecord.actionCommitment && (
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(107,94,158,0.15)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)', fontSize: '0.7rem', fontWeight: 600, margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tu compromiso para esta semana
                </p>
                <p style={{ color: 'var(--color-deep)', fontSize: '0.9375rem', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                  "{explorationRecord.actionCommitment}"
                </p>
              </div>
            )}
          </div>
          {interpretationPhase === 'hidden' && (
            <motion.button
              type="button"
              onClick={() => setInterpretationPhase('consent')}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{ background: 'var(--color-violet)', color: 'white', border: 'none', borderRadius: 'var(--radius-inner)', padding: '1rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-card)', alignSelf: 'stretch', textAlign: 'center' }}
            >
              Recibir la interpretación →
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Interpretation — consent gate */}
      {synthesisState === 'done' && interpretationPhase === 'consent' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '1.0625rem', lineHeight: 1.5, margin: 0 }}>
            He escuchado toda tu exploración. Tengo algo para ti antes de cerrar.
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
            Es una interpretación de lo que veo en tu historia de hoy. ¿La lees?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
            <motion.button type="button" onClick={generateInterp} whileTap={shouldReduce ? {} : { scale: 0.97 }} style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-inner)', background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              Quiero leerla
            </motion.button>
            <motion.button type="button" onClick={() => setInterpretationPhase('pause')} whileTap={shouldReduce ? {} : { scale: 0.98 }} style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-inner)', background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '0.875rem', cursor: 'pointer' }}>
              Dame un momento
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Interpretation — pause mode */}
      {synthesisState === 'done' && interpretationPhase === 'pause' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}
        >
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
            Tómate el tiempo que necesites. Aquí estaré.
          </p>
          <motion.button type="button" onClick={generateInterp} whileTap={shouldReduce ? {} : { scale: 0.97 }} style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-inner)', background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Cuando quieras
          </motion.button>
        </motion.div>
      )}

      {/* Interpretation — generating */}
      {synthesisState === 'done' && interpretationPhase === 'generating' && (
        <motion.div initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '0.5rem' }}>
          <AIThinking phrases={['Escuchando todo lo que compartiste...', 'Conectando perspectivas...', 'Formulando algo para ti...']} />
        </motion.div>
      )}

      {/* Interpretation — streaming + done */}
      {synthesisState === 'done' && interpretationPhase === 'done' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tu historia vista con claridad
            </p>
            <AICard sources={[]}>
              <p style={{ lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
                {shouldReduce ? (fullInterpretation?.text ?? '') : streamText}
                {isStreaming && !shouldReduce && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    style={{ color: 'var(--color-sage)', marginLeft: 1 }}
                  >|</motion.span>
                )}
              </p>
            </AICard>
          </div>

          {(streamDone || shouldReduce) && (
            <>
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <motion.button
                    type="button"
                    onClick={handleResonate}
                    disabled={resonated}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '9999px', fontSize: '0.8125rem', background: resonated ? 'var(--color-terracotta)' : 'var(--color-surface)', color: resonated ? 'white' : 'var(--color-muted)', border: 'none', cursor: resonated ? 'default' : 'pointer', boxShadow: 'var(--shadow-card)', transition: 'all 0.2s ease' }}
                  >
                    <motion.span animate={resonated && !shouldReduce ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
                      <Heart size={14} weight={resonated ? 'fill' : 'regular'} />
                    </motion.span>
                    {resonated ? 'Me resuena' : 'Esto me resuena'}
                  </motion.button>
                  <AnimatePresence>
                    {showRing && !shouldReduce && (
                      <motion.div
                        style={{ position: 'absolute', inset: 0, borderRadius: '9999px', border: '2px solid var(--color-terracotta)', pointerEvents: 'none' }}
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{}}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  type="button"
                  onClick={generateInterp}
                  whileTap={shouldReduce ? {} : { scale: 0.98 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '9999px', fontSize: '0.8125rem', background: 'var(--color-surface)', color: 'var(--color-muted)', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
                >
                  <ArrowCounterClockwise size={14} />
                  Ver desde otro ángulo
                </motion.button>
              </div>

              <motion.button
                type="button"
                onClick={() => onAdvance(explorationRecord!, fullInterpretation ?? { text: '', groundingSources: [] })}
                initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)', color: 'white', border: 'none', borderRadius: 'var(--radius-inner)', padding: '1rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'stretch', textAlign: 'center' }}
              >
                Cerrar esta exploración →
              </motion.button>
            </>
          )}
        </motion.div>
      )}

      {/* Active conversation */}
      {synthesisState === 'idle' && !showActionStep && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Thin progress line (phase-based, no fixed max) */}
          <div style={{ height: '2px', borderRadius: '9999px', background: 'var(--color-border)', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: '9999px', background: currentPhase === 'insight' ? 'var(--color-violet)' : 'var(--color-sage)' }}
              animate={{
                width: `${Math.round({ exploring: 10, deepening: 30, pattern_linking: 50, challenging: 65, insight: 80, consolidating: 92 }[currentPhase] ?? 10)}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {/* Conversation history */}
          {messages.length > 1 && (
            <div ref={historyRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '380px', overflowY: 'auto' }}>
              {messages.slice(0, awaitingPatient ? -1 : messages.length).map((msg, i) => {
                if (msg.isInsight && msg.role === 'therapist') {
                  return (
                    <motion.div
                      key={i}
                      initial={shouldReduce ? {} : { opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.08)', border: '1px solid rgba(107,94,158,0.2)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
                    >
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-violet)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Algo emergió ✦
                      </p>
                      <p style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '1rem', lineHeight: 1.55, margin: 0 }}>
                        {msg.text}
                      </p>
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key={i}
                    initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                  >
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 500, color: msg.role === 'therapist' ? 'var(--color-violet)' : 'var(--color-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {msg.role === 'therapist' ? 'Terapeuta' : 'Tú'}
                    </p>
                    <p style={{ color: msg.role === 'therapist' ? 'var(--color-deep)' : 'var(--color-muted)', fontSize: msg.role === 'therapist' ? '0.9375rem' : '0.875rem', lineHeight: 1.6, margin: 0, fontStyle: msg.role === 'patient' ? 'italic' : 'normal', paddingLeft: msg.role === 'therapist' ? '0.75rem' : '0', borderLeft: msg.role === 'therapist' ? '2px solid rgba(107,94,158,0.25)' : 'none' }}>
                      {msg.text}
                    </p>
                  </motion.div>
                );
              })}
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
                {lastMessage.isInsight ? (
                  <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.08)', border: '1px solid rgba(107,94,158,0.2)' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-violet)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Algo emergió ✦
                    </p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)', color: 'var(--color-deep)', lineHeight: 1.45, margin: 0 }}>
                      {lastMessage.text}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)', color: 'var(--color-deep)', lineHeight: 1.45, margin: 0 }}>
                    {lastMessage.text}
                  </p>
                )}

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
                  <VoiceMicButton
                    isRecording={isRecording}
                    isTranscribing={isTranscribing}
                    pendingText={transcribedText}
                    onStart={startRecording}
                    onStop={stopRecording}
                  />
                ) : (
                  <>
                    <textarea
                      ref={inputRef}
                      key={`input-${messages.length}`}
                      value={currentInput}
                      onChange={e => setCurrentInput(e.target.value)}
                      placeholder={lastMessage.isInsight ? 'Tómate el tiempo que necesites...' : 'Escribe lo que surge...'}
                      rows={4}
                      style={textareaStyle}
                      onFocus={e => (e.target.style.borderColor = lastMessage.isInsight ? 'var(--color-violet)' : 'var(--color-sage)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && currentInput.trim().length >= 5) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                    <AnimatePresence>
                      {currentInput.trim().length >= 5 && (
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
                            fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start',
                          }}
                        >
                          Enviar
                        </motion.button>
                      )}
                    </AnimatePresence>
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
              <AIThinking phrases={['Escuchando...', 'Procesando lo que compartiste...', 'Preparando la siguiente pregunta...']} />
            </motion.div>
          )}

          {/* Patient-controlled early end */}
          <AnimatePresence>
            {canEndEarly && awaitingPatient && !isThinking && (
              <motion.div
                initial={shouldReduce ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduce ? {} : { opacity: 0 }}
                style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}
              >
                <button
                  type="button"
                  onClick={handleEndEarly}
                  style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.5rem 1rem', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                >
                  Siento que llegué a algo — quiero integrar aquí
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action step — micro-experiment */}
      <AnimatePresence>
        {showActionStep && (
          <motion.div
            initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduce ? {} : { opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-card)', background: 'rgba(61,107,71,0.06)', border: '1px solid rgba(61,107,71,0.18)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)', fontSize: '0.7rem', fontWeight: 600, margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Un paso concreto
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'var(--color-deep)', lineHeight: 1.45, margin: '0 0 0.5rem' }}>
                Dado lo que notaste hoy sobre <em>{workCard.title.toLowerCase()}</em>, ¿hay algo concreto y pequeño que quieras intentar esta semana?
              </p>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', margin: 0, lineHeight: 1.5 }}>
                No tiene que ser un gran cambio — un experimento que puedas observar.
              </p>
            </div>

            <textarea
              value={actionInput}
              onChange={e => setActionInput(e.target.value)}
              placeholder="Esta semana voy a..."
              autoFocus
              rows={3}
              style={textareaStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <AnimatePresence>
                {actionInput.trim().length >= 5 && (
                  <motion.button
                    type="button"
                    onClick={handleActionCommit}
                    initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduce ? {} : { opacity: 0 }}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)', color: 'white', border: 'none', borderRadius: 'var(--radius-inner)', padding: '0.9375rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'stretch', textAlign: 'center' }}
                  >
                    Me comprometo a intentarlo →
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={handleSkipAction}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.5rem', textAlign: 'center' }}
              >
                Continuar sin compromiso
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating voice/speaker toggle */}
      {synthesisState === 'idle' && !showActionStep && (
        <div style={{ position: 'fixed', bottom: '5.5rem', right: '1.25rem', zIndex: 40, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <motion.button
            type="button"
            onClick={() => { toggleVoiceMode(); if (isSpeaking) cancelSpeech(); }}
            whileTap={shouldReduce ? {} : { scale: 0.9 }}
            style={{
              width: '2.5rem', height: '2.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isVoiceMode ? 'var(--color-sage)' : 'var(--color-surface)',
              color: isVoiceMode ? 'white' : 'var(--color-muted)',
              border: isVoiceMode ? 'none' : '1px solid var(--color-border)',
              cursor: 'pointer', boxShadow: 'var(--shadow-card)',
            }}
            aria-label={isVoiceMode ? 'Desactivar modo de voz' : 'Activar modo de voz'}
            aria-pressed={isVoiceMode}
          >
            {isVoiceMode ? <SpeakerHigh size={18} aria-hidden /> : <SpeakerSlash size={18} aria-hidden />}
          </motion.button>
        </div>
      )}
    </div>
  );
}
