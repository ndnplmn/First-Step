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
import { useLanguage } from '@/contexts/language-context';
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
  solutionVision: string;
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
  gender: 'female',
  maritalStatus: 'single',
  hasChildren: null,
  childrenCount: '',
  livingSituation: 'alone',
  livingSituationDetail: '',
  employment: 'employed',
  occupation: '',
  hasSupportNetwork: null,
  supportDescription: '',
  previousTherapy: null,
  previousTherapyDetail: '',
  takingMedication: null,
  medicationDetail: '',
  consultationReason: '',
  solutionVision: '',
};

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

// Step order (0-indexed):
// 0: consultationReason
// 1: name
// 2: specificEvents      (moved earlier — hear the story before demographics)
// 3: feelingsSensations  (moved earlier)
// 4: solutionVision      (new — what does success look like?)
// 5: age + gender        (combined)
// 6: maritalStatus + children (combined)
// 7: livingSituation + employment (combined)
// 8: supportNetwork + previousTherapy + medication (combined — reduces step count)
// 9: wellbeingAtIntake

const TOTAL_STEPS = 10;

function getStepQuestion(
  step: number,
  values: IntakeValues,
  t: (key: string) => string,
): string {
  switch (step) {
    case 0: return t('intake.q0');
    case 1: return t('intake.q1');
    case 2: return values.name
      ? t('intake.q11.named').replace('{name}', values.name)
      : t('intake.q11');
    case 3: return values.name
      ? t('intake.q12.named').replace('{name}', values.name)
      : t('intake.q12');
    case 4: return values.name
      ? t('intake.q.goal.named').replace('{name}', values.name)
      : t('intake.q.goal');
    case 5: return values.name
      ? t('intake.q2.named').replace('{name}', values.name)
      : t('intake.q2');
    case 6: return t('intake.q4');
    case 7: return t('intake.q6');
    case 8: return t('intake.q8');
    case 9: return t('intake.wellbeing.question');
    default: return '';
  }
}

function getStepAnswer(
  step: number,
  values: IntakeValues,
  specificEvents: string,
  feelingsSensations: string,
  wellbeingAtIntake: number | null,
  t: (key: string) => string,
): string | null {
  const genderLabel: Record<Gender, string> = {
    'female': t('intake.gender.female'),
    'male': t('intake.gender.male'),
    'other': t('intake.gender.other'),
  };
  const maritalLabel: Record<MaritalStatus, string> = {
    'single': t('intake.marital.single'),
    'partnered': t('intake.marital.partner'),
    'married': t('intake.marital.married'),
    'divorced': t('intake.marital.divorced'),
    'widowed': t('intake.marital.widowed'),
    'separated': t('intake.marital.separated'),
  };
  const livingLabel: Record<LivingSituation, string> = {
    'alone': t('intake.living.alone'),
    'with-partner': t('intake.living.partner'),
    'with-family': t('intake.living.family'),
    'with-housemates': t('intake.living.housemates'),
    'with-parents': t('intake.living.parents'),
    'other': t('intake.living.other'),
  };
  const employmentLabel: Record<EmploymentStatus, string> = {
    'employed': t('intake.employment.employed'),
    'unemployed': t('intake.employment.unemployed'),
    'student': t('intake.employment.student'),
    'freelance': t('intake.employment.freelance'),
    'retired': t('intake.employment.retired'),
    'other': t('intake.employment.other'),
  };

  switch (step) {
    case 0: return values.consultationReason.trim() || null;
    case 1: return values.name.trim() || null;
    case 2: return specificEvents
      ? specificEvents.slice(0, 80) + (specificEvents.length > 80 ? '...' : '')
      : null;
    case 3: return feelingsSensations
      ? feelingsSensations.slice(0, 80) + (feelingsSensations.length > 80 ? '...' : '')
      : null;
    case 4: return values.solutionVision.trim()
      ? values.solutionVision.trim().slice(0, 80) + (values.solutionVision.trim().length > 80 ? '...' : '')
      : null;
    case 5: {
      const parts: string[] = [];
      if (values.age) parts.push(values.age);
      parts.push(genderLabel[values.gender] ?? values.gender);
      return parts.join(' · ');
    }
    case 6: {
      const parts: string[] = [maritalLabel[values.maritalStatus] ?? values.maritalStatus];
      if (values.hasChildren === false) parts.push(t('intake.no'));
      else if (values.hasChildren && values.childrenCount)
        parts.push(t('intake.yes.detail').replace('{detail}', values.childrenCount));
      else if (values.hasChildren) parts.push(t('intake.yes'));
      return parts.join(' · ') || null;
    }
    case 7: {
      const livingPart = values.livingSituation === 'other' && values.livingSituationDetail.trim()
        ? values.livingSituationDetail.trim()
        : livingLabel[values.livingSituation] ?? values.livingSituation;
      const employParts: string[] = [employmentLabel[values.employment] ?? values.employment];
      if (values.occupation.trim()) employParts.push(values.occupation.trim());
      return [livingPart, employParts.join(' · ')].join(' · ');
    }
    case 8: {
      const parts: string[] = [];
      if (values.hasSupportNetwork !== null) {
        const supportPart = !values.hasSupportNetwork ? t('intake.no')
          : values.supportDescription.trim()
            ? t('intake.yes.detail').replace('{detail}', values.supportDescription.trim())
            : t('intake.yes');
        parts.push(supportPart);
      }
      if (values.previousTherapy !== null) {
        parts.push(!values.previousTherapy ? t('intake.no')
          : values.previousTherapyDetail.trim()
            ? t('intake.yes.detail').replace('{detail}', values.previousTherapyDetail.trim())
            : t('intake.yes'));
      }
      if (values.takingMedication !== null) {
        parts.push(!values.takingMedication ? t('intake.no')
          : values.medicationDetail.trim()
            ? t('intake.yes.detail').replace('{detail}', values.medicationDetail.trim())
            : t('intake.yes'));
      }
      return parts.join(' · ') || null;
    }
    case 9: return wellbeingAtIntake
      ? t(`checkin.wellbeing.${wellbeingAtIntake}`)
      : null;
    default: return null;
  }
}

