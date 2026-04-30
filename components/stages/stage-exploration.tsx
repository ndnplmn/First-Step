'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, ExplorationRecord, Stage3Type, FrameworkKey } from '@/lib/types';
import { getExplorationResponse, synthesizeExploration } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';

type Message = { role: 'patient' | 'therapist'; text: string };

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

const MAX_TURNS = 5;

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
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);

  const historyRef = useRef<HTMLDivElement>(null);

  const patientTurns = messages.filter(m => m.role === 'patient').length;
  const lastMessage = messages[messages.length - 1];
  const awaitingPatient = lastMessage?.role === 'therapist';

  const lastExploration = [...priorSessions]
    .reverse()
    .find(s => s.explorationRecord)?.explorationRecord;

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

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
        priorSessions,
      });

      if (result.done) {
        const withClosing: Message[] = [
          ...updatedMessages,
          { role: 'therapist', text: result.response },
        ];
        setMessages(withClosing);
        setIsThinking(false);
        await handleSynthesize(withClosing);
      } else {
        setMessages(prev => [...prev, { role: 'therapist', text: result.response }]);
        setIsThinking(false);
      }
    } catch {
      setIsThinking(false);
      await handleSynthesize(updatedMessages);
    }
  };

  const handleSynthesize = async (finalMessages: Message[]) => {
    setSynthesisState('loading');
    const rawData = finalMessages
      .map(m => `${m.role === 'therapist' ? 'Terapeuta' : 'Paciente'}: ${m.text}`)
      .join('\n\n');
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
      setExplorationRecord(record);
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

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Fase 3 — {frameworkName}
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 4.5vw, 42px)',
            color: 'var(--color-deep)',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Exploración
        </h2>
      </div>

      {/* Prior session continuity */}
      {lastExploration && lastExploration.insights.length > 0 && synthesisState === 'idle' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-card)', background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)' }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet)', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            Lo que exploramos en la sesión {lastExploration.sessionNumber}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
            {lastExploration.insights.map(i => (
              <span key={i.theme} style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}>
                {i.theme}
              </span>
            ))}
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
            {lastExploration.aiReflection}
          </p>
        </motion.div>
      )}

      {/* Synthesis loading */}
      {synthesisState === 'loading' && (
        <motion.div initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '2rem' }}>
          <AIThinking phrases={['Integrando lo explorado...', 'Encontrando los hilos...', 'Construyendo el mapa...']} />
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

      {/* Conversation */}
      {synthesisState === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {Array.from({ length: MAX_TURNS }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: '2px',
                  flex: 1,
                  borderRadius: '9999px',
                  background: i < patientTurns ? 'var(--color-sage)' : 'var(--color-border)',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Conversation history (past exchanges) */}
          {messages.length > 1 && (
            <div ref={historyRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '320px', overflowY: 'auto' }}>
              {messages.slice(0, awaitingPatient ? -1 : messages.length).map((msg, i) => (
                <motion.div
                  key={i}
                  initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      color: msg.role === 'therapist' ? 'var(--color-violet)' : 'var(--color-muted)',
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {msg.role === 'therapist' ? 'Terapeuta' : 'Tú'}
                  </p>
                  <p
                    style={{
                      color: msg.role === 'therapist' ? 'var(--color-deep)' : 'var(--color-muted)',
                      fontSize: msg.role === 'therapist' ? '0.9375rem' : '0.875rem',
                      lineHeight: 1.6,
                      margin: 0,
                      fontStyle: msg.role === 'patient' ? 'italic' : 'normal',
                      paddingLeft: msg.role === 'therapist' ? '0.75rem' : '0',
                      borderLeft: msg.role === 'therapist' ? '2px solid rgba(107,94,158,0.3)' : 'none',
                    }}
                  >
                    {msg.text}
                  </p>
                </motion.div>
              ))}
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
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                    color: 'var(--color-deep)',
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  {lastMessage.text}
                </p>

                <textarea
                  key={`input-${messages.length}`}
                  value={currentInput}
                  onChange={e => setCurrentInput(e.target.value)}
                  placeholder="Escribe lo que surge..."
                  autoFocus
                  rows={4}
                  style={textareaStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
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
                        background: 'var(--color-sage)',
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

          {/* AI thinking after patient submits */}
          {isThinking && (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: '0.5rem' }}
            >
              <AIThinking
                phrases={[
                  'Escuchando...',
                  'Procesando lo que compartiste...',
                  'Preparando la siguiente pregunta...',
                ]}
              />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
