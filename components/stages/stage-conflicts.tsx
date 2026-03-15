'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

export function StageConflicts({ session, onAdvance, onUpdate }: StageConflictsProps) {
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
            exit={{ opacity: 0, x: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="flex-1 italic leading-relaxed" style={{ color: 'var(--color-deep)' }}>"{conflict}"</p>
            <button
              onClick={() => removeConflict(i)}
              className="mt-0.5 transition-colors"
              style={{ color: 'var(--color-muted)' }}
              onMouseEnter={e => ((e.target as HTMLButtonElement).style.color = 'var(--color-terracotta)')}
              onMouseLeave={e => ((e.target as HTMLButtonElement).style.color = 'var(--color-muted)')}
            >
              <X size={16} />
            </button>
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
          onFocus={e => (e.target.style.borderColor = 'var(--color-sage)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
        />
        <button
          onClick={addConflict}
          disabled={rawInput.trim().length < 5}
          className="flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{ color: 'var(--color-sage)' }}
        >
          <Plus size={16} />
          Agregar motivo
        </button>
      </div>

      {isAnalyzing && <AIThinking />}

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

      <FloatingBar visible={rawConflicts.length > 0}>
        <div className="space-y-3">
          {!result ? (
            <button
              onClick={analyze}
              disabled={isAnalyzing}
              className="w-full py-3.5 rounded-xl font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-sage)' }}
            >
              {isAnalyzing ? 'Analizando...' : 'Analizar mis conflictos'}
            </button>
          ) : (
            <>
              <button
                onClick={analyze}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ color: 'var(--color-sage)', border: '1px solid var(--color-sage)' }}
              >
                Re-analizar
              </button>
              <button
                onClick={() => onAdvance(result.conflicts, result.theoryMatch, result.unmapped)}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ background: 'var(--color-sage)' }}
              >
                Continuar a recuerdos →
              </button>
            </>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
