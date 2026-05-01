'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, WorkCard, DeepWorkSession } from '@/lib/types';
import { generateReflectionQuestions, generateWorkCards, getDeepWorkResponse } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowRight, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useLanguage } from '@/contexts/language-context';

const LOADING_PHRASES = [
  'Pensando en lo que más importa ahora...',
  'Eligiendo los hilos más vivos...',
  'Preparando algo concreto para ti...',
];

const WORKING_PHRASES = [
  'Escuchando...',
  'Pensando contigo...',
  'Un momento...',
];

type DeepWorkView = 'loading' | 'selecting' | 'working' | 'done';

interface StageDeepWorkProps {
  session: PatientSession;
  patient: Patient;
  onAdvance: (deepWork: DeepWorkSession) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

export function StageDeepWork({ session, patient, onAdvance, onUpdate }: StageDeepWorkProps) {
  const shouldReduce = useReducedMotion();
  const { locale } = useLanguage();

  const [view, setView] = useState<DeepWorkView>(() => {
    if (session.deepWork?.synthesis) return 'done';
    if (session.deepWork?.selectedCard) return 'working';
    return 'loading';
  });

  const [cards, setCards] = useState<WorkCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<WorkCard | null>(
    session.deepWork?.selectedCard ?? null
  );
  const [messages, setMessages] = useState<{ role: 'patient' | 'therapist'; text: string }[]>(
    session.deepWork?.messages ?? []
  );
  const [synthesis, setSynthesis] = useState<string>(session.deepWork?.synthesis ?? '');
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isError, setIsError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (view === 'loading') {
      loadCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCards = async () => {
    setIsError(false);
    try {
      let questions = session.reflectionQuestions ?? [];
      if (questions.length === 0) {
        questions = await generateReflectionQuestions({
          conflicts: session.conflicts,
          frameworkMatches: session.frameworkMatches,
          closure: session.interpretation?.text ?? '',
          locale,
        });
        onUpdate({ reflectionQuestions: questions });
      }

      const workCards = await generateWorkCards({
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        reflectionQuestions: questions,
        interpretation: session.interpretation?.text ?? '',
        locale,
      });

      setCards(workCards);
      setView('selecting');
    } catch (e) {
      console.error(e);
      setIsError(true);
    }
  };

  const handleSelectCard = async (card: WorkCard) => {
    setSelectedCard(card);
    setView('working');

    const openingMsg = { role: 'therapist' as const, text: card.openingLine };
    setMessages([openingMsg]);

    onUpdate({
      deepWork: { selectedCard: card, messages: [openingMsg], synthesis: '' },
    });

    setTimeout(() => textareaRef.current?.focus(), 150);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (trimmed.length < 2 || !selectedCard) return;

    const patientMsg = { role: 'patient' as const, text: trimmed };
    const newMessages = [...messages, patientMsg];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      const result = await getDeepWorkResponse({
        selectedCard,
        messages: newMessages,
        conflicts: session.conflicts,
        frameworkMatches: session.frameworkMatches,
        interpretation: session.interpretation?.text ?? '',
        patient,
        locale,
      });

      const therapistMsg = { role: 'therapist' as const, text: result.response };
      const finalMessages = [...newMessages, therapistMsg];
      setMessages(finalMessages);

      if (result.done && result.synthesis) {
        setSynthesis(result.synthesis);
        const deepWork: DeepWorkSession = {
          selectedCard,
          messages: finalMessages,
          synthesis: result.synthesis,
        };
        onUpdate({ deepWork });
        setView('done');
      } else {
        onUpdate({
          deepWork: { selectedCard, messages: finalMessages, synthesis: '' },
        });
        setTimeout(() => textareaRef.current?.focus(), 150);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
  };

  const handleAdvance = () => {
    if (!selectedCard || !synthesis) return;
    onAdvance({ selectedCard, messages, synthesis });
  };

  return (
    <div className="space-y-8 pb-48">
      {/* Header */}
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Fase 3 — Integración
        </p>
        <AnimatePresence mode="wait">
          {view === 'loading' && (
            <motion.div key="h-loading"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                Preparando el trabajo
              </h2>
            </motion.div>
          )}
          {view === 'selecting' && (
            <motion.div key="h-selecting"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                ¿Qué quieres resolver hoy?
              </h2>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Elige uno. Lo trabajaremos juntos ahora mismo.
              </p>
            </motion.div>
          )}
          {(view === 'working' || view === 'done') && selectedCard && (
            <motion.div key="h-working"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[32px] leading-tight breathe"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                {selectedCard.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed italic"
                style={{ color: 'var(--color-muted)' }}>
                {selectedCard.subtitle}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading state */}
      {view === 'loading' && !isError && (
        <AIThinking phrases={LOADING_PHRASES} />
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-[var(--radius-card)] p-5 text-center space-y-3"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Hubo un problema al preparar el trabajo.
          </p>
          <button type="button" onClick={loadCards}
            className="flex items-center gap-2 mx-auto text-sm font-medium"
            style={{ color: 'var(--color-sage)' }}>
            <ArrowCounterClockwise size={14} />
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Card selection */}
      <AnimatePresence>
        {view === 'selecting' && (
          <motion.div key="cards" className="space-y-3"
            initial={shouldReduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => handleSelectCard(card)}
                initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileTap={shouldReduce ? {} : { scale: 0.98 }}
                className="w-full text-left p-5 rounded-[var(--radius-card)] space-y-1.5"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p className="font-medium text-[15px]" style={{ color: 'var(--color-deep)' }}>
                  {card.title}
                </p>
                <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  {card.subtitle}
                </p>
                <p className="text-xs font-medium mt-2" style={{ color: 'var(--color-sage)' }}>
                  Trabajar esto →
                </p>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue thread */}
      {(view === 'working' || view === 'done') && messages.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i}
                initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[85%] px-4 py-3.5 rounded-[18px]"
                  style={msg.role === 'patient' ? {
                    background: 'var(--color-sage)', color: 'white', borderBottomRightRadius: 6,
                  } : {
                    background: 'var(--color-surface)', color: 'var(--color-deep)',
                    borderBottomLeftRadius: 6, boxShadow: 'var(--shadow-card)',
                  }}>
                  <p className="leading-relaxed text-[15px]"
                    style={msg.role === 'therapist' ? { fontFamily: 'var(--font-display)' } : {}}>
                    {msg.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Thinking indicator */}
      {isThinking && <AIThinking phrases={WORKING_PHRASES} />}

      {/* Synthesis card */}
      <AnimatePresence>
        {view === 'done' && synthesis && (
          <motion.div key="synthesis"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="rounded-[var(--radius-card)] p-6 space-y-3"
            style={{
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-card)',
              borderLeft: '3px solid var(--color-sage)',
            }}>
            <p className="text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-sage)' }}>
              Lo que veo en lo que exploraste
            </p>
            <p className="text-base leading-relaxed"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
              {synthesis}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text input — only in working state */}
      <AnimatePresence>
        {view === 'working' && !isThinking && (
          <motion.div key="input-area"
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && input.trim().length >= 2) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe tu respuesta aquí…"
              rows={3}
              className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-terracotta)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FloatingBar */}
      <FloatingBar visible={true}>
        <div className="space-y-3">
          {view === 'working' && !isThinking && (
            <motion.button type="button"
              onClick={handleSend}
              disabled={input.trim().length < 2}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 tracking-wide"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}>
              Responder <ArrowRight size={16} />
            </motion.button>
          )}
          {view === 'done' && synthesis && (
            <motion.button type="button"
              onClick={handleAdvance}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 tracking-wide"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}>
              Continuar al cierre <ArrowRight size={16} />
            </motion.button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
