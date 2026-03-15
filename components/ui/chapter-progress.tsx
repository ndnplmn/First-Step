'use client';

import { motion, useReducedMotion } from 'motion/react';

const STAGES = [
  { number: 1, name: 'Apertura' },
  { number: 2, name: 'Conflictos' },
  { number: 3, name: 'Recuerdos' },
  { number: 4, name: 'Comprensión' },
  { number: 5, name: 'Cierre' },
];

interface ChapterProgressProps {
  currentStage: 1 | 2 | 3 | 4 | 5;
}

export function ChapterProgress({ currentStage }: ChapterProgressProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {STAGES.map((stage) => {
          const isDone = stage.number < currentStage;
          const isActive = stage.number === currentStage;

          return (
            <motion.div
              key={stage.number}
              className="h-[3px] rounded-full"
              style={{
                width: 28,
                background: isDone
                  ? 'var(--color-deep)'
                  : isActive
                  ? 'var(--color-sage)'
                  : 'var(--color-border)',
              }}
              animate={
                isActive && !shouldReduce
                  ? { opacity: [1, 0.6, 1] }
                  : { opacity: 1 }
              }
              transition={
                isActive
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0 }
              }
              layout
            />
          );
        })}
      </div>

      <motion.span
        key={currentStage}
        initial={{ opacity: 0, x: 4 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs"
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-muted)' }}
      >
        {STAGES[currentStage - 1].name}
      </motion.span>
    </div>
  );
}
