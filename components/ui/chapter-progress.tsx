'use client';

import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/language-context';

const STAGE_NUMBERS = [2, 3, 4, 6] as const;

interface ChapterProgressProps {
  currentStage: 1 | 2 | 3 | 4 | 5 | 6;
}

export function ChapterProgress({ currentStage }: ChapterProgressProps) {
  const { t } = useLanguage();

  const stageNames: Record<number, string> = {
    2: t('chapter.stage.2.name'),
    3: t('chapter.stage.3.name'),
    4: t('chapter.stage.4.name'),
    6: t('chapter.stage.6.name'),
  };

  const displayStage = currentStage === 5 ? 6 : currentStage;
  const activeName = stageNames[displayStage] ?? '';

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Stage name */}
      <motion.span
        key={displayStage}
        initial={{ opacity: 0 }}
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
        {activeName}
      </motion.span>

      {/* Track */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {STAGE_NUMBERS.map((stage) => {
          const isDone = stage < displayStage;
          const isActive = stage === displayStage;

          return (
            <motion.div
              key={stage}
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
                  ? [1, 0.45, 1]
                  : isDone
                  ? 1
                  : 0.35,
              }}
              transition={
                isActive
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
