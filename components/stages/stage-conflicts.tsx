'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { PatientSession, Conflict, TheoryMatch } from '@/lib/types';
import { synthesizeConflicts } from '@/actions/ai';
import { AICard } from '@/components/ai/ai-card';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { Plus, X } from '@phosphor-icons/react';

const THEORY_NAMES: Record<string, string> = {
  psychoanalytic: 'Psicoanalítica',
  cbt: 'Cognitivo-Conductual',
  gestalt: 'Gestalt',
  systemic: 'Sistémica Familiar',
};

interface StageConflictsProps {
  session: PatientSession;
  onAdvance: (conflicts: Conflict[], theoryMatch: TheoryMatch, unmapped: string[]) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

function UnmappedSection({ unmapped, shouldReduce }: { unmapped: string[]; shouldReduce: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px dashed var(--color-border)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
          Pendiente de análisis ({unmapped.length})
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'var(--color-muted)' }}
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                Estas frases no encajaron claramente en una teoría. Tu terapeuta puede explorarlas contigo.
              </p>
              {unmapped.map((phrase, i) => (
                <p
                  key={i}
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{
                    color: 'var(--color-muted)',
                    background: 'var(--color-surface)',
                    fontStyle: 'italic',
                  }}
                >
                  "{phrase}"
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StageConflicts({ session, onAdvance, onUpdate }: StageConflictsProps) {
  const shouldReduce = useReducedMotion();
  const [rawInput, setRawInput] = useState('');
  const [rawConflicts, setRawConflicts] = useState<string[]>(session.conflicts.map(c => c.raw));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    conflicts: Conflict[];
    theoryMatch: TheoryMatch;
    unmapped: string[];
  } | null>(
    session.conflicts.length > 0 && session.theoryMatch
      ? { conflicts: session.conflicts, theoryMatch: session.theoryMatch, unmapped: session.unmappedPhrases.map(u => u.text) }
      : null
  );

  const addConflict = () => {
    if (rawInput.trim().length < 5) return;
    setRawConflicts(prev => [...prev, rawInput.trim()]);
    setRawInput('');
    setResult(null);
  };

  const removeConflict = (idx: number) => {
    setRawConflicts(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const analyze = async () => {
    if (rawConflicts.length === 0) return;
    setIsAnalyzing(true);
    try {
      const data = await synthesizeConflicts(rawConflicts);
      setResult(data);
      onUpdate({ conflicts: data.conflicts, theoryMatch: data.theoryMatch });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-48">
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          Capítulo 2 — Conflictos
        </p>
        <h2 className="text-[40px] leading-tight breathe" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}>
          ¿Qué te trajo aquí hoy?
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Describe con tus propias palabras lo que te preocupa. Puedes agregar varios motivos.
        </p>
      </div>

      <AnimatePresence>
        {rawConflicts.map((conflict, i) => (
          <motion.div
            key={conflict + i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="flex-1 italic leading-relaxed" style={{ color: 'var(--color-deep)' }}>"{conflict}"</p>
            <motion.button
              type="button"
              onClick={() => removeConflict(i)}
              whileHover={shouldReduce ? {} : { x: 2 }}
              whileTap={shouldReduce ? {} : { scale: 0.9 }}
              className="mt-0.5 flex-shrink-0"
              style={{ color: 'var(--color-muted)' }}
            >
              <X size={16} />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="space-y-3">
        <textarea
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder="Escribe aquí un motivo..."
          rows={3}
          className="w-full bg-transparent outline-none resize-none p-4 rounded-xl border-2"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-deep)' }}
        />
        <button
          type="button"
          onClick={addConflict}
          disabled={rawInput.trim().length < 5}
          className="flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{ color: 'var(--color-sage)' }}
        >
          <Plus size={16} />
          Agregar motivo
        </button>
      </div>

      {isAnalyzing && (
        <AIThinking phrases={['Leyendo entre líneas...', 'Identificando patrones...', 'Conectando con la teoría...']} />
      )}

      {result && !isAnalyzing && (
        <AICard>
          <div className="space-y-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Lo que identifico en lo que describes:</p>
            <div className="flex flex-wrap gap-2">
              {result.conflicts.map(c => (
                <span
                  key={c.id}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ background: 'var(--color-sage)' }}
                >
                  {c.synthesized}
                </span>
              ))}
            </div>
            <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Teoría que guiará tu proceso:</p>
              <p className="font-medium mt-1" style={{ color: 'var(--color-deep)' }}>
                {THEORY_NAMES[result.theoryMatch.key]} — {result.theoryMatch.subCategory}
              </p>
            </div>
          </div>
        </AICard>
      )}

      {result && result.unmapped.length > 0 && (
        <UnmappedSection unmapped={result.unmapped} shouldReduce={!!shouldReduce} />
      )}

      <FloatingBar visible={rawConflicts.length > 0}>
        <div className="space-y-3">
          {!result ? (
            <motion.button
              type="button"
              onClick={analyze}
              disabled={isAnalyzing}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-3.5 rounded-xl font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-sage)' }}
            >
              {isAnalyzing ? 'Analizando...' : 'Analizar mis conflictos'}
            </motion.button>
          ) : (
            <>
              <motion.button
                type="button"
                onClick={analyze}
                whileTap={shouldReduce ? {} : { scale: 0.98 }}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ color: 'var(--color-sage)', border: '1px solid var(--color-sage)' }}
              >
                Re-analizar
              </motion.button>
              <motion.button
                type="button"
                onClick={() => onAdvance(result.conflicts, result.theoryMatch, result.unmapped)}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ background: 'var(--color-sage)' }}
              >
                Continuar a recuerdos →
              </motion.button>
            </>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
