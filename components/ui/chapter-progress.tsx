'use client';

import { motion } from 'motion/react';

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
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {STAGES.map((stage, index) => {
          const isDone = stage.number < currentStage;
          const isActive = stage.number === currentStage;

          return (
            <div key={stage.number} className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                {isDone ? (
                  <motion.svg
                    width="10" height="10" viewBox="0 0 10 10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.circle
                      cx="5" cy="5" r="4"
                      fill="none"
                      stroke="var(--color-sage)"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                    <circle cx="5" cy="5" r="2.5" fill="var(--color-sage)" />
                  </motion.svg>
                ) : isActive ? (
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-[var(--color-sage)]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--color-muted)] opacity-30" />
                )}
              </div>

              {index < STAGES.length - 1 && (
                <div className="w-6 h-px bg-[var(--color-border)]" />
              )}
            </div>
          );
        })}
      </div>

      <motion.span
        key={currentStage}
        initial={{ opacity: 0, x: 4 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs text-[var(--color-muted)] ml-2"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {STAGES[currentStage - 1].name}
      </motion.span>
    </div>
  );
}
