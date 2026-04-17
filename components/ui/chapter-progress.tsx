'use client';

import { motion, useReducedMotion } from 'motion/react';

const STAGES = [
  { number: 2, name: 'Conflictos' },
  { number: 3, name: 'Exploración' },
  { number: 4, name: 'Comprensión' },
  { number: 5, name: 'Integración' },
  { number: 6, name: 'Cierre' },
];

interface ChapterProgressProps {
  currentStage: 1 | 2 | 3 | 4 | 5 | 6;
}

export function ChapterProgress({ currentStage }: ChapterProgressProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Stage name */}
      <motion.span
        key={currentStage}
        initial={shouldReduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {STAGES.find(s => s.number === currentStage)?.name ?? ''}
      </motion.span>

      {/* Track */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {STAGES.map((stage) => {
          const isDone = stage.number < currentStage;
          const isActive = stage.number === currentStage;

          return (
            <motion.div
              key={stage.number}
              style={{
                height: 3,
                borderRadius: 99,
                background: isDone
                  ? 'var(--color-deep)'
                  : isActive
                  ? 'var(--color-sage)'
                  : 'var(--color-border)',
              }}
              animate={{
                width: isActive ? 20 : 12,
                opacity: isActive
                  ? (shouldReduce ? 1 : [1, 0.45, 1])
                  : isDone
                  ? 1
                  : 0.35,
              }}
              transition={
                isActive && !shouldReduce
                  ? { opacity: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }, width: { duration: 0.3 } }
                  : { duration: 0.3 }
              }
            />
          );
        })}
      </div>
    </div>
  );
}
