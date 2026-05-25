'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Conflict, FrameworkMatch, GestaltActivity, Stage3Type, WorkCard } from '@/lib/types';
import { synthesizeConflicts, getNextTherapistQuestion, generateSessionWorkCards } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ArrowRight, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useVoice } from '@/hooks/use-voice';
import { VoiceMicButton } from '@/components/ui/voice-mic-button';
import { detectCrisis } from '@/lib/crisis';
import { CrisisScreen } from '@/components/ui/crisis-screen';
import { useLanguage } from '@/contexts/language-context';

const SOFT_CAP_DEFAULT = 4;
const SOFT_CAP_WITH_INTENTION = 4;


type MessageRole = 'patient' | 'therapist';
type Message = { role: MessageRole; text: string; isReflection?: boolean };

interface StageConflictsProps {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  lastDiaryEntry?: import('@/lib/types').DiaryEntry | null;
  onAdvance: (conflicts: Conflict[], frameworkMatches: FrameworkMatch[], gestaltActivity: GestaltActivity | null, unmappedPhrases: string[], narrativeSummary: string, stage3Type: Stage3Type, selectedWorkCard: WorkCard) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

function UnmappedSection({ unmapped }: { unmapped: string[] }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-xl overflow-hidden" style={{ border: '1px dashed var(--color-border)' }}
    >
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
          {t('stage2.unmapped.label')} ({unmapped.length})
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'var(--color-muted)' }}>▾</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                {t('stage2.unmapped.description')}
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


