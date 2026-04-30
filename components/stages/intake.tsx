'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type {
  Patient,
  PatientSession,
  Gender,
  MaritalStatus,
  LivingSituation,
  EmploymentStatus,
  Conflict,
  FrameworkMatch,
  GestaltActivity,
  Stage3Type,
  UnmappedPhrase,
} from '@/lib/types';
import { generateId } from '@/lib/id';
import { db } from '@/lib/db';
import { synthesizeConflicts } from '@/actions/ai';
import { VoiceFillButton } from '@/components/ui/voice-fill-button';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { ConsentScreen } from '@/components/ui/consent-screen';
import { ArrowLeft } from '@phosphor-icons/react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IntakeProps {
  onComplete: (patient: Patient, session: PatientSession) => void;
  onBack: () => void;
}

type IntakeValues = {
  name: string;
  age: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  hasChildren: boolean | null;
  childrenCount: string;
  livingSituation: LivingSituation;
  livingSituationDetail: string;
  employment: EmploymentStatus;
  occupation: string;
  hasSupportNetwork: boolean | null;
  supportDescription: string;
  previousTherapy: boolean | null;
  previousTherapyDetail: string;
  takingMedication: boolean | null;
  medicationDetail: string;
  consultationReason: string;
};

type IntakeSynthesis = {
  conflicts: Conflict[];
  frameworkMatches: FrameworkMatch[];
  gestaltActivity: GestaltActivity | null;
  stage3Type: Stage3Type;
  narrativeSummary: string;
  unmappedPhrases: string[];
};

const INITIAL_VALUES: IntakeValues = {
  name: '',
  age: '',
  gender: 'Femenino',
  maritalStatus: 'Soltero/a',
  hasChildren: null,
  childrenCount: '',
  livingSituation: 'Solo/a',
  livingSituationDetail: '',
  employment: 'Empleado/a',
  occupation: '',
  hasSupportNetwork: null,
  supportDescription: '',
  previousTherapy: null,
  previousTherapyDetail: '',
  takingMedication: null,
  medicationDetail: '',
  consultationReason: '',
};

/* ------------------------------------------------------------------ */
/*  Wellbeing scale                                                    */
/* ------------------------------------------------------------------ */

const WELLBEING_OPTIONS = [
  { value: 1, label: 'Muy mal' },
  { value: 2, label: 'Mal' },
  { value: 3, label: 'Regular' },
  { value: 4, label: 'Bien' },
  { value: 5, label: 'Muy bien' },
];

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

// Step order (0-indexed):
// 0: wellbeing
// 1: consultationReason  ← first real question (before demographics)
// 2: name
// 3: age
// 4: gender
// 5: maritalStatus
// 6: children
// 7: livingSituation
// 8: employment
// 9: supportNetwork
// 10: previousTherapy
// 11: medication
// 12: specificEvents     ← new: structured event narration
// 13: feelingsSensations ← new: feelings & bodily sensations

const TOTAL_STEPS = 14;

function getStepQuestion(step: number, values: IntakeValues): string {
  switch (step) {
    case 0: return 'Antes de comenzar, ¿cómo te sientes hoy?';
    case 1: return '¿Qué te trae aquí hoy?';
    case 2: return '¿Cómo te llamas?';
    case 3: return values.name ? `¿Cuántos años tienes, ${values.name}?` : '¿Cuántos años tienes?';
    case 4: return '¿Cómo te identificas?';
    case 5: return '¿Cuál es tu estado civil?';
    case 6: return '¿Tienes hijos?';
    case 7: return '¿Con quién vives?';
    case 8: return '¿A qué te dedicas?';
    case 9: return '¿Tienes personas de confianza con quienes puedas hablar?';
    case 10: return '¿Has ido a terapia antes?';
    case 11: return '¿Tomas algún medicamento, ya sea psiquiátrico o de cualquier otro tipo?';
    case 12: return values.name
      ? `${values.name}, ¿puedes contarme una situación concreta o momento específico relacionado con lo que te trajo aquí?`
      : '¿Puedes contarme una situación concreta o momento específico relacionado con lo que te trajo aquí?';
    case 13: return values.name
      ? `¿Qué sentimientos o sensaciones surgen en tu cuerpo cuando piensas en eso, ${values.name}?`
      : '¿Qué sentimientos o sensaciones surgen en tu cuerpo cuando piensas en eso?';
    default: return '';
  }
}

