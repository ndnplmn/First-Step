'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Patient, PatientSession, Memory, FrameworkMatch, ExplorationRecord } from '@/lib/types';
import { extractMemoryKeywords, synthesizeExploration } from '@/actions/ai';
import { AIThinking } from '@/components/ai/ai-thinking';
import { FloatingBar } from '@/components/ui/floating-bar';
import { generateId } from '@/lib/id';
import { useLanguage } from '@/contexts/language-context';

interface StageMemoriesProps {
  session: PatientSession;
  patient: Patient;
  priorSessions?: PatientSession[];
  onAdvance: (memories: Memory[], unmapped: string[], record: ExplorationRecord) => void;
  onUpdate: (updates: Partial<PatientSession>) => void;
}

type MemoryForm = { raw: string; feelingThen: string; feelingNow: string };
const EMPTY_FORM: MemoryForm = { raw: '', feelingThen: '', feelingNow: '' };

function formatFrameworks(matches: FrameworkMatch[]): string {
  return matches.map(m => `${m.name} — ${m.focus}`).join('\n');
}

export function StageMemories({ session, patient, priorSessions = [], onAdvance, onUpdate }: StageMemoriesProps) {
  const shouldReduce = useReducedMotion();
  const { locale, t } = useLanguage();

  const FORM_QUESTIONS: { field: keyof MemoryForm; label: string; placeholder: string }[] = [
    { field: 'raw', label: t('memories.form.q0.label'), placeholder: t('memories.form.q0.placeholder') },
    { field: 'feelingThen', label: t('memories.form.q1.label'), placeholder: t('memories.form.q1.placeholder') },
    { field: 'feelingNow', label: t('memories.form.q2.label'), placeholder: t('memories.form.q2.placeholder') },
  ];

  const [memories, setMemories] = useState<Memory[]>(session.memories);
  const [form, setForm] = useState<MemoryForm>(EMPTY_FORM);
  const [formStep, setFormStep] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isFormActive, setIsFormActive] = useState(session.memories.length === 0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [synthesisState, setSynthesisState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explorationRecord, setExplorationRecord] = useState<ExplorationRecord | null>(null);

  const currentQ = FORM_QUESTIONS[formStep];

  // Most recent prior session with an exploration record (same framework if possible)
  const lastExploration = [...priorSessions]
    .reverse()
    .find(s => s.explorationRecord?.framework === 'freudiano')?.explorationRecord
    ?? [...priorSessions].reverse().find(s => s.explorationRecord)?.explorationRecord;

  const handleFormNext = async () => {
    if (formStep < 2) {
      setFormStep(s => s + 1);
      return;
    }
    if (!form.raw.trim()) return;
    setIsExtracting(true);
    try {
      const frameworksStr = formatFrameworks(session.frameworkMatches);
      const keywords = await extractMemoryKeywords(form, frameworksStr, locale);
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

  const handleSynthesize = async (mems: Memory[]) => {
    setSynthesisState('loading');
    const rawData = mems.map((m, i) => [
      `Recuerdo ${i + 1}:`,
      `- Suceso: "${m.raw}"`,
      `- Sentimiento entonces: "${m.feelingThen}"`,
      `- Sentimiento ahora: "${m.feelingNow}"`,
      m.keywords.length ? `- Palabras clave: ${m.keywords.join(', ')}` : '',
    ].filter(Boolean).join('\n')).join('\n\n');

    try {
      const priorExplorations = priorSessions
        .filter(s => s.explorationRecord)
        .map(s => s.explorationRecord!);

      const record = await synthesizeExploration({
        rawData,
        patient,
        conflicts: session.conflicts,
        frameworkKey: 'freudiano',
        frameworkName: session.frameworkMatches[0]?.name ?? 'Exploración Psicoanalítica',
        stage3Type: 'memories',
        sessionNumber: session.sessionNumber,
        priorExplorations,
        locale,
      });
      setExplorationRecord(record);
      setSynthesisState('done');
    } catch (e) {
      console.error(e);
      // Fallback: advance without synthesis record
      setSynthesisState('idle');
      onAdvance(mems, [], {
        sessionNumber: session.sessionNumber,
        framework: 'freudiano',
        frameworkName: session.frameworkMatches[0]?.name ?? 'Exploración Psicoanalítica',
        stage3Type: 'memories',
        insights: [],
        aiReflection: '',
        completedAt: Date.now(),
      });
    }
  };

  const canProceed = form[currentQ.field].trim().length > 10;

  return (
    <div className="space-y-8 pb-48">
      {/* Header */}
      <div>
        <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          {t('memories.label')}
        </p>
        <h2
          className="leading-tight breathe"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 56px)',
            color: 'var(--color-deep)',
          }}
        >
          {t('memories.title')}
        </h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('memories.subtitle')}
        </p>
      </div>

      {/* Continuity banner — show prior exploration insights if they exist */}
      {lastExploration && lastExploration.insights.length > 0 && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--radius-card)] p-4 space-y-2"
          style={{ background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}>
            {t('memories.prior.title').replace('{n}', String(lastExploration.sessionNumber))}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lastExploration.insights.map(i => (
              <span
                key={i.theme}
                className="px-2.5 py-1 rounded-full text-xs"
                style={{ background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}
              >
                {i.theme}
              </span>
            ))}
          </div>
          <p className="text-xs leading-relaxed italic" style={{ color: 'var(--color-muted)' }}>
            {lastExploration.aiReflection}
          </p>
        </motion.div>
      )}

      {/* Intro con ejercicio de respiración opcional */}
      {memories.length === 0 && !isFormActive && synthesisState === 'idle' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div
            className="rounded-[var(--radius-card)] p-6 space-y-3"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-deep)' }}>
              {t('memories.intro.body')}
            </p>

            <AnimatePresence>
              {showBreathing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col items-center py-6 space-y-4">
                    <motion.div
                      className="w-16 h-16 rounded-full"
                      style={{ background: 'var(--color-sage)', opacity: 0.3 }}
                      animate={{ scale: [1, 1.4, 1.4, 1], opacity: [0.3, 0.5, 0.5, 0.3] }}
                      transition={{ duration: 14, repeat: Infinity, times: [0, 0.286, 0.571, 1] }}
                    />
                    <p className="text-xs text-center" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                      {t('memories.breathing.label')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-4">
              <motion.button
                type="button"
                onClick={() => setIsFormActive(true)}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="px-5 py-3 rounded-[var(--radius-inner)] text-sm font-semibold text-white"
                style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
              >
                {t('memories.intro.cta')}
              </motion.button>
              <button
                type="button"
                onClick={() => setShowBreathing(prev => !prev)}
                className="text-sm"
                style={{ color: 'var(--color-muted)' }}
              >
                {showBreathing ? t('memories.breathing.close') : t('memories.breathing.open')}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Puente: chips de conflictos de la etapa anterior */}
      {session.conflicts.length > 0 && synthesisState === 'idle' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap gap-2 items-center"
        >
          <span className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            {t('memories.related')}
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
      {synthesisState === 'idle' && (
        <AnimatePresence>
          {memories.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[var(--radius-card)] p-5 space-y-3"
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
                    {t('memories.keywords.label')}
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
      )}

      {/* Botón para añadir otro recuerdo */}
      {memories.length > 0 && !isFormActive && synthesisState === 'idle' && (
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
        {isFormActive && synthesisState === 'idle' && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            className="space-y-5"
          >
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
                  className="w-full bg-transparent outline-none resize-none p-4 rounded-[var(--radius-inner)] border-2 transition-all"
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

      {/* Synthesis loading */}
      {synthesisState === 'loading' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <AIThinking phrases={['Integrando lo explorado...', 'Encontrando los hilos...', 'Construyendo el mapa...']} />
        </motion.div>
      )}

      {/* Synthesis result */}
      {synthesisState === 'done' && explorationRecord && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-5"
        >
          <div
            className="rounded-[var(--radius-card)] p-5 space-y-4"
            style={{ background: 'rgba(107,94,158,0.06)', border: '1px solid rgba(107,94,158,0.15)' }}
          >
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-violet)', fontFamily: 'var(--font-mono)' }}>
              Lo que emergió en esta exploración
            </p>
            <p className="leading-relaxed" style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
              {explorationRecord.aiReflection}
            </p>
            {explorationRecord.insights.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {explorationRecord.insights.map((insight, i) => (
                    <motion.div
                      key={insight.theme}
                      initial={shouldReduce ? {} : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className="group relative"
                    >
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-medium cursor-default block"
                        style={{ background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}
                        title={insight.observation}
                      >
                        {insight.theme}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                  Estas piezas se acumulan sesión a sesión para que la IA te entienda mejor
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <FloatingBar visible>
        <div className="space-y-3">
          {isFormActive && synthesisState === 'idle' && (
            <motion.button
              type="button"
              onClick={handleFormNext}
              disabled={!canProceed || isExtracting}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-semibold text-white disabled:opacity-40 tracking-wide"
              style={{ background: 'var(--color-sage)', boxShadow: 'var(--shadow-glow-sage)' }}
            >
              {formStep < 2 ? 'Siguiente' : isExtracting ? 'Guardando...' : 'Guardar recuerdo'}
            </motion.button>
          )}
          {memories.length >= 1 && synthesisState === 'idle' && (
            <>
              <motion.button
                type="button"
                onClick={() => handleSynthesize(memories)}
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-semibold tracking-wide"
                style={{ background: isFormActive ? 'transparent' : 'var(--color-sage)', color: isFormActive ? 'var(--color-sage)' : 'white', border: isFormActive ? '1px solid var(--color-sage)' : 'none', boxShadow: isFormActive ? 'none' : 'var(--shadow-glow-sage)' }}
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
          {synthesisState === 'done' && explorationRecord && (
            <motion.button
              type="button"
              onClick={() => onAdvance(memories, [], explorationRecord)}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
              style={{ background: 'var(--color-violet)', boxShadow: 'var(--shadow-card)' }}
            >
              Continuar a la interpretación →
            </motion.button>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}
