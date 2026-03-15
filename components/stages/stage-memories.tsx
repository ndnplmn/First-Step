'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PatientSession, Memory } from '@/lib/types';
import { extractMemoryKeywords } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { generateId } from '@/lib/id';

interface StageMemoriesProps {
  session: PatientSession;
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

export function StageMemories({ session, onAdvance, onUpdate }: StageMemoriesProps) {
  const [memories, setMemories] = useState<Memory[]>(session.memories);
  const [form, setForm] = useState<MemoryForm>(EMPTY_FORM);
  const [formStep, setFormStep] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);

  const currentQ = FORM_QUESTIONS[formStep];

  const handleFormNext = async () => {
    if (formStep < 2) {
      setFormStep(s => s + 1);
      return;
    }
    if (!form.raw.trim()) return;
    setIsExtracting(true);
    try {
      const keywords = await extractMemoryKeywords(
        form,
        session.theoryMatch?.key || 'psychoanalytic',
        session.theoryMatch?.subCategory || ''
      );
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtracting(false);
    }
  };

  const canProceed = form[currentQ.field].trim().length > 10;

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 3 — Recuerdos
        </p>
        <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
          Viaja a tus recuerdos
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Piensa en situaciones del pasado relacionadas con lo que sientes.
        </p>
      </div>

      <AnimatePresence>
        {memories.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="italic leading-relaxed" style={{ color: 'var(--color-deep)' }}>"{m.raw}"</p>
            <div className="flex flex-wrap gap-1.5">
              {m.keywords.map(kw => (
                <span key={kw} className="px-2.5 py-1 rounded-full text-xs" style={{ background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}>
                  {kw}
                </span>
              ))}
            </div>
            <div className="text-sm space-y-1 pt-1 border-t" style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
              <p>Entonces: <span style={{ color: 'var(--color-deep)' }}>{m.feelingThen}</span></p>
              <p>Ahora: <span style={{ color: 'var(--color-deep)' }}>{m.feelingNow}</span></p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          {memories.length === 0 ? 'Primer recuerdo' : 'Agregar otro recuerdo'}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={formStep}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="space-y-3"
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
        <div className="flex gap-1.5">
          {FORM_QUESTIONS.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= formStep ? 'var(--color-sage)' : 'var(--color-border)' }} />
          ))}
        </div>
        {isExtracting && <AIThinking />}
      </div>

      <FloatingBar visible={true}>
        <div className="space-y-3">
          <button
            onClick={handleFormNext}
            disabled={!canProceed || isExtracting}
            className="w-full py-3.5 rounded-xl font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--color-sage)' }}
          >
            {formStep < 2 ? 'Siguiente' : isExtracting ? 'Guardando...' : 'Guardar recuerdo'}
          </button>
          {memories.length >= 1 && (
            <button
              onClick={() => onAdvance(memories, [])}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ color: 'var(--color-sage)', border: '1px solid var(--color-sage)' }}
            >
              Continuar a interpretación ({memories.length} {memories.length === 1 ? 'recuerdo' : 'recuerdos'}) →
            </button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
