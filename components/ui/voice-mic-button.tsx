'use client';

import { motion } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import { Microphone, Stop } from '@phosphor-icons/react';

interface VoiceMicButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  pendingText?: string;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceMicButton({ isRecording, isTranscribing, pendingText = '', onStart, onStop }: VoiceMicButtonProps) {
  const shouldReduce = useReducedMotion();
  const label = isTranscribing
    ? 'Transcribiendo...'
    : isRecording
    ? 'Escuchando...'
    : pendingText
    ? 'Enviando...'
    : 'Habla';

  return (
    <motion.button
      type="button"
      onPointerDown={onStart}
      onPointerUp={onStop}
      onPointerLeave={isRecording ? onStop : undefined}
      whileTap={shouldReduce ? {} : { scale: 0.95 }}
      className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-2xl"
      style={{
        background: isRecording ? 'var(--color-terracotta)' : 'var(--color-surface)',
        boxShadow: 'var(--shadow-card)',
        color: isRecording ? 'white' : 'var(--color-deep)',
        border: isRecording ? 'none' : '1px solid var(--color-border)',
      }}
      disabled={isTranscribing}
      aria-label={
        isTranscribing
          ? 'Transcribiendo tu mensaje'
          : isRecording
          ? 'Grabando — suelta para enviar'
          : 'Mantén pulsado para hablar'
      }
      aria-pressed={isRecording}
    >
      {isTranscribing ? (
        <div className="flex gap-1 items-end h-6">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              animate={shouldReduce ? {} : { scaleY: [1, 2.5, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              style={{ display: 'block', width: 3, height: 12, borderRadius: 99, background: 'var(--color-sage)' }}
            />
          ))}
        </div>
      ) : (
        <motion.div
          animate={isRecording && !shouldReduce ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {isRecording ? <Stop size={28} weight="fill" /> : <Microphone size={28} />}
        </motion.div>
      )}
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}
