'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Microphone, Stop } from '@phosphor-icons/react';
import { useVoice } from '@/hooks/use-voice';
import { useLanguage } from '@/contexts/language-context';

interface VoiceFillButtonProps {
  onFill: (text: string) => void;
  size?: number;
}

export function VoiceFillButton({ onFill, size = 16 }: VoiceFillButtonProps) {
  const shouldReduce = useReducedMotion();
  const { t } = useLanguage();
  const { isRecording, isTranscribing, voiceError, startRecording, stopRecording } = useVoice();

  const handleStop = async () => {
    const text = await stopRecording();
    if (text) onFill(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <motion.button
        type="button"
        onPointerDown={startRecording}
        onPointerUp={handleStop}
        onPointerLeave={isRecording ? handleStop : undefined}
        whileTap={shouldReduce ? {} : { scale: 0.9 }}
        disabled={isTranscribing}
        title={isRecording ? t('voice.release') : t('voice.hold')}
        style={{
          background: isRecording ? 'var(--color-terracotta)' : 'var(--color-surface)',
          border: isRecording ? 'none' : '1px solid var(--color-border)',
          borderRadius: '9999px',
          padding: '0.4375rem',
          cursor: isTranscribing ? 'default' : 'pointer',
          color: isRecording ? 'white' : 'var(--color-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s ease, color 0.15s ease',
          boxShadow: isRecording ? '0 0 0 4px rgba(180,110,69,0.15)' : 'none',
        }}
        aria-label={isRecording ? t('voice.recording') : isTranscribing ? t('voice.transcribing') : t('voice.speak')}
        aria-pressed={isRecording}
      >
        {isTranscribing ? (
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: size }}>
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={shouldReduce ? {} : { scaleY: [1, 2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                style={{ display: 'block', width: 2, height: size * 0.6, borderRadius: 99, background: 'var(--color-sage)' }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            animate={isRecording && !shouldReduce ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 1.0, repeat: Infinity }}
          >
            {isRecording ? <Stop size={size} weight="fill" /> : <Microphone size={size} />}
          </motion.div>
        )}
      </motion.button>
      {voiceError && (
        <p style={{ fontSize: '0.625rem', color: 'var(--color-terracotta)', margin: 0, maxWidth: '120px', textAlign: 'center', lineHeight: 1.3 }}>
          {voiceError}
        </p>
      )}
    </div>
  );
}
