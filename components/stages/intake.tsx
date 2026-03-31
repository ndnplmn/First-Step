'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type {
  Patient,
  PatientSession,
  Gender,
  MaritalStatus,
  LivingSituation,
  EmploymentStatus,
} from '@/lib/types';
import { generatePatientId, generateId } from '@/lib/id';
import { FloatingBar } from '@/components/ui/floating-bar';
import { ChapterTransition } from '@/components/ui/chapter-transition';
import { ArrowLeft, CaretDown, Check } from '@phosphor-icons/react';

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
/*  Section metadata                                                   */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  'Sobre ti',
  'Tu situación personal',
  'Ocupación',
  'Tu red de apoyo',
  'Tu historial y motivo',
] as const;

/* ------------------------------------------------------------------ */
/*  Completion helpers                                                 */
/* ------------------------------------------------------------------ */

function isSectionComplete(index: number, v: IntakeValues): boolean {
  switch (index) {
    case 0:
      return v.name.trim().length > 0 && parseInt(v.age) > 0 && parseInt(v.age) < 120;
    case 1:
      return v.hasChildren !== null;
    case 2:
      return true; // always complete
    case 3:
      return v.hasSupportNetwork !== null;
    case 4:
      return (
        v.previousTherapy !== null &&
        v.takingMedication !== null &&
        v.consultationReason.trim().length > 0
      );
    default:
      return false;
  }
}