function getStepAnswer(
  step: number,
  values: IntakeValues,
  wellbeing: number | null,
  specificEvents: string,
  feelingsSensations: string,
): string | null {
  switch (step) {
    case 0: return wellbeing ? WELLBEING_OPTIONS.find(o => o.value === wellbeing)?.label ?? null : null;
    case 1: return values.consultationReason.trim() || null;
    case 2: return values.name.trim() || null;
    case 3: return values.age || null;
    case 4: return values.gender;
    case 5: return values.maritalStatus;
    case 6: {
      if (values.hasChildren === null) return null;
      if (!values.hasChildren) return 'No';
      return values.childrenCount ? `Sí, ${values.childrenCount}` : 'Sí';
    }
    case 7: {
      if (values.livingSituation === 'Otro' && values.livingSituationDetail.trim()) {
        return values.livingSituationDetail.trim();
      }
      return values.livingSituation;
    }
    case 8: {
      const parts: string[] = [values.employment];
      if (values.occupation.trim()) parts.push(values.occupation.trim());
      return parts.join(' · ');
    }
    case 9: {
      if (values.hasSupportNetwork === null) return null;
      if (!values.hasSupportNetwork) return 'No';
      return values.supportDescription.trim() ? `Sí — ${values.supportDescription.trim()}` : 'Sí';
    }
    case 10: {
      if (values.previousTherapy === null) return null;
      if (!values.previousTherapy) return 'No';
      return values.previousTherapyDetail.trim() ? `Sí — ${values.previousTherapyDetail.trim()}` : 'Sí';
    }
    case 11: {
      if (values.takingMedication === null) return null;
      if (!values.takingMedication) return 'No';
      return values.medicationDetail.trim() ? `Sí — ${values.medicationDetail.trim()}` : 'Sí';
    }
    case 12: return specificEvents
      ? specificEvents.slice(0, 80) + (specificEvents.length > 80 ? '...' : '')
      : null;
    case 13: return feelingsSensations
      ? feelingsSensations.slice(0, 80) + (feelingsSensations.length > 80 ? '...' : '')
      : null;
    default: return null;
  }
}

