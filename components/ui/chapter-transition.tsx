'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STAGE_META: Record<number, { roman: string; name: string; bg: string }> = {
  2: { roman: 'II',  name: 'CONFLICTOS',  bg: 'rgba(107, 94, 82, 1)'  },
  3: { roman: 'III', name: 'RECUERDOS',   bg: 'rgba(80, 72, 110, 1)'  },
  4: { roman: 'IV',  name: 'COMPRENSIÓN', bg: 'rgba(52, 78, 46, 1)'   },
  5: { roman: 'V',   name: 'CIERRE',      bg: 'rgba(130, 100, 50, 1)' },
};

interface ChapterTransitionProps {
  toStage: number;
  onComplete: () => void;
}

export function ChapterTransition({ toStage, onComplete }: ChapterTransitionProps) {
  const shouldReduce = useReducedMotion();
  const meta = STAGE_META[toStage] ?? STAGE_META[2];

  useEffect(() => {
    const delay = shouldReduce ? 300 : 1900;
    const t = setTimeout(onComplete, delay);
    return () => clearTimeout(t);
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <motion.div
        className="fixed inset-0 z-50"
        style={{ background: meta.bg }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: meta.bg }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 28 }}
    >
      {/* Ghosted roman numeral */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(120px, 22vw, 200px)',
          fontStyle: 'italic',
          color: 'white',
          lineHeight: 1,
          userSelect: 'none',
          position: 'absolute',
        }}
      >
        {meta.roman}
      </motion.div>

      {/* Centered label group */}
      <div className="relative flex flex-col items-center gap-4 z-10">
        {/* Drawing line */}
        <motion.div
          style={{ height: 1, background: 'rgba(255,255,255,0.4)' }}
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
        />

        {/* Stage name */}
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ delay: 0.65, duration: 0.35 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.2em',
            color: 'white',
          }}
        >
          {meta.name}
        </motion.span>
      </div>
    </motion.div>
  );
}