function allSectionsComplete(v: IntakeValues): boolean {
  return SECTIONS.every((_, i) => isSectionComplete(i, v));
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
      className="px-4 py-2.5 rounded-xl text-sm font-medium"
      style={{
        background: active ? 'var(--color-sage)' : 'var(--color-surface)',
        color: active ? 'white' : 'var(--color-deep)',
        boxShadow: 'var(--shadow-card)',
        transition: 'background 0.2s ease, color 0.2s ease',
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full bg-transparent outline-none py-3 text-lg placeholder:opacity-40 border-b-2"
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full bg-transparent outline-none resize-none p-4 rounded-xl border-2 text-base placeholder:opacity-40"
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-deep)' }}>
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function Intake({ onComplete, onBack }: IntakeProps) {
  const shouldReduce = useReducedMotion();
  const [values, setValues] = useState<IntakeValues>(INITIAL_VALUES);
  const [openSection, setOpenSection] = useState<number>(0);
  const [pendingData, setPendingData] = useState<{
    patient: Patient;
    session: PatientSession;
  } | null>(null);
  const [showTransition, setShowTransition] = useState(false);

  /* helpers */
  const set = useCallback(
    <K extends keyof IntakeValues>(key: K, val: IntakeValues[K]) => {
      setValues(prev => {
        const next = { ...prev, [key]: val };

        // Auto-advance: if current section just became complete, open next incomplete
        const currentComplete = isSectionComplete(openSection, next);
        if (currentComplete) {
          for (let i = 0; i < SECTIONS.length; i++) {
            if (i !== openSection && !isSectionComplete(i, next)) {
              // use setTimeout so state update finishes first
              setTimeout(() => setOpenSection(i), 300);
              break;
            }
          }
        }
        return next;
      });
    },
    [openSection],
  );

  const toggleSection = (i: number) => {
    setOpenSection(prev => (prev === i ? -1 : i));
  };

  const completedCount = SECTIONS.reduce(
    (n, _, i) => n + (isSectionComplete(i, values) ? 1 : 0),
    0,
  );

  /* submit */
  const handleSubmit = () => {
    if (!allSectionsComplete(values)) return;

    const patient: Patient = {
      id: generatePatientId(),
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
    <div className="min-h-screen flex flex-col max-w-[680px] mx-auto px-6 pt-10 pb-48">
      {/* Back button */}
      <motion.button
        type="button"
        onClick={onBack}
        whileTap={shouldReduce ? {} : { scale: 0.97 }}
        className="flex items-center gap-2 mb-10 self-start"
        style={{ color: 'var(--color-muted)' }}
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Volver</span>
      </motion.button>

      {/* Progress bars */}
      <div className="mb-8 space-y-3">
        <p
          className="text-xs"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
        >
          Tu perfil · {completedCount} de {SECTIONS.length} secciones
        </p>
        <div className="flex items-center gap-1">
          {SECTIONS.map((_, i) => (
            <div
              key={i}
              className="h-[3px] rounded-full transition-all duration-300"
              style={{
                width: 28,
                background: isSectionComplete(i, values)
                  ? 'var(--color-deep)'
                  : i === openSection
                    ? 'var(--color-sage)'
                    : 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Accordion */}
      <div className="flex-1 space-y-3">
        {SECTIONS.map((title, i) => {
          const isOpen = openSection === i;
          const complete = isSectionComplete(i, values);

          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => toggleSection(i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {complete && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--color-sage)' }}
                    >
                      <Check size={12} weight="bold" color="white" />
                    </div>
                  )}
                  <span
                    className="text-base font-medium"
                    style={{ color: 'var(--color-deep)' }}
                  >
                    {title}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <CaretDown size={18} style={{ color: 'var(--color-muted)' }} />
                </motion.div>
              </button>

              {/* Body */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-6">
                      {i === 0 && <SectionAboutYou values={values} set={set} reduce={shouldReduce} />}
                      {i === 1 && <SectionPersonal values={values} set={set} reduce={shouldReduce} />}
                      {i === 2 && <SectionOccupation values={values} set={set} />}
                      {i === 3 && <SectionSupport values={values} set={set} reduce={shouldReduce} />}
                      {i === 4 && <SectionHistory values={values} set={set} reduce={shouldReduce} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <FloatingBar visible={allSectionsComplete(values)}>
        <motion.button
          type="button"
          onClick={handleSubmit}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{ background: 'var(--color-sage)' }}
        >
          Comenzar mi proceso
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
/*  Section 0 — Sobre ti                                               */
/* ------------------------------------------------------------------ */

type SectionProps = {
  values: IntakeValues;
  set: <K extends keyof IntakeValues>(key: K, val: IntakeValues[K]) => void;
  reduce?: boolean | null;
};

function SectionAboutYou({ values, set, reduce }: SectionProps) {
  const genders: Gender[] = ['Femenino', 'Masculino', 'Otro'];

  return (
    <>
      <div>
        <FieldLabel>¿Cómo te llamas?</FieldLabel>
        <TextInput
          value={values.name}
          onChange={v => set('name', v)}
          placeholder="Tu nombre"
        />
      </div>
      <div>
        <FieldLabel>¿Cuántos años tienes?</FieldLabel>
        <TextInput
          value={values.age}
          onChange={v => set('age', v)}
          placeholder="Tu edad"
          type="number"
          min={1}
          max={120}
        />
      </div>
      <div>
        <FieldLabel>¿Cómo te identificas?</FieldLabel>
        <div className="flex flex-wrap gap-3">
          {genders.map(g => (
            <Chip
              key={g}
              label={g}
              active={values.gender === g}
              onClick={() => set('gender', g)}
              reduce={reduce ?? null}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 1 — Tu situación personal                                  */
/* ------------------------------------------------------------------ */

function SectionPersonal({ values, set, reduce }: SectionProps) {
  const statuses: MaritalStatus[] = [
    'Soltero/a',
    'En pareja',
    'Casado/a',
    'Divorciado/a',
    'Viudo/a',
    'Separado/a',
  ];
  const situations: LivingSituation[] = [
    'Solo/a',
    'Con pareja',
    'Con familia',
    'Con compañeros',
    'Con padres',
    'Otro',
  ];

  return (
    <>
      <div>
        <FieldLabel>Estado civil</FieldLabel>
        <div className="flex flex-wrap gap-3">
          {statuses.map(s => (
            <Chip
              key={s}
              label={s}
              active={values.maritalStatus === s}
              onClick={() => set('maritalStatus', s)}
              reduce={reduce ?? null}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>¿Tienes hijos?</FieldLabel>
        <YesNo
          value={values.hasChildren}
          onChange={v => set('hasChildren', v)}
          reduce={reduce ?? null}
        />
        <AnimatePresence>
          {values.hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <TextInput
                  value={values.childrenCount}
                  onChange={v => set('childrenCount', v)}
                  placeholder="¿Cuántos?"
                  type="number"
                  min={1}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <FieldLabel>¿Con quién vives?</FieldLabel>
        <div className="flex flex-wrap gap-3">
          {situations.map(s => (
            <Chip
              key={s}
              label={s}
              active={values.livingSituation === s}
              onClick={() => set('livingSituation', s)}
              reduce={reduce ?? null}
            />
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
              <div className="mt-3">
                <TextInput
                  value={values.livingSituationDetail}
                  onChange={v => set('livingSituationDetail', v)}
                  placeholder="Cuéntanos más"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 2 — Ocupación                                              */
/* ------------------------------------------------------------------ */

function SectionOccupation({ values, set }: SectionProps) {
  const employments: EmploymentStatus[] = [
    'Empleado/a',
    'Desempleado/a',
    'Estudiante',
    'Independiente',
    'Jubilado/a',
    'Otro',
  ];

  return (
    <>
      <div>
        <FieldLabel>Situación laboral</FieldLabel>
        <div className="flex flex-wrap gap-3">
          {employments.map(e => (
            <Chip
              key={e}
              label={e}
              active={values.employment === e}
              onClick={() => set('employment', e)}
              reduce={null}
            />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>¿A qué te dedicas?</FieldLabel>
        <TextInput
          value={values.occupation}
          onChange={v => set('occupation', v)}
          placeholder="Opcional"
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 3 — Tu red de apoyo                                        */
/* ------------------------------------------------------------------ */

function SectionSupport({ values, set, reduce }: SectionProps) {
  return (
    <>
      <div>
        <FieldLabel>¿Tienes personas de confianza con quienes puedas hablar?</FieldLabel>
        <YesNo
          value={values.hasSupportNetwork}
          onChange={v => set('hasSupportNetwork', v)}
          reduce={reduce ?? null}
        />
        <AnimatePresence>
          {values.hasSupportNetwork && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <TextArea
                  value={values.supportDescription}
                  onChange={v => set('supportDescription', v)}
                  placeholder="Cuéntame brevemente sobre ellas"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 4 — Tu historial y motivo                                  */
/* ------------------------------------------------------------------ */

function SectionHistory({ values, set, reduce }: SectionProps) {
  return (
    <>
      <div>
        <FieldLabel>¿Has ido a terapia antes?</FieldLabel>
        <YesNo
          value={values.previousTherapy}
          onChange={v => set('previousTherapy', v)}
          reduce={reduce ?? null}
        />
        <AnimatePresence>
          {values.previousTherapy && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <TextInput
                  value={values.previousTherapyDetail}
                  onChange={v => set('previousTherapyDetail', v)}
                  placeholder="¿Qué tipo? ¿Hace cuánto?"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <FieldLabel>¿Tomas algún medicamento psiquiátrico?</FieldLabel>
        <YesNo
          value={values.takingMedication}
          onChange={v => set('takingMedication', v)}
          reduce={reduce ?? null}
        />
        <AnimatePresence>
          {values.takingMedication && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <TextInput
                  value={values.medicationDetail}
                  onChange={v => set('medicationDetail', v)}
                  placeholder="¿Cuál?"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <FieldLabel>¿Qué te trae aquí hoy?</FieldLabel>
        <TextArea
          value={values.consultationReason}
          onChange={v => set('consultationReason', v)}
          placeholder="Escribe lo que sientas, no hay respuestas incorrectas"
        />
      </div>
    </>
  );
}
