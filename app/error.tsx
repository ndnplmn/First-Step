'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error boundary]', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-base)' }}
    >
      <div className="max-w-[400px] text-center space-y-4">
        <h2
          className="leading-tight"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 5vw, 40px)',
            color: 'var(--color-deep)',
          }}
        >
          Algo salió mal
        </h2>
        <p style={{ color: 'var(--color-muted)' }}>
          El servicio de IA no pudo completar la solicitud. Intenta de nuevo en un momento.
        </p>
        <motion.button
          type="button"
          onClick={reset}
          whileTap={{ scale: 0.97 }}
          className="mt-4 px-6 py-3 rounded-xl text-white text-sm font-medium"
          style={{ background: 'var(--color-sage)' }}
        >
          Intentar de nuevo
        </motion.button>
      </div>
    </div>
  );
}