export function StageConflicts({ session, patient, priorSessions = [], lastDiaryEntry, onAdvance, onUpdate }: StageConflictsProps) {
  const shouldReduce = useReducedMotion();
  const { t, locale } = useLanguage();
  const SOFT_CAP = session.sessionIntention ? SOFT_CAP_WITH_INTENTION : SOFT_CAP_DEFAULT;
  const hasExistingData = session.conflicts.length > 0 && session.frameworkMatches.length > 0;

  const STARTER_PROMPTS = [
    t('stage2.starter.1'),
    t('stage2.starter.2'),
    t('stage2.starter.3'),
  ];

  const {
    isVoiceMode, isRecording, isTranscribing, isSpeaking, transcribedText, voiceError,
    toggleVoiceMode, startRecording, stopRecording, speak, cancelSpeech, clearTranscribedText,
  } = useVoice();

  // ─── Crisis detection ─────────────────────────────────────────────
  const [showCrisis, setShowCrisis] = useState(false);

  // ─── Estado conversacional ────────────────────────────────────────
  const lastMissedIntention = priorSessions
    .filter(s => s.stage >= 6 && s.intentionOutcome === 'no')
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0] ?? null;

  const lastCommitment = priorSessions
    .filter(s => s.stage >= 6 && s.explorationRecord?.actionCommitment)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.explorationRecord?.actionCommitment ?? null;

  const lastSessionWithExploration = [...priorSessions]
    .sort((a, b) => b.sessionNumber - a.sessionNumber)
    .find(s => s.stage >= 6 && s.explorationRecord?.insights?.length);

  const lastInterpretation = priorSessions
    .filter(s => s.interpretation?.text)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.interpretation?.text ?? undefined;

  const lastInterpretationResponse = priorSessions
    .filter(s => s.interpretationResponse)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.interpretationResponse ?? undefined;

  const lastConsultationAnswer = priorSessions
    .filter(s => s.stage >= 6 && s.consultationAnswer)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.consultationAnswer ?? undefined;

  const lastReflectionQuestion = priorSessions
    .filter(s => s.stage >= 6 && s.reflectionQuestions?.length)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)[0]
    ?.reflectionQuestions?.[0] ?? null;

  const lastCompletedSession = [...priorSessions]
    .sort((a, b) => b.sessionNumber - a.sessionNumber)
    .find(s => s.stage >= 6 && s.wellbeingAfter !== undefined && s.wellbeingBefore !== undefined);
  const hadDifficultLastSession = lastCompletedSession
    ? (lastCompletedSession.wellbeingAfter ?? 3) < (lastCompletedSession.wellbeingBefore ?? 3)
    : false;

  const openingGreeting = (() => {
    if (session.sessionIntention) {
      return t('stage2.greeting.intention').replace('{intention}', session.sessionIntention);
    }
    if (session.consultationAlignment === 'no') {
      return t('stage2.greeting.alignment_no');
    }
    if (session.consultationAlignment === 'partial') {
      if (session.consultationAlignmentNote) {
        const truncated = session.consultationAlignmentNote.length > 100
          ? session.consultationAlignmentNote.slice(0, 97) + '…'
          : session.consultationAlignmentNote;
        return t('stage2.greeting.alignment_partial_note').replace('{note}', truncated);
      }
      return t('stage2.greeting.alignment_partial');
    }
    if (session.commitmentFollowUp?.status === 'yes') {
      const commitment = lastCommitment ?? t('stage2.commitment.generic');
      return t('stage2.greeting.commitment_yes').replace('{commitment}', commitment);
    }
    if (session.commitmentFollowUp?.status === 'partial') {
      const commitment = lastCommitment ?? t('stage2.commitment.generic');
      return t('stage2.greeting.commitment_partial').replace('{commitment}', commitment);
    }
    if (session.commitmentFollowUp?.status === 'no') {
      const commitment = lastCommitment ?? t('stage2.commitment.generic');
      return t('stage2.greeting.commitment_missed').replace('{commitment}', commitment);
    }
    if (lastConsultationAnswer === 'not_yet' && session.sessionNumber >= 5) {
      return t('stage2.greeting.stuck');
    }
    if (lastMissedIntention) {
      return t('stage2.greeting.intention_missed');
    }
    if (lastInterpretationResponse && session.sessionNumber >= 2) {
      const truncated = lastInterpretationResponse.length > 80
        ? lastInterpretationResponse.slice(0, 80) + '…'
        : lastInterpretationResponse;
      return t('stage2.greeting.interpretation_response').replace('{response}', truncated);
    }
    if (lastReflectionQuestion && session.sessionNumber >= 2) {
      const truncated = lastReflectionQuestion.length > 100
        ? lastReflectionQuestion.slice(0, 97) + '…'
        : lastReflectionQuestion;
      return t('stage2.greeting.reflection').replace('{reflection}', truncated);
    }
    if (session.sessionNumber >= 3 && lastSessionWithExploration) {
      const conflictTheme = lastSessionWithExploration.explorationRecord!.insights[0]?.theme
        ?? lastSessionWithExploration.conflicts[0]?.synthesized
        ?? '';
      return t('stage2.greeting.continuity').replace('{conflict}', conflictTheme);
    }
    // Use check-in wellbeing data instead of generic "how have you been"
    if (session.wellbeingBefore !== undefined && priorSessions.length > 0) {
      if (session.wellbeingBefore <= 2) {
        return t('stage2.greeting.checkin_low');
      }
      if (hadDifficultLastSession) {
        return t('stage2.greeting.difficult_last');
      }
      return t('stage2.greeting.checkin').replace('{wb}', String(session.wellbeingBefore));
    }
    return priorSessions.length > 0
      ? t('stage2.greeting.returning')
      : t('stage2.greeting.first');
  })();

  const [messages, setMessages] = useState<Message[]>(() =>
    hasExistingData ? [] : [{ role: 'therapist', text: openingGreeting }]
  );
  const [input, setInput] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [skipsInARow, setSkipsInARow] = useState(0);
  const [showBridge, setShowBridge] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(!!hasExistingData);
  const [showValidation, setShowValidation] = useState(false);

  // Selección de tarjeta de trabajo
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [sessionCards, setSessionCards] = useState<WorkCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [customCardExpanded, setCustomCardExpanded] = useState(false);
  const [customCardText, setCustomCardText] = useState('');

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

  // Último mensaje del terapeuta (para TTS y speaking indicator)
  const lastTherapistMsg = [...messages].reverse().find(m => m.role === 'therapist');

  // Auto-play TTS cuando llega un mensaje del terapeuta en modo voz
  useEffect(() => {
    if (!isVoiceMode || !lastTherapistMsg?.text) return;
    speak(lastTherapistMsg.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTherapistMsg?.text, isVoiceMode]);

  // Auto-submit tras transcripción con delay de 1.2s
  useEffect(() => {
    if (!transcribedText || !isVoiceMode) return;
    const t = setTimeout(() => {
      handleSend(transcribedText);
      clearTranscribedText();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcribedText]);

  // Extraer todos los inputs del paciente del historial
  const getPatientInputs = (msgs: Message[]) =>
    msgs.filter(m => m.role === 'patient').map(m => m.text);

  // ─── Enviar mensaje (tanto inicial como follow-up) ────────────────
  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 5) return;

    if (detectCrisis(trimmed)) {
      setShowCrisis(true);
      return;
    }

    const newMessages: Message[] = [...messages, { role: 'patient', text: trimmed }];
    setMessages(newMessages);
    setInput('');
    setSkipsInARow(0);

    const patientInputs = getPatientInputs(newMessages);

    setIsEvaluating(true);
    try {
      const { done, question, reflection, bridgeMessage: bridgeMsg } = await getNextTherapistQuestion({
        allInputs: patientInputs,
        questionsAsked,
        patient,
        lifeChanges: session.lifeChanges,
        sessionIntention: session.sessionIntention,
        forceClose: questionsAsked.length >= SOFT_CAP - 1,
        priorSessions,
        locale,
        phq9: session.phq9,
        gad7: session.gad7,
        commitmentFollowUp: session.commitmentFollowUp,
        recentDiaryEntry: lastDiaryEntry?.note ? `${lastDiaryEntry.emotion}: ${lastDiaryEntry.note}` : (lastDiaryEntry ? lastDiaryEntry.emotion : undefined),
        priorInterpretation: lastInterpretation,
        openingContextNote: openingGreeting,
        hadDifficultLastSession,
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
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleSkip = async () => {
    const newSkips = skipsInARow + 1;
    setSkipsInARow(newSkips);

    const patientInputs = getPatientInputs(messages);

    if (newSkips >= 2) {
      goToAnalysis(patientInputs);
      return;
    }

    setIsEvaluating(true);
    try {
      const { done, question, reflection, bridgeMessage: bridgeMsg } = await getNextTherapistQuestion({
        allInputs: patientInputs,
        questionsAsked,
        patient,
        lifeChanges: session.lifeChanges,
        sessionIntention: session.sessionIntention,
        forceClose: questionsAsked.length >= SOFT_CAP - 1,
        priorSessions,
        locale,
        phq9: session.phq9,
        gad7: session.gad7,
        commitmentFollowUp: session.commitmentFollowUp,
        recentDiaryEntry: lastDiaryEntry?.note ? `${lastDiaryEntry.emotion}: ${lastDiaryEntry.note}` : (lastDiaryEntry ? lastDiaryEntry.emotion : undefined),
        priorInterpretation: lastInterpretation,
        openingContextNote: openingGreeting,
        hadDifficultLastSession,
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
  const [cardsFailed, setCardsFailed] = useState(false);

  const goToAnalysis = async (inputs: string[]) => {
    setShowBridge(false);
    setShowAnalysis(true);
    setShowValidation(false);
    setIsAnalyzing(true);
    setError('');
    setCardsFailed(false);
    try {
      const data = await synthesizeConflicts(inputs, patient, session.lifeChanges, session.sessionIntention, priorSessions, locale, session.phq9, session.gad7, session.consultationAlignment);
      setResult(data);
      onUpdate({ conflicts: data.conflicts, frameworkMatches: data.frameworkMatches, gestaltActivity: data.gestaltActivity, narrativeSummary: data.narrativeSummary });
      setShowValidation(true);
      // Pre-fetch work cards while user reads the validation screen
      setIsLoadingCards(true);
      generateSessionWorkCards({
        conflicts: data.conflicts,
        frameworkMatches: data.frameworkMatches,
        stage3Type: data.stage3Type,
        patient,
        consultationAlignment: session.consultationAlignment,
        consultationAlignmentNote: session.consultationAlignmentNote,
        sessionIntention: session.sessionIntention,
        locale,
      }).then(cards => {
        // For session 3+, prepend a continuity card that picks up from the last exploration
        if (session.sessionNumber >= 3 && lastSessionWithExploration) {
          const r = lastSessionWithExploration.explorationRecord!;
          const theme = r.insights[0]?.theme ?? lastSessionWithExploration.conflicts[0]?.synthesized ?? '';
          const insight = r.insights[0]?.observation ?? '';
          if (theme) {
            const continuityCard: WorkCard = {
              id: 'continuity',
              title: `${t('stage2.cards.continuity.badge')}: ${theme}`,
              subtitle: insight || t('stage2.cards.continuity.subtitle'),
              openingLine: r.actionCommitment
                ? t('stage2.cards.continuity.opening.with_commitment').replace('{commitment}', r.actionCommitment.replace(/^[^:]+: /, '').split(' → ')[0])
                : t('stage2.cards.continuity.opening.without_commitment').replace('{theme}', theme),
            };
            setSessionCards([continuityCard, ...cards]);
            return;
          }
        }
        setSessionCards(cards);
      }).catch(() => {
        setCardsFailed(true);
      }).finally(() => {
        setIsLoadingCards(false);
      });
    } catch {
      setError(t('stage2.error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmValidation = () => {
    if (!result) return;
    if (cardsFailed) {
      const fallbackCard: WorkCard = {
        id: 'fallback',
        title: t('stage2.fallback.title'),
        subtitle: t('stage2.fallback.subtitle'),
        openingLine: t('stage2.fallback.opening'),
      };
      onAdvance(result.conflicts, result.frameworkMatches, result.gestaltActivity, result.unmappedPhrases, result.narrativeSummary, result.stage3Type, fallbackCard);
      return;
    }
    setShowCardSelection(true);
  };

  const handleSelectCard = (card: WorkCard) => {
    if (!result) return;
    onAdvance(result.conflicts, result.frameworkMatches, result.gestaltActivity, result.unmappedPhrases, result.narrativeSummary, result.stage3Type, card);
  };

  const handleWantsToAdd = () => {
    setShowAnalysis(false);
    setShowValidation(false);
    setShowBridge(false);
    setShowCardSelection(false);
    setSessionCards([]);
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

  // FloatingBar should only be visible when there's actionable content inside
  const floatingBarVisible =
    !showCardSelection && (
      (!showAnalysis && !isEvaluating && !showBridge) ||
      (showBridge && !isEvaluating) ||
      (showAnalysis && showValidation && !!result && !isAnalyzing) ||
      (showAnalysis && !showValidation && !!result && !isAnalyzing)
    );

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <>
    <AnimatePresence>
      {showCrisis && <CrisisScreen onDismiss={() => setShowCrisis(false)} />}
    </AnimatePresence>
    <div className="space-y-8 pb-48">

      {/* Header */}
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          {t('stage2.label')}
        </p>
        <AnimatePresence mode="wait">
          {!showAnalysis && (
            <motion.div key="h-converse"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                {hasStarted ? t('stage2.title.continuing') : t('stage2.title.opening')}
              </h2>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {hasStarted ? t('stage2.subtitle.continuing') : t('stage2.subtitle.opening')}
              </p>
            </motion.div>
          )}
          {showAnalysis && !showCardSelection && (
            <motion.div key="h-analysis"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                {t('stage2.title.analysis')}
              </h2>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {showValidation ? t('stage2.analysis.subtitle.validate') : t('stage2.analysis.subtitle.default')}
              </p>
            </motion.div>
          )}
          {showCardSelection && (
            <motion.div key="h-cards"
              initial={shouldReduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
              <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                {isLoadingCards ? t('stage2.cards.loading_title') : t('stage2.title.cards')}
              </h2>
              {!isLoadingCards && (
                <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  {t('stage2.cards.subtitle')}
                </p>
              )}
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
              <button key={p} type="button" onClick={() => handleSend(p)}
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
                  {isSpeaking && msg === lastTherapistMsg && (
                    <div className="flex gap-1 items-end mt-2">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          animate={shouldReduce ? {} : { scaleY: [1, 2.5, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          style={{ display: 'block', width: 2, height: 10, borderRadius: 99, background: 'var(--color-sage)' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ─── Progreso de turnos ─── */}
      {!showAnalysis && questionsAsked.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 py-1" aria-hidden="true">
          {Array.from({ length: SOFT_CAP }).map((_, i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: i < questionsAsked.length ? 6 : 4,
                height: i < questionsAsked.length ? 6 : 4,
                borderRadius: '50%',
                background: i < questionsAsked.length ? 'var(--color-sage)' : 'var(--color-border)',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* ─── Evaluando ─── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isEvaluating ? 'El terapeuta está procesando tu respuesta' : ''}
        {isAnalyzing ? 'Analizando todo lo que compartiste' : ''}
      </div>
      {isEvaluating && (
        <AIThinking phrases={[t('stage2.thinking.1'), t('stage2.thinking.2'), t('stage2.thinking.3')]} />
      )}

      {/* ─── Input: texto o voz (siempre visible mientras no estamos en análisis) ─── */}
      <AnimatePresence>
        {!showAnalysis && !isEvaluating && !showBridge && (
          <motion.div key="textarea-area"
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="space-y-2">
            {isVoiceMode ? (
              <VoiceMicButton
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                pendingText={transcribedText}
                onStart={startRecording}
                onStop={stopRecording}
              />
            ) : (
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
                placeholder={hasStarted ? t('stage2.input.reply') : t('stage2.input.initial')}
                rows={hasStarted ? 3 : 4}
                autoFocus
                className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                onFocus={e => (e.target.style.borderColor = isConversing ? 'var(--color-terracotta)' : 'var(--color-sage)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            )}
            {voiceError && (
              <p className="text-xs text-center" style={{ color: 'var(--color-terracotta)' }}>{voiceError}</p>
            )}
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
              <AIThinking phrases={[t('stage2.analyzing.1'), t('stage2.analyzing.2'), t('stage2.analyzing.3')]} />
            )}
            {error && !isAnalyzing && (
              <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>{error}</p>
            )}
            {result && !isAnalyzing && (
              <>
                <AICard>
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                      {t('stage2.analysis.intro')}
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
                {showValidation && (
                  <motion.div
                    key="validation-card"
                    initial={shouldReduce ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.2 }}
                    className="rounded-[20px] p-6 space-y-3"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <p
                      className="text-xs font-medium tracking-wide uppercase"
                      style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {t('stage2.analysis.recognize')}
                    </p>
                    <p
                      className="text-base leading-relaxed"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
                    >
                      {t('stage2.analysis.confirm')}
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Selección de tarjeta de trabajo ─── */}
      <AnimatePresence>
        {showCardSelection && (
          <motion.div
            key="card-selection"
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {isLoadingCards && (
              <AIThinking phrases={[t('stage2.cards.loading.1'), t('stage2.cards.loading.2'), t('stage2.cards.loading.3')]} />
            )}
            {!isLoadingCards && sessionCards.map((card, i) => (
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
                  {t('stage2.cards.cta')}
                </p>
              </motion.button>
            ))}
            {!isLoadingCards && (
              <motion.div
                initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sessionCards.length * 0.1 }}
                className="rounded-[var(--radius-card)] overflow-hidden"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px dashed var(--color-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCustomCardExpanded(e => !e)}
                  className="w-full text-left p-5 space-y-1"
                >
                  <p className="font-medium text-[15px]" style={{ color: 'var(--color-deep)' }}>
                    {t('stage2.cards.custom.label')}
                  </p>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                    {t('stage2.cards.custom.cta')}
                  </p>
                </button>
                <AnimatePresence>
                  {customCardExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden px-5 pb-5 space-y-3"
                    >
                      <textarea
                        value={customCardText}
                        onChange={e => setCustomCardText(e.target.value)}
                        placeholder={t('stage2.cards.custom.placeholder')}
                        rows={3}
                        className="w-full bg-transparent outline-none resize-none p-3 rounded-[var(--radius-inner)] border-2 text-sm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                      />
                      <motion.button
                        type="button"
                        disabled={customCardText.trim().length < 5}
                        onClick={() => {
                          if (!result || customCardText.trim().length < 5) return;
                          const trimmed = customCardText.trim();
                          const customCard: WorkCard = {
                            id: 'custom',
                            title: trimmed,
                            subtitle: trimmed,
                            openingLine: `Cuéntame más sobre ${trimmed.toLowerCase()}. ¿Por dónde quieres empezar?`,
                          };
                          handleSelectCard(customCard);
                        }}
                        whileTap={shouldReduce ? {} : { scale: 0.97 }}
                        className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-40"
                        style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
                      >
                        {t('stage2.cards.custom.cta')}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FloatingBar ─── */}
      <FloatingBar visible={floatingBarVisible}>
        <div className="space-y-3">

          {/* Enviar mensaje */}
          {!showAnalysis && !isEvaluating && !showBridge && (
            <>
              <div className="flex gap-2">
                {!isVoiceMode && (
                  <motion.button type="button"
                    onClick={() => handleSend(input)}
                    disabled={input.trim().length < 5}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    className="flex-1 py-4 rounded-2xl font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 tracking-wide"
                    style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}>
                    {hasStarted ? <>{t('stage2.reply')} <ArrowRight size={16} /></> : t('stage2.send')}
                  </motion.button>
                )}
                {isVoiceMode && (
                  <div className="flex-1" />
                )}
                <motion.button
                  type="button"
                  onClick={() => { toggleVoiceMode(); if (isSpeaking) cancelSpeech(); }}
                  whileTap={shouldReduce ? {} : { scale: 0.95 }}
                  className="p-2.5 rounded-xl flex-shrink-0"
                  style={{
                    background: isVoiceMode ? 'var(--color-sage)' : 'var(--color-surface)',
                    color: isVoiceMode ? 'white' : 'var(--color-muted)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  aria-label={isVoiceMode ? t('stage2.voice.deactivate') : t('stage2.voice.activate')}
                  aria-pressed={isVoiceMode}
                >
                  {isVoiceMode ? <SpeakerHigh size={18} aria-hidden="true" /> : <SpeakerSlash size={18} aria-hidden="true" />}
                </motion.button>
              </div>
              {lastMessageIsTherapist && !isVoiceMode && (
                <button type="button" onClick={handleSkip}
                  className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-muted)' }}>
                  {t('stage2.skip')}
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
                {t('stage2.ready')} <ArrowRight size={16} />
              </motion.button>
              <button
                type="button"
                onClick={handleContinueDeep}
                className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-muted)' }}
              >
                {t('stage2.want_to_deepen')}
              </button>
            </>
          )}

          {/* Validación — confirmar o agregar */}
          {showAnalysis && showValidation && result && !isAnalyzing && !showCardSelection && (
            <>
              <motion.button
                type="button"
                onClick={handleConfirmValidation}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide flex items-center justify-center gap-2"
                style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
              >
                {t('stage2.confirm')} <ArrowRight size={16} />
              </motion.button>
              <button
                type="button"
                onClick={handleWantsToAdd}
                className="w-full py-2 text-sm text-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-muted)' }}
              >
                {t('stage2.want_to_add')}
              </button>
            </>
          )}

          {/* Re-analizar — solo en caso de error o sesión restaurada */}
          {showAnalysis && !showValidation && result && !isAnalyzing && (
            <motion.button
              type="button"
              onClick={reanalyze}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ color: 'var(--color-sage)', border: '1px solid var(--color-sage)' }}
            >
              {t('stage2.reanalyze')}
            </motion.button>
          )}
        </div>
      </FloatingBar>
    </div>
    </>
  );
}
