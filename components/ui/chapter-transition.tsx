'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STAGE_META: Record<number, { roman: string; name: string; bg: string }> = {
  2: { roman: 'II',  name: 'CONFLICTOS',  bg: 'rgba(44, 39, 30, 0.97)'  },
  3: { roman: 'III', name: 'RECUERDOS',   bg: 'rgba(60, 52, 82, 0.97)'  },
  4: { roman: 'IV',  name: 'COMPRENSIÓN', bg: 'rgba(38, 62, 36, 0.97)'  },
  5: { roman: 'V',   name: 'CIERRE',      bg: 'rgba(110, 85, 42, 0.97)' },
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
      transition={{ type: 'spring', stiffness: 180, damping: 26 }}
    >
      {/* Ghosted roman numeral */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(120px, 22vw, 200px)',
          fontStyle: 'italic',
          color: 'white',
          lineHeight: 1,
          userSelect: 'none',
          position: 'absolute',
          letterSpacing: '-0.03em',
        }}
      >
        {meta.roman}
      </motion.div>

      {/* Centered label group */}
      <div className="relative flex flex-col items-center gap-5 z-10">
        {/* Drawing line */}
        <motion.div
          style={{ height: 1, background: 'rgba(255,255,255,0.3)' }}
          initial={{ width: 0 }}
          animate={{ width: 100 }}
          transition={{ delay: 0.35, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Stage name */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            color: 'white',
          }}
        >
          {meta.name}
        </motion.span>
      </div>
    </motion.div>
  );
}