function canProceed(
  step: number,
  values: IntakeValues,
  specificEvents: string,
  feelingsSensations: string,
  wellbeingAtIntake: number | null,
): boolean {
  switch (step) {
    case 0: return values.consultationReason.trim().length > 0;
    case 1: return values.name.trim().length > 0;
    case 2: return specificEvents.trim().length >= 20;
    case 3: return feelingsSensations.trim().length >= 10;
    case 4: return true; // solutionVision is optional — skip allowed
    case 5: { const n = parseInt(values.age); return n >= 18 && n < 120; }
    case 6: return values.hasChildren !== null;
    case 7: return values.livingSituation !== 'other' || values.livingSituationDetail.trim().length > 0;
    case 8: return values.hasSupportNetwork !== null && values.previousTherapy !== null && values.takingMedication !== null;
    case 9: return wellbeingAtIntake !== null;
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
  const { t } = useLanguage();
  return (
    <div className="flex gap-3">
      <Chip label={t('intake.yes')} active={value === true} onClick={() => onChange(true)} reduce={reduce} />
      <Chip label={t('intake.no')} active={value === false} onClick={() => onChange(false)} reduce={reduce} />
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
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => ref.current?.focus(), 320);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full bg-transparent outline-none py-3.5 text-lg placeholder:opacity-35 border-b-2"
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-deep)',
        transition: 'border-color 0.2s ease',
      }}
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
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => ref.current?.focus(), 320);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 text-base placeholder:opacity-35"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-deep)',
          transition: 'border-color 0.2s ease',
          paddingBottom: '2.75rem',
        }}
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
  const { locale, t } = useLanguage();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<IntakeValues>(INITIAL_VALUES);

  const [specificEvents, setSpecificEvents] = useState('');
  const [feelingsSensations, setFeelingsSensations] = useState('');
  const [wellbeingAtIntake, setWellbeingAtIntake] = useState<number | null>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [step, intakeProcessing]);

  const handleNext = () => {
    if (!canProceed(step, values, specificEvents, feelingsSensations, wellbeingAtIntake)) return;
    if (step === TOTAL_STEPS - 1) {
      handleIntakeAISynthesis();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (intakeProcessing === 'ready') {
      setIntakeProcessing('idle');
      setStep(TOTAL_STEPS - 1);
      return;
    }
    if (intakeProcessing === 'loading') return;
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
        values.livingSituation === 'other' && values.livingSituationDetail.trim()
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
      solutionVision: values.solutionVision.trim() || undefined,
      createdAt: Date.now(),
    };
  };

  const handleIntakeAISynthesis = async () => {
    setStep(TOTAL_STEPS); // advance past all form steps so the last step renders as a bubble
    setIntakeProcessing('loading');
    try {
      const patient = await buildPatient();
      const result = await synthesizeConflicts(
        [values.consultationReason, specificEvents, feelingsSensations],
        patient,
        undefined,
        undefined,
        [],
        locale,
      );
      setIntakeSynthesis(result);
      setIntakeProcessing('ready');
    } catch {
      setIntakeProcessing('idle');
      setStep(TOTAL_STEPS - 1);
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
      wellbeingBefore: wellbeingAtIntake ?? undefined,
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

  const isReady = canProceed(step, values, specificEvents, feelingsSensations, wellbeingAtIntake);

  return (
    <div
      className="min-h-dvh flex flex-col max-w-[680px] mx-auto px-6 pt-6 pb-48"
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        if ((e.target as HTMLElement).matches('textarea, input, button')) return;
        if (canProceed(step, values, specificEvents, feelingsSensations, wellbeingAtIntake)) handleNext();
      }}
    >
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
          <span className="text-sm">{t('intake.back')}</span>
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
          const answer = getStepAnswer(i, values, specificEvents, feelingsSensations, wellbeingAtIntake, t);
          if (!answer) return null;
          return (
            <motion.div
              key={`answered-${i}`}
              initial={false}
              animate={{ opacity: 0.6 }}
              className="space-y-1.5"
            >
              <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                {getStepQuestion(i, values, t)}
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
              {/* Welcome message shown only on first step */}
              {step === 0 && (
                <div className="space-y-1">
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
                  >
                    {t('intake.welcome')}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', opacity: 0.7 }}
                  >
                    {t('intake.time.estimate')}
                  </p>
                </div>
              )}

              <p
                className="text-xl leading-snug"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
              >
                {getStepQuestion(step, values, t)}
              </p>

              <StepInput
                step={step}
                values={values}
                set={set}
                reduce={shouldReduce}
                specificEvents={specificEvents}
                setSpecificEvents={setSpecificEvents}
                feelingsSensations={feelingsSensations}
                setFeelingsSensations={setFeelingsSensations}
                wellbeingAtIntake={wellbeingAtIntake}
                setWellbeingAtIntake={setWellbeingAtIntake}
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
                t('intake.processing.1'),
                t('intake.processing.2'),
                t('intake.processing.3'),
              ]}
            />
          </motion.div>
        )}

        {/* AI Result */}
        {intakeProcessing === 'ready' && intakeSynthesis && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '1rem' }}
          >
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
                {t('intake.result.label')}
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

            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                color: 'var(--color-deep)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {t('intake.result.start')}
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
              {t('intake.result.cta')}
            </motion.button>
            <button
              type="button"
              onClick={() => { setIntakeProcessing('idle'); setStep(9); }}
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
              {t('intake.result.adjust')}
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
          {step === TOTAL_STEPS - 1 ? t('intake.continue') : t('intake.next')}
        </motion.button>
      </FloatingBar>

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
  set,
  reduce,
  specificEvents,
  setSpecificEvents,
  feelingsSensations,
  setFeelingsSensations,
  wellbeingAtIntake,
  setWellbeingAtIntake,
}: {
  step: number;
  values: IntakeValues;
  set: <K extends keyof IntakeValues>(key: K, val: IntakeValues[K]) => void;
  reduce: boolean | null;
  specificEvents: string;
  setSpecificEvents: (v: string) => void;
  feelingsSensations: string;
  setFeelingsSensations: (v: string) => void;
  wellbeingAtIntake: number | null;
  setWellbeingAtIntake: (v: number | null) => void;
}) {
  const { t } = useLanguage();

  const genderOptions: { value: Gender; label: string }[] = [
    { value: 'female', label: t('intake.gender.female') },
    { value: 'male', label: t('intake.gender.male') },
    { value: 'other', label: t('intake.gender.other') },
  ];
  const maritalOptions: { value: MaritalStatus; label: string }[] = [
    { value: 'single', label: t('intake.marital.single') },
    { value: 'partnered', label: t('intake.marital.partner') },
    { value: 'married', label: t('intake.marital.married') },
    { value: 'divorced', label: t('intake.marital.divorced') },
    { value: 'widowed', label: t('intake.marital.widowed') },
    { value: 'separated', label: t('intake.marital.separated') },
  ];
  const livingOptions: { value: LivingSituation; label: string }[] = [
    { value: 'alone', label: t('intake.living.alone') },
    { value: 'with-partner', label: t('intake.living.partner') },
    { value: 'with-family', label: t('intake.living.family') },
    { value: 'with-housemates', label: t('intake.living.housemates') },
    { value: 'with-parents', label: t('intake.living.parents') },
    { value: 'other', label: t('intake.living.other') },
  ];
  const employmentOptions: { value: EmploymentStatus; label: string }[] = [
    { value: 'employed', label: t('intake.employment.employed') },
    { value: 'unemployed', label: t('intake.employment.unemployed') },
    { value: 'student', label: t('intake.employment.student') },
    { value: 'freelance', label: t('intake.employment.freelance') },
    { value: 'retired', label: t('intake.employment.retired') },
    { value: 'other', label: t('intake.employment.other') },
  ];

  const subLabel = (text: string) => (
    <p className="text-sm" style={{ color: 'var(--color-muted)', marginBottom: '0.5rem' }}>{text}</p>
  );

  switch (step) {
    case 0:
      return (
        <TextArea
          value={values.consultationReason}
          onChange={v => set('consultationReason', v)}
          placeholder={t('intake.placeholder.reason')}
          autoFocus
          rows={4}
        />
      );

    case 1:
      return (
        <TextInput
          value={values.name}
          onChange={v => set('name', v)}
          placeholder={t('intake.placeholder.name')}
          autoFocus
        />
      );

    case 2:
      return (
        <TextArea
          value={specificEvents}
          onChange={setSpecificEvents}
          placeholder={t('intake.placeholder.events')}
          autoFocus
          rows={5}
        />
      );

    case 3:
      return (
        <TextArea
          value={feelingsSensations}
          onChange={setFeelingsSensations}
          placeholder={t('intake.placeholder.feelings')}
          autoFocus
          rows={5}
        />
      );

    case 4:
      return (
        <TextArea
          value={values.solutionVision}
          onChange={v => set('solutionVision', v)}
          placeholder={t('intake.placeholder.goal')}
          autoFocus
          rows={4}
        />
      );

    case 5: {
      const ageNum = parseInt(values.age);
      const isTooYoung = values.age.length > 0 && !isNaN(ageNum) && ageNum < 18;
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            <TextInput
              value={values.age}
              onChange={v => set('age', v)}
              placeholder={t('intake.placeholder.age')}
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
                {t('intake.age.tooyoung')}
              </motion.p>
            )}
          </div>
          <div>
            {subLabel(t('intake.q3'))}
            <div className="flex flex-wrap gap-3">
              {genderOptions.map(({ value, label }) => (
                <Chip key={value} label={label} active={values.gender === value} onClick={() => set('gender', value)} reduce={reduce} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 6:
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {maritalOptions.map(({ value, label }) => (
              <Chip key={value} label={label} active={values.maritalStatus === value} onClick={() => set('maritalStatus', value)} reduce={reduce} />
            ))}
          </div>
          <div>
            {subLabel(t('intake.q5'))}
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
                      placeholder={t('intake.placeholder.children')}
                      type="number"
                      min={1}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      );

    case 7:
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {livingOptions.map(({ value, label }) => (
                <Chip key={value} label={label} active={values.livingSituation === value} onClick={() => set('livingSituation', value)} reduce={reduce} />
              ))}
            </div>
            <AnimatePresence>
              {values.livingSituation === 'other' && (
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
                    placeholder={t('intake.placeholder.living.detail')}
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            {subLabel(t('intake.q7'))}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {employmentOptions.map(({ value, label }) => (
                  <Chip key={value} label={label} active={values.employment === value} onClick={() => set('employment', value)} reduce={reduce} />
                ))}
              </div>
              <TextInput
                value={values.occupation}
                onChange={v => set('occupation', v)}
                placeholder={t('intake.placeholder.occupation')}
              />
            </div>
          </div>
        </div>
      );

    case 8:
      return (
        <div className="space-y-5">
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
                    placeholder={t('intake.placeholder.support')}
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            {subLabel(t('intake.q9'))}
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
                      placeholder={t('intake.placeholder.therapy')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div>
            {subLabel(t('intake.q10'))}
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
                      placeholder={t('intake.placeholder.medication')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      );

    case 9: {
      const wellbeingOpts = [1,2,3,4,5].map(v => ({ value: v, label: t(`checkin.wellbeing.${v}`) }));
      return (
        <div className="flex flex-wrap gap-3">
          {wellbeingOpts.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={wellbeingAtIntake === opt.value}
              onClick={() => setWellbeingAtIntake(opt.value)}
              reduce={reduce}
            />
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
