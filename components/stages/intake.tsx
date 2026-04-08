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
} from '@/lib/types';
import { generateId } from '@/lib/id';
import { db } from '@/lib/db';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ChapterTransition } from '@/components/ui/chapter-transition';
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

const TOTAL_STEPS = 12;

function getStepQuestion(step: number, values: IntakeValues): string {
  switch (step) {
    case 0: return 'Antes de comenzar, ¿cómo te sientes hoy?';
    case 1: return '¿Cómo te llamas?';
    case 2: return values.name ? `¿Cuántos años tienes, ${values.name}?` : '¿Cuántos años tienes?';
    case 3: return '¿Cómo te identificas?';
    case 4: return '¿Cuál es tu estado civil?';
    case 5: return '¿Tienes hijos?';
    case 6: return '¿Con quién vives?';
    case 7: return '¿A qué te dedicas?';
    case 8: return '¿Tienes personas de confianza con quienes puedas hablar?';
    case 9: return '¿Has ido a terapia antes?';
    case 10: return '¿Tomas algún medicamento, ya sea psiquiátrico o de cualquier otro tipo?';
    case 11: return values.name ? `¿Qué te trae aquí hoy, ${values.name}?` : '¿Qué te trae aquí hoy?';
    default: return '';
  }
}

function getStepAnswer(step: number, values: IntakeValues, wellbeing: number | null): string | null {
  switch (step) {
    case 0: return wellbeing ? WELLBEING_OPTIONS.find(o => o.value === wellbeing)?.label ?? null : null;
    case 1: return values.name.trim() || null;
    case 2: return values.age || null;
    case 3: return values.gender;
    case 4: return values.maritalStatus;
    case 5: {
      if (values.hasChildren === null) return null;
      if (!values.hasChildren) return 'No';
      return values.childrenCount ? `Sí, ${values.childrenCount}` : 'Sí';
    }
    case 6: {
      if (values.livingSituation === 'Otro' && values.livingSituationDetail.trim()) {
        return values.livingSituationDetail.trim();
      }
      return values.livingSituation;
    }
    case 7: {
      const parts: string[] = [values.employment];
      if (values.occupation.trim()) parts.push(values.occupation.trim());
      return parts.join(' · ');
    }
    case 8: {
      if (values.hasSupportNetwork === null) return null;
      if (!values.hasSupportNetwork) return 'No';
      return values.supportDescription.trim() ? `Sí — ${values.supportDescription.trim()}` : 'Sí';
    }
    case 9: {
      if (values.previousTherapy === null) return null;
      if (!values.previousTherapy) return 'No';
      return values.previousTherapyDetail.trim() ? `Sí — ${values.previousTherapyDetail.trim()}` : 'Sí';
    }
    case 10: {
      if (values.takingMedication === null) return null;
      if (!values.takingMedication) return 'No';
      return values.medicationDetail.trim() ? `Sí — ${values.medicationDetail.trim()}` : 'Sí';
    }
    case 11: return values.consultationReason.trim() || null;
    default: return null;
  }
}

function canProceed(step: number, values: IntakeValues, wellbeing: number | null): boolean {
  switch (step) {
    case 0: return wellbeing !== null;
    case 1: return values.name.trim().length > 0;
    case 2: { const n = parseInt(values.age); return n > 0 && n < 120; }
    case 3: return true; // always has a default
    case 4: return true; // always has a default
    case 5: return values.hasChildren !== null;
    case 6: return values.livingSituation !== 'Otro' || values.livingSituationDetail.trim().length > 0;
    case 7: return true; // always has a default
    case 8: return values.hasSupportNetwork !== null;
    case 9: return values.previousTherapy !== null;
    case 10: return values.takingMedication !== null;
    case 11: return values.consultationReason.trim().length > 0;
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      autoFocus={autoFocus}
      className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 text-base placeholder:opacity-35"
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

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function Intake({ onComplete, onBack }: IntakeProps) {
  const shouldReduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<IntakeValues>(INITIAL_VALUES);
  const [wellbeing, setWellbeing] = useState<number | null>(null);
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
  }, [step]);

  const handleNext = () => {
    if (!canProceed(step, values, wellbeing)) return;
    if (step === TOTAL_STEPS - 1) {
      handleSubmit();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      onBack();
    } else {
      setStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    const user = await db.getUser();
    const patient: Patient = {
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

    const session: PatientSession = {
      id: generateId(),
      patientId: patient.id,
      sessionNumber: 1,
      stage: 2,
      conflicts: [],
      frameworkMatches: [],
      gestaltActivity: null,
      memories: [],
      interpretation: null,
      closure: null,
      unmappedPhrases: [],
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

  return (
    <div className="min-h-dvh flex flex-col max-w-[680px] mx-auto px-6 pt-6 pb-48">
      {/* Header with back + progress */}
      <div className="flex items-center gap-4 mb-6">
        <motion.button
          type="button"
          onClick={handleBack}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="flex items-center gap-2 flex-shrink-0"
          style={{ color: 'var(--color-muted)' }}
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
        {Array.from({ length: step }).map((_, i) => {
          const answer = getStepAnswer(i, values, wellbeing);
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

        {/* Current step */}
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
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating bar */}
      <FloatingBar visible={canProceed(step, values, wellbeing)}>
        <motion.button
          type="button"
          onClick={handleNext}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
          style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
        >
          {step === TOTAL_STEPS - 1 ? 'Comenzar mi proceso' : 'Siguiente'}
        </motion.button>
      </FloatingBar>

      {/* Chapter transition overlay */}
      <AnimatePresence>
        {showTransition && (
          <ChapterTransition toStage={2} onComplete={handleTransitionComplete} />
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
}: {
  step: number;
  values: IntakeValues;
  wellbeing: number | null;
  set: <K extends keyof IntakeValues>(key: K, val: IntakeValues[K]) => void;
  setWellbeing: (v: number) => void;
  reduce: boolean | null;
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
        <TextInput
          value={values.name}
          onChange={v => set('name', v)}
          placeholder="Tu nombre"
          autoFocus
        />
      );

    case 2:
      return (
        <TextInput
          value={values.age}
          onChange={v => set('age', v)}
          placeholder="Tu edad"
          type="number"
          min={1}
          max={120}
          autoFocus
        />
      );

    case 3:
      return (
        <div className="flex flex-wrap gap-3">
          {genders.map(g => (
            <Chip key={g} label={g} active={values.gender === g} onClick={() => set('gender', g)} reduce={reduce} />
          ))}
        </div>
      );

    case 4:
      return (
        <div className="flex flex-wrap gap-3">
          {statuses.map(s => (
            <Chip key={s} label={s} active={values.maritalStatus === s} onClick={() => set('maritalStatus', s)} reduce={reduce} />
          ))}
        </div>
      );

    case 5:
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

    case 6:
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

    case 7:
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

    case 8:
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

    case 9:
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

    case 10:
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

    case 11:
      return (
        <TextArea
          value={values.consultationReason}
          onChange={v => set('consultationReason', v)}
          placeholder="Escribe lo que sientas, no hay respuestas incorrectas"
          autoFocus
        />
      );

    default:
      return null;
  }
}