function canProceed(
  step: number,
  values: IntakeValues,
  wellbeing: number | null,
  specificEvents: string,
  feelingsSensations: string,
): boolean {
  switch (step) {
    case 0: return wellbeing !== null;
    case 1: return values.consultationReason.trim().length > 0;
    case 2: return values.name.trim().length > 0;
    case 3: { const n = parseInt(values.age); return n >= 18 && n < 120; }
    case 4: return true;
    case 5: return true;
    case 6: return values.hasChildren !== null;
    case 7: return values.livingSituation !== 'Otro' || values.livingSituationDetail.trim().length > 0;
    case 8: return true;
    case 9: return values.hasSupportNetwork !== null;
    case 10: return values.previousTherapy !== null;
    case 11: return values.takingMedication !== null;
    case 12: return specificEvents.trim().length >= 20;
    case 13: return feelingsSensations.trim().length >= 10;
    default: return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Small reusable sub-components                                      */
/* ------------------------------------------------------------------ */

function Chip({
  label,
  active,
  onClick,
  reduce,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  reduce: boolean | null;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduce ? {} : { scale: 0.95 }}
      className="px-4 py-2.5 rounded-[var(--radius-inner)] text-sm font-medium"
      style={{
        background: active ? 'var(--color-sage)' : 'var(--color-surface)',
        color: active ? 'white' : 'var(--color-deep)',
        boxShadow: active ? 'var(--shadow-glow-sage)' : 'var(--shadow-card)',
        transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {label}
    </motion.button>
  );
}

function YesNo({
  value,
  onChange,
  reduce,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  reduce: boolean | null;
}) {
  return (
    <div className="flex gap-3">
      <Chip label="Sí" active={value === true} onClick={() => onChange(true)} reduce={reduce} />
      <Chip label="No" active={value === false} onClick={() => onChange(false)} reduce={reduce} />
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  autoFocus?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      autoFocus={autoFocus}
      className="w-full bg-transparent outline-none py-3.5 text-lg placeholder:opacity-35 border-b-2"
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-deep)',
        transition: 'border-color 0.2s ease',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
      onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  autoFocus,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  rows?: number;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 text-base placeholder:opacity-35"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-deep)',
          transition: 'border-color 0.2s ease',
          paddingBottom: '2.75rem',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
        onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
      />
      <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}>
        <VoiceFillButton onFill={text => onChange(value ? value + ' ' + text : text)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function Intake({ onComplete, onBack }: IntakeProps) {
  const shouldReduce = useReducedMotion();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<IntakeValues>(INITIAL_VALUES);
  const [wellbeing, setWellbeing] = useState<number | null>(null);

  // New steps state
  const [specificEvents, setSpecificEvents] = useState('');
  const [feelingsSensations, setFeelingsSensations] = useState('');

  // AI synthesis state
  const [intakeProcessing, setIntakeProcessing] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [intakeSynthesis, setIntakeSynthesis] = useState<IntakeSynthesis | null>(null);

  const [pendingData, setPendingData] = useState<{
    patient: Patient;
    session: PatientSession;
  } | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof IntakeValues>(key: K, val: IntakeValues[K]) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  // Scroll to bottom when step changes to show latest question
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [step, intakeProcessing]);

  const handleNext = () => {
    if (!canProceed(step, values, wellbeing, specificEvents, feelingsSensations)) return;
    if (step === TOTAL_STEPS - 1) {
      // Step 13: trigger AI synthesis instead of direct submit
      handleIntakeAISynthesis();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (intakeProcessing === 'ready') {
      // From result card, go back to step 13
      setIntakeProcessing('idle');
      setStep(13);
      return;
    }
    if (intakeProcessing === 'loading') return; // block during loading
    if (step === 0) {
      onBack();
    } else {
      setStep(s => s - 1);
    }
  };

  const buildPatient = async (): Promise<Patient> => {
    const user = await db.getUser();
    return {
      id: user?.id ?? generateId(),
      name: values.name,
      age: parseInt(values.age),
      gender: values.gender,
      maritalStatus: values.maritalStatus,
      hasChildren: values.hasChildren!,
      childrenCount:
        values.hasChildren && values.childrenCount
          ? parseInt(values.childrenCount)
          : undefined,
      livingSituation: values.livingSituation,
      livingSituationDetail:
        values.livingSituation === 'Otro' && values.livingSituationDetail.trim()
          ? values.livingSituationDetail.trim()
          : undefined,
      employment: values.employment,
      occupation: values.occupation.trim() || undefined,
      hasSupportNetwork: values.hasSupportNetwork!,
      supportDescription:
        values.hasSupportNetwork && values.supportDescription.trim()
          ? values.supportDescription.trim()
          : undefined,
      previousTherapy: values.previousTherapy!,
      previousTherapyDetail:
        values.previousTherapy && values.previousTherapyDetail.trim()
          ? values.previousTherapyDetail.trim()
          : undefined,
      takingMedication: values.takingMedication!,
      medicationDetail:
        values.takingMedication && values.medicationDetail.trim()
          ? values.medicationDetail.trim()
          : undefined,
      consultationReason: values.consultationReason.trim(),
      createdAt: Date.now(),
    };
  };

  const handleIntakeAISynthesis = async () => {
    setStep(14); // advance past all form steps so step 13 renders as a bubble
    setIntakeProcessing('loading');
    try {
      const patient = await buildPatient();
      const result = await synthesizeConflicts(
        [values.consultationReason, specificEvents, feelingsSensations],
        patient,
        undefined,
        undefined,
        [],
      );
      setIntakeSynthesis(result);
      setIntakeProcessing('ready');
    } catch {
      // Fallback: proceed without pre-synthesized conflicts
      setIntakeProcessing('idle');
      setStep(13);
      handleSubmitWithSynthesis(null);
    }
  };

  const handleSubmitWithSynthesis = async (synthesis: IntakeSynthesis | null) => {
    const patient = await buildPatient();

    const unmappedPhrases: UnmappedPhrase[] = (synthesis?.unmappedPhrases ?? []).map(text => ({
      text,
      sessionNumber: 1,
    }));

    const session: PatientSession = {
      id: generateId(),
      patientId: patient.id,
      sessionNumber: 1,
      stage: synthesis ? 3 : 2,
      conflicts: synthesis?.conflicts ?? [],
      frameworkMatches: synthesis?.frameworkMatches ?? [],
      gestaltActivity: synthesis?.gestaltActivity ?? null,
      stage3Type: synthesis?.stage3Type,
      narrativeSummary: synthesis?.narrativeSummary,
      memories: [],
      interpretation: null,
      closure: null,
      unmappedPhrases,
      wellbeingBefore: wellbeing ?? undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setPendingData({ patient, session });
    setShowTransition(true);
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    if (pendingData) {
      onComplete(pendingData.patient, pendingData.session);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (!consentAccepted) {
    return (
      <ConsentScreen
        onAccept={() => setConsentAccepted(true)}
        onDecline={onBack}
      />
    );
  }

  const isReady = canProceed(step, values, wellbeing, specificEvents, feelingsSensations);

  return (
    <div className="min-h-dvh flex flex-col max-w-[680px] mx-auto px-6 pt-6 pb-48">
      {/* Header with back + progress */}
      <div className="flex items-center gap-4 mb-6">
        <motion.button
          type="button"
          onClick={handleBack}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="flex items-center gap-2 flex-shrink-0"
          style={{
            color: 'var(--color-muted)',
            opacity: intakeProcessing === 'loading' ? 0.3 : 1,
            pointerEvents: intakeProcessing === 'loading' ? 'none' : 'auto',
          }}
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Volver</span>
        </motion.button>

        <div className="flex-1 flex gap-0.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-full transition-all duration-300"
              style={{
                background: i < step ? 'var(--color-deep)' : i === step ? 'var(--color-sage)' : 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Conversation area */}
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto">
        {/* Previous answered steps as bubbles */}
        {Array.from({ length: Math.min(step, TOTAL_STEPS) }).map((_, i) => {
          const answer = getStepAnswer(i, values, wellbeing, specificEvents, feelingsSensations);
          if (!answer) return null;
          return (
            <motion.div
              key={`answered-${i}`}
              initial={false}
              animate={{ opacity: 0.6 }}
              className="space-y-1.5"
            >
              <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                {getStepQuestion(i, values)}
              </p>
              <p
                className="text-sm inline-block px-3 py-1.5 rounded-[var(--radius-inner)]"
                style={{ background: 'var(--color-surface)', color: 'var(--color-deep)', boxShadow: 'var(--shadow-card)' }}
              >
                {answer}
              </p>
            </motion.div>
          );
        })}

        {/* Current step — only shown when idle */}
        {intakeProcessing === 'idle' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={shouldReduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="space-y-5"
            >
              <p
                className="text-xl leading-snug"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
              >
                {getStepQuestion(step, values)}
              </p>

              <StepInput
                step={step}
                values={values}
                wellbeing={wellbeing}
                set={set}
                setWellbeing={setWellbeing}
                reduce={shouldReduce}
                specificEvents={specificEvents}
                setSpecificEvents={setSpecificEvents}
                feelingsSensations={feelingsSensations}
                setFeelingsSensations={setFeelingsSensations}
              />
            </motion.div>
          </AnimatePresence>
        )}

        {/* AI Processing — loading */}
        {intakeProcessing === 'loading' && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: '1rem' }}
          >
            <AIThinking
              phrases={[
                'Escuchando lo que compartiste...',
                'Identificando lo que emerge...',
                'Preparando tu camino terapéutico...',
              ]}
            />
          </motion.div>
        )}

        {/* AI Result — Camino A */}
        {intakeProcessing === 'ready' && intakeSynthesis && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '1rem' }}
          >
            {/* Narrative summary card */}
            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-card)',
                background: 'rgba(107,94,158,0.06)',
                border: '1px solid rgba(107,94,158,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-violet)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Lo que escuchamos
              </p>
              <p
                style={{
                  color: 'var(--color-deep)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {intakeSynthesis.narrativeSummary}
              </p>
              {intakeSynthesis.frameworkMatches[0] && (
                <span
                  style={{
                    alignSelf: 'flex-start',
                    padding: '0.375rem 0.875rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: 'var(--color-violet-light)',
                    color: 'var(--color-violet)',
                  }}
                >
                  {intakeSynthesis.frameworkMatches[0].name}
                </span>
              )}
            </div>

            {/* CTA */}
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                color: 'var(--color-deep)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              ¿Deseas empezar la terapia?
            </p>
            <motion.button
              type="button"
              onClick={() => handleSubmitWithSynthesis(intakeSynthesis)}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              style={{
                background: 'var(--color-sage)',
                boxShadow: 'var(--shadow-glow-sage)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-inner)',
                padding: '1rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
                alignSelf: 'stretch',
                textAlign: 'center',
              }}
            >
              Sí, empezar →
            </motion.button>
            <button
              type="button"
              onClick={() => { setIntakeProcessing('idle'); setStep(13); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-muted)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: '0.5rem',
                textAlign: 'center',
              }}
            >
              Quiero ajustar algo
            </button>
          </motion.div>
        )}
      </div>

      {/* Floating bar — hidden during AI processing */}
      <FloatingBar visible={intakeProcessing === 'idle' && isReady}>
        <motion.button
          type="button"
          onClick={handleNext}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
          style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
        >
          {step === TOTAL_STEPS - 1 ? 'Continuar' : 'Siguiente'}
        </motion.button>
      </FloatingBar>

      {/* Chapter transition overlay */}
      <AnimatePresence>
        {showTransition && (
          <ChapterTransition
            toStage={pendingData?.session.stage ?? 2}
            onComplete={handleTransitionComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step input renderer                                                */
/* ------------------------------------------------------------------ */

function StepInput({
  step,
  values,
  wellbeing,
  set,
  setWellbeing,
  reduce,
  specificEvents,
  setSpecificEvents,
  feelingsSensations,
  setFeelingsSensations,
}: {
  step: number;
  values: IntakeValues;
  wellbeing: number | null;
  set: <K extends keyof IntakeValues>(key: K, val: IntakeValues[K]) => void;
  setWellbeing: (v: number) => void;
  reduce: boolean | null;
  specificEvents: string;
  setSpecificEvents: (v: string) => void;
  feelingsSensations: string;
  setFeelingsSensations: (v: string) => void;
}) {
  const genders: Gender[] = ['Femenino', 'Masculino', 'Otro'];
  const statuses: MaritalStatus[] = ['Soltero/a', 'En pareja', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Separado/a'];
  const situations: LivingSituation[] = ['Solo/a', 'Con pareja', 'Con familia', 'Con compañeros', 'Con padres', 'Otro'];
  const employments: EmploymentStatus[] = ['Empleado/a', 'Desempleado/a', 'Estudiante', 'Independiente', 'Jubilado/a', 'Otro'];

  switch (step) {
    case 0:
      return (
        <div className="flex flex-wrap gap-3">
          {WELLBEING_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={wellbeing === opt.value}
              onClick={() => setWellbeing(opt.value)}
              reduce={reduce}
            />
          ))}
        </div>
      );

    case 1:
      return (
        <TextArea
          value={values.consultationReason}
          onChange={v => set('consultationReason', v)}
          placeholder="Escribe lo que sientas, no hay respuestas incorrectas"
          autoFocus
          rows={4}
        />
      );

    case 2:
      return (
        <TextInput
          value={values.name}
          onChange={v => set('name', v)}
          placeholder="Tu nombre"
          autoFocus
        />
      );

    case 3: {
      const ageNum = parseInt(values.age);
      const isTooYoung = values.age.length > 0 && !isNaN(ageNum) && ageNum < 18;
      return (
        <div className="space-y-3">
          <TextInput
            value={values.age}
            onChange={v => set('age', v)}
            placeholder="Tu edad"
            type="number"
            min={18}
            max={120}
            autoFocus
          />
          {isTooYoung && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm leading-relaxed px-1"
              style={{ color: 'var(--color-terracotta)' }}
            >
              Tend está diseñado para personas de 18 años o más. Si eres menor, te recomendamos
              buscar apoyo a través de tu centro educativo o familiar.
            </motion.p>
          )}
        </div>
      );
    }

    case 4:
      return (
        <div className="flex flex-wrap gap-3">
          {genders.map(g => (
            <Chip key={g} label={g} active={values.gender === g} onClick={() => set('gender', g)} reduce={reduce} />
          ))}
        </div>
      );

    case 5:
      return (
        <div className="flex flex-wrap gap-3">
          {statuses.map(s => (
            <Chip key={s} label={s} active={values.maritalStatus === s} onClick={() => set('maritalStatus', s)} reduce={reduce} />
          ))}
        </div>
      );

    case 6:
      return (
        <div className="space-y-3">
          <YesNo value={values.hasChildren} onChange={v => set('hasChildren', v)} reduce={reduce} />
          <AnimatePresence>
            {values.hasChildren && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <TextInput
                  value={values.childrenCount}
                  onChange={v => set('childrenCount', v)}
                  placeholder="¿Cuántos?"
                  type="number"
                  min={1}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );

    case 7:
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {situations.map(s => (
              <Chip key={s} label={s} active={values.livingSituation === s} onClick={() => set('livingSituation', s)} reduce={reduce} />
            ))}
          </div>
          <AnimatePresence>
            {values.livingSituation === 'Otro' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <TextInput
                  value={values.livingSituationDetail}
                  onChange={v => set('livingSituationDetail', v)}
                  placeholder="Cuéntanos más"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );

    case 8:
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {employments.map(e => (
              <Chip key={e} label={e} active={values.employment === e} onClick={() => set('employment', e)} reduce={reduce} />
            ))}
          </div>
          <TextInput
            value={values.occupation}
            onChange={v => set('occupation', v)}
            placeholder="¿A qué te dedicas? (opcional)"
          />
        </div>
      );

    case 9:
      return (
        <div className="space-y-3">
          <YesNo value={values.hasSupportNetwork} onChange={v => set('hasSupportNetwork', v)} reduce={reduce} />
          <AnimatePresence>
            {values.hasSupportNetwork && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <TextArea
                  value={values.supportDescription}
                  onChange={v => set('supportDescription', v)}
                  placeholder="Cuéntame brevemente sobre ellas"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );

    case 10:
      return (
        <div className="space-y-3">
          <YesNo value={values.previousTherapy} onChange={v => set('previousTherapy', v)} reduce={reduce} />
          <AnimatePresence>
            {values.previousTherapy && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <TextInput
                  value={values.previousTherapyDetail}
                  onChange={v => set('previousTherapyDetail', v)}
                  placeholder="¿Qué tipo? ¿Hace cuánto?"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );

    case 11:
      return (
        <div className="space-y-3">
          <YesNo value={values.takingMedication} onChange={v => set('takingMedication', v)} reduce={reduce} />
          <AnimatePresence>
            {values.takingMedication && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <TextInput
                  value={values.medicationDetail}
                  onChange={v => set('medicationDetail', v)}
                  placeholder="¿Cuál?"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );

    case 12:
      return (
        <TextArea
          value={specificEvents}
          onChange={setSpecificEvents}
          placeholder="Describe el momento con el mayor detalle posible..."
          autoFocus
          rows={5}
        />
      );

    case 13:
      return (
        <TextArea
          value={feelingsSensations}
          onChange={setFeelingsSensations}
          placeholder="Tensión, opresión, mariposas... cualquier cosa que surja..."
          autoFocus
          rows={5}
        />
      );

    default:
      return null;
  }
}
