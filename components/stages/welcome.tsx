'use client';

import { motion, useReducedMotion } from 'motion/react';
import { FloatingBar } from '@/components/ui/floating-bar';
import { TendMark, TendLogo } from '@/components/ui/logo';
import { useLanguage } from '@/contexts/language-context';

interface WelcomeProps {
  hasExistingPatients: boolean;
  onStart: () => void;
  onContinue: () => void;
}

export function Welcome({ hasExistingPatients, onStart, onContinue }: WelcomeProps) {
  const shouldReduce = useReducedMotion();
  const { t } = useLanguage();

  const features = [
    t('welcome.feature.1'),
    t('welcome.feature.2'),
    t('welcome.feature.3'),
  ];

  return (
    <div className="min-h-dvh max-w-[680px] mx-auto relative overflow-hidden">

      {/* ── Ambient gradient orbs ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Sage orb — top left */}
        <motion.div
          animate={shouldReduce ? {} : {
            scale: [1, 1.12, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-25%',
            width: '85%',
            height: '70%',
            background: 'radial-gradient(ellipse, rgba(61,107,71,0.14) 0%, transparent 68%)',
            borderRadius: '50%',
          }}
        />
        {/* Terracotta orb — bottom right */}
        <motion.div
          animate={shouldReduce ? {} : {
            scale: [1, 1.07, 1],
            opacity: [0.28, 0.5, 0.28],
          }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 4.5 }}
          style={{
            position: 'absolute',
            bottom: '0%',
            right: '-30%',
            width: '70%',
            height: '55%',
            background: 'radial-gradient(ellipse, rgba(180,110,69,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        {/* Subtle violet accent — center */}
        <motion.div
          animate={shouldReduce ? {} : {
            opacity: [0, 0.18, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
          style={{
            position: 'absolute',
            top: '30%',
            left: '40%',
            width: '40%',
            height: '30%',
            background: 'radial-gradient(ellipse, rgba(107,94,158,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="relative z-10 px-6 flex flex-col min-h-dvh pt-[13vh] pb-36">

        {/* Logo block */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start gap-5"
        >
          <TendMark size={50} />
          <TendLogo size={68} className="breathe" />
        </motion.div>

        {/* Editorial headline */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10"
        >
          {/* Sage rule */}
          <div
            style={{
              width: 32,
              height: 2,
              background: 'var(--color-sage)',
              opacity: 0.55,
              marginBottom: 18,
              borderRadius: 2,
            }}
          />

          {/* Line 1 — deep */}
          <h1
            aria-label={`${t('welcome.headline.1')} ${t('welcome.headline.2')}`}
            className="leading-[1.07]"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.375rem, 9.5vw, 4rem)',
              color: 'var(--color-deep)',
            }}
            aria-hidden="false"
          >
            {t('welcome.headline.1')}
          </h1>

          {/* Line 2 — sage */}
          <h1
            className="leading-[1.07]"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.375rem, 9.5vw, 4rem)',
              color: 'var(--color-sage)',
            }}
            aria-hidden="true"
          >
            {t('welcome.headline.2')}
          </h1>
        </motion.div>

        {/* Context line */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.65, delay: 0.6, ease: 'easeOut' }}
          className="mt-7"
        >
          {hasExistingPatients ? (
            /* Returning user warm greeting */
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '1.125rem',
                color: 'var(--color-muted)',
              }}
            >
              {t('welcome.returning.greeting')}
            </p>
          ) : (
            /* New user — 3 micro-feature pills */
            <div className="flex items-center flex-wrap gap-y-1">
              {features.map((feature, i) => (
                <span key={feature} className="flex items-center">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      color: 'var(--color-muted)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {feature}
                  </span>
                  {i < features.length - 1 && (
                    <span
                      style={{
                        color: 'var(--color-border)',
                        fontSize: '0.8rem',
                        margin: '0 10px',
                        lineHeight: 1,
                      }}
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Spacer — pushes crisis to bottom */}
        <div className="flex-1" />

        {/* Crisis resources */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.85, ease: 'easeOut' }}
          style={{ maxWidth: 340 }}
        >
          <p
            className="leading-relaxed"
            style={{ fontSize: '0.6875rem', color: 'var(--color-muted-soft)' }}
          >
            {t('welcome.crisis')}{' '}
            <span style={{ color: 'var(--color-muted)' }}>
              {t('welcome.crisis.hotlines')}
            </span>
          </p>
        </motion.div>
      </div>

      {/* ── CTA Buttons ──────────────────────────────────── */}
      <FloatingBar visible>
        {hasExistingPatients ? (
          <>
            {/* Returning user: primary = go to sessions */}
            <motion.button
              type="button"
              onClick={onContinue}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              whileHover={shouldReduce ? {} : { y: -1 }}
              className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
              style={{
                background: 'var(--color-sage)',
                boxShadow: 'var(--shadow-glow-sage)',
              }}
            >
              {t('welcome.continue')}
            </motion.button>
            <motion.button
              type="button"
              onClick={onStart}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              className="w-full py-3.5 rounded-2xl font-medium text-sm"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-muted)',
                background: 'var(--color-surface)',
              }}
            >
              {t('welcome.start.new')}
            </motion.button>
          </>
        ) : (
          /* New user: single primary CTA */
          <motion.button
            type="button"
            onClick={onStart}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            whileHover={shouldReduce ? {} : { y: -1 }}
            className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
            style={{
              background: 'var(--color-sage)',
              boxShadow: 'var(--shadow-glow-sage)',
            }}
          >
            {t('welcome.start')}
          </motion.button>
        )}
      </FloatingBar>
    </div>
  );
}
