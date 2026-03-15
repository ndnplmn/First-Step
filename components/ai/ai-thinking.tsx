'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const DEFAULT_PHRASES = [
  'Analizando tu historia...',
  'Conectando perspectivas...',
  'Formulando comprensión...',
];

interface AIThinkingProps {
  phrases?: string[];
}

export function AIThinking({ phrases = DEFAULT_PHRASES }: AIThinkingProps) {
  const [index, setIndex] = useState(0);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (index >= phrases.length - 1) return;
    const t = setTimeout(() => setIndex(i => i + 1), 2500);
    return () => clearTimeout(t);
  }, [index, phrases.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-4 py-2"
    >
      <motion.div
        className="w-10 h-10 rounded-full flex-shrink-0"
        style={{ background: 'var(--color-sage)' }}
        animate={
          shouldReduce
            ? { opacity: 0.7 }
            : { scale: [1, 1.1, 1], opacity: [0.55, 0.85, 0.55] }
        }
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-sm italic"
          style={{ color: 'var(--color-muted)' }}
        >
          {phrases[index]}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
