'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Memory, FrameworkMatch } from '@/lib/types';
import { extractMemoryKeywords } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { generateId } from '@/lib/id';

interface StageMemoriesProps {
  session: PatientSession;
  patient: Patient;
  onAdvance: (memories: Memory[], unmapped: string[]) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

type MemoryForm = { raw: string; feelingThen: string; feelingNow: string };
const EMPTY_FORM: MemoryForm = { raw: '', feelingThen: '', feelingNow: '' };

const FORM_QUESTIONS: { field: keyof MemoryForm; label: string; placeholder: string }[] = [
  { field: 'raw', label: '¿Qué recuerdo te viene a la mente?', placeholder: 'Describe una situación del pasado...' },
  { field: 'feelingThen', label: '¿Cómo te sentiste en ese momento?', placeholder: 'Describe tus emociones entonces...' },
  { field: 'feelingNow', label: '¿Cómo te sientes ahora al recordarlo?', placeholder: 'Describe lo que sientes al contarlo hoy...' },
];

function formatFrameworks(matches: FrameworkMatch[]): string {
  return matches.map(m => `${m.role === 'primary' ? 'Marco primario' : m.role === 'secondary' ? 'Marco secundario' : 'Marco Gestalt'}: ${m.name} — ${m.focus}`).join('\n');
}

export function StageMemories({ session, patient: _patient, onAdvance, onUpdate }: StageMemoriesProps) {
  const shouldReduce = useReducedMotion();
  const [memories, setMemories] = useState<Memory[]>(session.memories);
  const [form, setForm] = useState<MemoryForm>(EMPTY_FORM);
  const [formStep, setFormStep] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isFormActive, setIsFormActive] = useState(session.memories.length === 0);
  const [groundingDone, setGroundingDone] = useState(session.memories.length > 0);

  const currentQ = FORM_QUESTIONS[formStep];

  const handleFormNext = async () => {
    if (formStep < 2) {
      setFormStep(s => s + 1);
      return;
    }
    if (!form.raw.trim()) return;
    setIsExtracting(true);
    try {
      const frameworksStr = formatFrameworks(session.frameworkMatches);
      const keywords = await extractMemoryKeywords(form, frameworksStr);
      const memory: Memory = {
        id: generateId(),
        raw: form.raw,
        feelingThen: form.feelingThen,
        feelingNow: form.feelingNow,
        keywords,
        sessionNumber: session.sessionNumber,
      };
      const updated = [...memories, memory];
      setMemories(updated);
      onUpdate({ memories: updated });
      setForm(EMPTY_FORM);
      setFormStep(0);
      setIsFormActive(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtracting(false);
    }
  };

  const canProceed = form[currentQ.field].trim().length > 10;

  return (
    <div className="space-y-8 pb-48">
      {/* Header — Fase 1: Regulación y seguridad */}
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Fase 1 — Regulación y seguridad
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          Un espacio seguro para recordar
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Antes de explorar tus recuerdos, vamos a crear un espacio de calma. Respira, date permiso para ir a tu ritmo.
        </p>
      </div>

      {/* Elemento de contención / grounding */}
      {!groundingDone && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
            Tómate un momento. Siente el contacto de tus pies con el suelo, nota tu respiración. No hay prisa.
            Cuando te sientas listo/a, vamos a explorar juntos un recuerdo que conecte con lo que estás viviendo.
          </p>
          <motion.button
            type="button"
            onClick={() => setGroundingDone(true)}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--color-sage)' }}
          >
            Estoy listo/a
          </motion.button>
        </motion.div>
      )}

      {/* Puente: chips de conflictos de la etapa anterior */}
      {groundingDone && session.conflicts.length > 0 && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap gap-2 items-center"
        >
          <span className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            Relacionado con:
          </span>
          {session.conflicts.map(c => (
            <span
              key={c.id}
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'var(--color-surface)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-card)' }}
            >
              {c.synthesized}
            </span>
          ))}
        </motion.div>
      )}

      {/* Recuerdos guardados */}
      <AnimatePresence>
        {groundingDone && memories.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="italic leading-relaxed" style={{ color: 'var(--color-deep)' }}>&ldquo;{m.raw}&rdquo;</p>
            {m.keywords.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {m.keywords.map(kw => (
                    <motion.span
                      key={kw}
                      className="px-2.5 py-1 rounded-full text-xs"
                      style={{ background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}
                      initial={shouldReduce ? {} : { scale: 0.8, opacity: 0 }}
                      animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
                      whileHover={shouldReduce ? {} : { scale: 1.04 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      {kw}
                    </motion.span>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                  Palabras clave que la IA identificó en tu recuerdo
                </p>
              </div>
            )}
            <div className="text-sm space-y-1 pt-1 border-t" style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
              <p>Entonces: <span style={{ color: 'var(--color-deep)' }}>{m.feelingThen}</span></p>
              <p>Ahora: <span style={{ color: 'var(--color-deep)' }}>{m.feelingNow}</span></p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Botón para añadir otro recuerdo si ya hay alguno */}
      {groundingDone && memories.length > 0 && !isFormActive && (
        <motion.button
          type="button"
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsFormActive(true)}
          className="text-sm font-medium"
          style={{ color: 'var(--color-sage)' }}
        >
          + Agregar otro recuerdo
        </motion.button>
      )}

      {/* Formulario de recuerdo */}
      <AnimatePresence>
        {groundingDone && isFormActive && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            className="space-y-5"
          >
            {/* Indicador de paso */}
            <div className="flex gap-1.5">
              {FORM_QUESTIONS.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
                  style={{ background: i <= formStep ? 'var(--color-sage)' : 'var(--color-border)' }} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={formStep}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className="space-y-4"
              >
                <p className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
                  {currentQ.label}
                </p>
                <textarea
                  value={form[currentQ.field]}
                  onChange={e => setForm(prev => ({ ...prev, [currentQ.field]: e.target.value }))}
                  placeholder={currentQ.placeholder}
                  rows={4}
                  autoFocus
                  className="w-full bg-transparent outline-none resize-none p-4 rounded-xl border-2 transition-all"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </motion.div>
            </AnimatePresence>

            {isExtracting && <AIThinking phrases={['Escuchando el recuerdo...', 'Extrayendo la esencia...']} />}
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingBar visible={groundingDone}>
        <div className="space-y-3">
          {isFormActive && (
            <motion.button
              type="button"
              onClick={handleFormNext}
              disabled={!canProceed || isExtracting}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-3.5 rounded-xl font-medium text-white disabled:opacity-40"
              style={{ background: 'var(--color-sage)' }}
            >
              {formStep < 2 ? 'Siguiente' : isExtracting ? 'Guardando...' : 'Guardar recuerdo'}
            </motion.button>
          )}
          {memories.length >= 1 && (
            <>
              <motion.button
                type="button"
                onClick={() => onAdvance(memories, [])}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ background: isFormActive ? 'transparent' : 'var(--color-sage)', color: isFormActive ? 'var(--color-sage)' : 'white', border: isFormActive ? '1px solid var(--color-sage)' : 'none' }}
              >
                Continuar a interpretación ({memories.length} {memories.length === 1 ? 'recuerdo' : 'recuerdos'}) →
              </motion.button>
              {!isFormActive && (
                <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                  1 recuerdo es suficiente. Cada uno que añades da más profundidad.
                </p>
              )}
            </>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
