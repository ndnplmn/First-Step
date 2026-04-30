'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, ExplorationRecord, ExplorationPhase, Stage3Type, FrameworkKey } from '@/lib/types';
import { getExplorationResponse, synthesizeExploration } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';

type Message = { role: 'patient' | 'therapist'; text: string; isInsight?: boolean };

type Props = {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
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

const PHASE_ORDER: ExplorationPhase[] = [
  'exploring', 'deepening', 'pattern_linking', 'challenging', 'insight', 'consolidating',
];

const MAX_PATIENT_TURNS = 10;

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

  const [messages, setMessages] = useState<Message[]>([
    { role: 'therapist', text: workCard.openingLine },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<ExplorationPhase>('exploring');
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);
  // Action step state
  const [showActionStep, setShowActionStep] = useState(false);
  const [actionInput, setActionInput] = useState('');
  const [actionCommitment, setActionCommitment] = useState('');

  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const lastMessage = messages[messages.length - 1];
  const awaitingPatient = lastMessage?.role === 'therapist' && !showActionStep;

  const lastExploration = [...priorSessions]
    .reverse()
    .find(s => s.explorationRecord)?.explorationRecord;

  const lastActionCommitment = lastExploration?.actionCommitment;

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (awaitingPatient && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [awaitingPatient, messages.length]);

  const handleSubmit = async () => {
    const trimmed = currentInput.trim();
    if (!trimmed || isThinking) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: 'patient', text: trimmed },
    ];
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

      if (result.done) {
        setMessages(prev => [...prev, therapistMessage]);
        setIsThinking(false);
        // Show action step before synthesis
        setShowActionStep(true);
      } else {
        setMessages(prev => [...prev, therapistMessage]);
        setIsThinking(false);
      }
    } catch {
      setIsThinking(false);
      setShowActionStep(true);
    }
  };

  const handleActionCommit = () => {
    const commitment = actionInput.trim();
    setActionCommitment(commitment);
    handleSynthesize(messages, commitment);
  };

  const handleSkipAction = () => {
    handleSynthesize(messages, '');
  };

  const handleSynthesize = async (finalMessages: Message[], commitment: string) => {
    setSynthesisState('loading');
    setShowActionStep(false);
    const rawData = [
      finalMessages
        .map(m => `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`)
        .join('\n\n'),
      commitment ? `\nCompromiso de acción elegido por el paciente: "${commitment}"` : '',
    ].join('');

    try {
      const priorExplorations = priorSessions
        .filter(s => s.explorationRecord)
        .map(s => s.explorationRecord!);
      const record = await synthesizeExploration({
        rawData,
        patient,
        conflicts: session.conflicts,
        frameworkKey,
        frameworkName,
        stage3Type,
        sessionNumber: session.sessionNumber,
        priorExplorations,
      });
      setExplorationRecord({ ...record, actionCommitment: commitment || undefined });
      setSynthesisState('done');
    } catch {
      setSynthesisState('idle');
      onAdvance({
        sessionNumber: session.sessionNumber,
        framework: frameworkKey,
        frameworkName,
        stage3Type,
        insights: [],
        aiReflection: '',
        completedAt: Date.now(),
        actionCommitment: commitment || undefined,
      });
    }
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    outline: 'none',
    resize: 'none',
    padding: '1rem',
    borderRadius: 'var(--radius-inner)',
    border: '2px solid var(--color-border)',
    color: 'var(--color-deep)',
    fontSize: '1rem',
    lineHeight: 1.6,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
  };

  const stepVariants = {
    initial: shouldReduce ? {} : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduce ? {} : { opacity: 0, y: -8 },
  };
  const transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

  // Phase progress: index of current phase in the linear order (insight overlaps challenging)
  const phaseIndex = PHASE_ORDER.indexOf(currentPhase === 'insight' ? 'challenging' : currentPhase);
  const progressFraction = Math.max(patientTurns / MAX_PATIENT_TURNS, (phaseIndex + 1) / PHASE_ORDER.length);

  return (
    <div style={{ paddingBottom: '3rem' }}>
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
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: currentPhase === 'insight' ? 'var(--color-violet)' : 'var(--color-sage)',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  background: currentPhase === 'insight'
                    ? 'rgba(107,94,158,0.1)'
                    : 'rgba(61,107,71,0.08)',
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
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

      {/* Synthesis done — result card */}
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
          <motion.button
            type="button"
            onClick={() => onAdvance(explorationRecord)}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            style={{ background: 'var(--color-violet)', color: 'white', border: 'none', borderRadius: 'var(--radius-inner)', padding: '1rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-card)', alignSelf: 'stretch', textAlign: 'center' }}
          >
            Continuar a la interpretación →
          </motion.button>
        </motion.div>
      )}

      {/* Active conversation */}
      {synthesisState === 'idle' && !showActionStep && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Phase progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ height: '2px', borderRadius: '9999px', background: 'var(--color-border)', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: currentPhase === 'insight' ? 'var(--color-violet)' : 'var(--color-sage)', borderRadius: '9999px' }}
                initial={{ width: '5%' }}
                animate={{ width: `${Math.round(progressFraction * 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Conversation history */}
          {messages.length > 1 && (
            <div ref={historyRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '360px', overflowY: 'auto' }}>
              {messages.slice(0, awaitingPatient ? -1 : messages.length).map((msg, i) => {
                if (msg.isInsight && msg.role === 'therapist') {
                  return (
                    <motion.div
                      key={i}
                      initial={shouldReduce ? {} : { opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-card)',
                        background: 'rgba(107,94,158,0.08)',
                        border: '1px solid rgba(107,94,158,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem',
                      }}
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
                    <p style={{
                      color: msg.role === 'therapist' ? 'var(--color-deep)' : 'var(--color-muted)',
                      fontSize: msg.role === 'therapist' ? '0.9375rem' : '0.875rem',
                      lineHeight: 1.6,
                      margin: 0,
                      fontStyle: msg.role === 'patient' ? 'italic' : 'normal',
                      paddingLeft: msg.role === 'therapist' ? '0.75rem' : '0',
                      borderLeft: msg.role === 'therapist' ? '2px solid rgba(107,94,158,0.25)' : 'none',
                    }}>
                      {msg.text}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Current therapist question */}
          <AnimatePresence mode="wait">
            {awaitingPatient && (
              <motion.div
                key={`q-${messages.length}`}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                {/* Insight moment special treatment */}
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
                  {currentInput.trim().length >= 5 && !isThinking && (
                    <motion.button
                      type="button"
                      onClick={handleSubmit}
                      initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduce ? {} : { opacity: 0 }}
                      whileTap={shouldReduce ? {} : { scale: 0.97 }}
                      style={{
                        background: lastMessage.isInsight ? 'var(--color-violet)' : 'var(--color-sage)',
                        boxShadow: 'var(--shadow-glow-sage)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-inner)',
                        padding: '0.875rem 1.5rem',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                      }}
                    >
                      Enviar
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI thinking */}
          {isThinking && (
            <motion.div initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '0.5rem' }}>
              <AIThinking phrases={['Escuchando...', 'Procesando lo que compartiste...', 'Preparando la siguiente pregunta...']} />
            </motion.div>
          )}
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
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.0625rem, 2vw, 1.25rem)', color: 'var(--color-deep)', lineHeight: 1.45, margin: '0 0 0.5rem' }}>
                Dado lo que notaste hoy sobre <em>{workCard.title.toLowerCase()}</em>, ¿hay algo concreto y pequeño que quieras intentar antes de que volvamos a encontrarnos?
              </p>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', margin: 0, lineHeight: 1.5 }}>
                No tiene que ser un gran cambio. Un experimento pequeño que puedas observar.
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
                    style={{
                      background: 'var(--color-sage)',
                      boxShadow: 'var(--shadow-glow-sage)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-inner)',
                      padding: '0.9375rem 1.5rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      alignSelf: 'stretch',
                      textAlign: 'center',
                    }}
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
    </div>
  );
}
