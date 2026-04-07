'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Conflict, FrameworkMatch, GestaltActivity, Stage3Type } from '@/lib/types';
import { synthesizeConflicts, getNextTherapistQuestion } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowRight } from '@phosphor-icons/react';

const STARTER_PROMPTS = [
  'Algo con mi familia me preocupa',
  'El trabajo me está agobiando mucho',
  'No sé qué hacer con mi vida',
];


type MessageRole = 'patient' | 'therapist';
type Message = { role: MessageRole; text: string; isReflection?: boolean };

interface StageConflictsProps {
  session: PatientSession;
  patient: Patient;
  onAdvance: (conflicts: Conflict[], frameworkMatches: FrameworkMatch[], gestaltActivity: GestaltActivity | null, unmappedPhrases: string[], narrativeSummary: string, stage3Type: Stage3Type) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

function UnmappedSection({ unmapped }: { unmapped: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-xl overflow-hidden" style={{ border: '1px dashed var(--color-border)' }}
    >
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
          Pendiente de análisis ({unmapped.length})
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'var(--color-muted)' }}>▾</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                Estas frases no encajaron claramente en un patrón. Puedes explorarlas más adelante.
              </p>
              {unmapped.map((phrase, i) => (
                <p key={i} className="text-sm px-3 py-2 rounded-lg italic"
                  style={{ color: 'var(--color-muted)', background: 'var(--color-surface)' }}>
                  &ldquo;{phrase}&rdquo;
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StageConflicts({ session, patient, onAdvance, onUpdate }: StageConflictsProps) {
  const shouldReduce = useReducedMotion();
  const hasExistingData = session.conflicts.length > 0 && session.frameworkMatches.length > 0;

  // ─── Estado conversacional ────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [skipsInARow, setSkipsInARow] = useState(0);
  const [showBridge, setShowBridge] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(!!hasExistingData);

  // Análisis final
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    conflicts: Conflict[];
    frameworkMatches: FrameworkMatch[];
    gestaltActivity: GestaltActivity | null;
    stage3Type: Stage3Type;
    unmappedPhrases: string[];
    narrativeSummary: string;
  } | null>(
    hasExistingData
      ? { conflicts: session.conflicts, frameworkMatches: session.frameworkMatches, gestaltActivity: session.gestaltActivity ?? null, stage3Type: 'memories', unmappedPhrases: session.unmappedPhrases.map(u => u.text), narrativeSummary: session.narrativeSummary ?? '' }
      : null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isEvaluating]);

  // Extraer todos los inputs del paciente del historial
  const getPatientInputs = (msgs: Message[]) =>
    msgs.filter(m => m.role === 'patient').map(m => m.text);

  // ─── Enviar mensaje (tanto inicial como follow-up) ────────────────
  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 5) return;

    const newMessages: Message[] = [...messages, { role: 'patient', text: trimmed }];
    setMessages(newMessages);
    setInput('');
    setSkipsInARow(0);

    const patientInputs = getPatientInputs(newMessages);

    // Evaluar si la IA necesita más info
    setIsEvaluating(true);
    try {
      const { done, question, reflection, bridgeMessage: bridgeMsg } = await getNextTherapistQuestion({
        allInputs: patientInputs,
        questionsAsked,
        patient,
        lifeChanges: session.lifeChanges,
        sessionIntention: session.sessionIntention,
      });

      if (done || !question) {
        if (bridgeMsg) {
          setMessages(prev => [...prev, { role: 'therapist', text: bridgeMsg }]);
          setShowBridge(true);
        } else {
          goToAnalysis(patientInputs);
        }
      } else {
        const newMsgs: Message[] = [];
        if (reflection) {
          newMsgs.push({ role: 'therapist', text: reflection, isReflection: true });
        }
        newMsgs.push({ role: 'therapist', text: question });
        setMessages(prev => [...prev, ...newMsgs]);
        setQuestionsAsked(prev => [...prev, question]);
      }
    } catch {
      goToAnalysis(patientInputs);
    } finally {
      setIsEvaluating(false);
      // Refocus the textarea after evaluation
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleSkip = async () => {
    const newSkips = skipsInARow + 1;
    setSkipsInARow(newSkips);

    if (newSkips >= 3) {
      goToAnalysis(getPatientInputs(messages));
      return;
    }

    const patientInputs = getPatientInputs(messages);

    setIsEvaluating(true);
    try {
      const { done, question, reflection, bridgeMessage: bridgeMsg } = await getNextTherapistQuestion({
        allInputs: patientInputs,
        questionsAsked,
        patient,
        lifeChanges: session.lifeChanges,
        sessionIntention: session.sessionIntention,
      });
      if (done || !question) {
        if (bridgeMsg) {
          setMessages(prev => [...prev, { role: 'therapist', text: bridgeMsg }]);
          setShowBridge(true);
        } else {
          goToAnalysis(patientInputs);
        }
      } else {
        const newMsgs: Message[] = [];
        if (reflection) {
          newMsgs.push({ role: 'therapist', text: reflection, isReflection: true });
        }
        newMsgs.push({ role: 'therapist', text: question });
        setMessages(prev => [...prev, ...newMsgs]);
        setQuestionsAsked(prev => [...prev, question]);
      }
    } catch {
      goToAnalysis(patientInputs);
    } finally {
      setIsEvaluating(false);
    }
  };

  // ─── Análisis final ───────────────────────────────────────────────
  const goToAnalysis = async (inputs: string[]) => {
    setShowBridge(false);
    setShowAnalysis(true);
    setIsAnalyzing(true);
    setError('');
    try {
      const data = await synthesizeConflicts(inputs, patient, session.lifeChanges, session.sessionIntention);
      setResult(data);
      onUpdate({ conflicts: data.conflicts, frameworkMatches: data.frameworkMatches, gestaltActivity: data.gestaltActivity, narrativeSummary: data.narrativeSummary });
    } catch {
      setError('Hubo un problema al analizar. Intenta de nuevo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reanalyze = () => goToAnalysis(getPatientInputs(messages));

  const handleContinueDeep = () => {
    setShowBridge(false);
    setSkipsInARow(0);
  };

  // ─── Helpers de estado ────────────────────────────────────────────
  const isConversing = messages.length > 0 && !showAnalysis;
  const lastMessageIsTherapist = messages.length > 0 && messages[messages.length - 1].role === 'therapist';
  const hasStarted = messages.length > 0;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-48">

      {/* Header */}
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 2 — Conflictos
        </p>
        <AnimatePresence mode="wait">
          {!showAnalysis && (
            <motion.div key="h-converse"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                {hasStarted ? 'Cuéntame más' : '¿Qué te trajo\naquí hoy?'}
              </h2>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {hasStarted
                  ? 'Necesito entenderte mejor para poder ayudarte como mereces.'
                  : 'Descríbelo con tus propias palabras. Puedes escribir tanto como quieras.'}
              </p>
            </motion.div>
          )}
          {showAnalysis && (
            <motion.div key="h-analysis"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                Lo que escuché
              </h2>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Esto es lo que percibo en todo lo que compartiste.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Starter prompts (solo si no ha empezado) ─── */}
      <AnimatePresence>
        {!hasStarted && !input && (
          <motion.div key="starters" className="flex flex-wrap gap-2"
            initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            {STARTER_PROMPTS.map(p => (
              <button key={p} type="button" onClick={() => setInput(p)}
                className="px-3.5 py-2 rounded-full text-sm transition-all"
                style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}>
                {p}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hilo conversacional ─── */}
      {messages.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {messages.map((msg, i) => (
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
                      ...(msg.isReflection ? { fontStyle: 'italic', color: 'var(--color-muted)' } : {}),
                    }}>
                    {msg.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ─── Evaluando ─── */}
      {isEvaluating && (
        <AIThinking phrases={['Procesando lo que compartiste...', 'Decidiendo si necesito saber más...', 'Un momento...']} />
      )}

      {/* ─── Textarea (siempre visible mientras no estamos en análisis) ─── */}
      <AnimatePresence>
        {!showAnalysis && !isEvaluating && !showBridge && (
          <motion.div key="textarea-area"
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="space-y-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && input.trim().length >= 5) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder={hasStarted ? 'Escribe tu respuesta aquí…' : 'Escribe lo que sientes, lo que te pasa…'}
              rows={hasStarted ? 3 : 4}
              autoFocus
              className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = isConversing ? 'var(--color-terracotta)' : 'var(--color-sage)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Análisis ─── */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div key="phase-analysis"
            initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-6">
            {isAnalyzing && (
              <AIThinking phrases={['Leyendo entre líneas...', 'Identificando patrones...', 'Conectando con tu historia...']} />
            )}
            {error && !isAnalyzing && (
              <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>{error}</p>
            )}
            {result && !isAnalyzing && (
              <>
                <AICard>
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                      Esto es lo que escucho en lo que describes:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.conflicts.map(c => (
                        <span key={c.id} className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                          style={{ background: 'var(--color-sage)' }}>
                          {c.synthesized}
                        </span>
                      ))}
                    </div>
                    {result.narrativeSummary && (
                      <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                          {result.narrativeSummary}
                        </p>
                      </div>
                    )}
                  </div>
                </AICard>
                {result.unmappedPhrases.length > 0 && <UnmappedSection unmapped={result.unmappedPhrases} />}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FloatingBar ─── */}
      <FloatingBar visible={true}>
        <div className="space-y-3">

          {/* Enviar mensaje */}
          {!showAnalysis && !isEvaluating && !showBridge && (
            <>
              <motion.button type="button"
                onClick={() => handleSend(input)}
                disabled={input.trim().length < 5}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 tracking-wide"
                style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}>
                {hasStarted ? <>Responder <ArrowRight size={16} /></> : 'Compartir →'}
              </motion.button>
              {lastMessageIsTherapist && (
                <button type="button" onClick={handleSkip}
                  className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-muted)' }}>
                  → Prefiero no responder esto
                </button>
              )}
            </>
          )}

          {/* Mensaje puente */}
          {showBridge && !isEvaluating && (
            <>
              <motion.button
                type="button"
                onClick={() => goToAnalysis(getPatientInputs(messages))}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 tracking-wide"
                style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
              >
                Estoy listo/a para continuar <ArrowRight size={16} />
              </motion.button>
              <button
                type="button"
                onClick={handleContinueDeep}
                className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-muted)' }}
              >
                → Quiero profundizar en algo
              </button>
            </>
          )}

          {/* Análisis listo */}
          {showAnalysis && result && !isAnalyzing && (
            <>
              <motion.button type="button" onClick={reanalyze}
                whileTap={shouldReduce ? {} : { scale: 0.98 }}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ color: 'var(--color-sage)', border: '1px solid var(--color-sage)' }}>
                Re-analizar
              </motion.button>
              <motion.button type="button"
                onClick={() => onAdvance(result.conflicts, result.frameworkMatches, result.gestaltActivity, result.unmappedPhrases, result.narrativeSummary, result.stage3Type)}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
                style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}>
                Continuar a recuerdos →
              </motion.button>
            </>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
