'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Lock, Clock } from '@phosphor-icons/react';
import { TendMark } from '@/components/ui/logo';
import { useLanguage } from '@/contexts/language-context';
import type { Locale } from '@/lib/i18n';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const LANGUAGE_OPTIONS: { locale: Locale; label: string; flag: string }[] = [
  { locale: 'es', label: 'Español',  flag: '🇪🇸' },
  { locale: 'en', label: 'English',  flag: '🇬🇧' },
  { locale: 'ru', label: 'Русский',  flag: '🇷🇺' },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const reduced = useReducedMotion();
  const { t, locale, setLocale } = useLanguage();
  const [langChosen, setLangChosen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const screens = [
    { cta: t('onboarding.cta.next') },
    { cta: t('onboarding.cta.next') },
    { cta: t('onboarding.cta.next') },
    { cta: t('onboarding.cta.start') },
  ];

  const steps = [
    {
      title: t('onboarding.step.0.title'),
      desc: t('onboarding.step.0.desc'),
      preview: { role: 'ai' as const, text: t('onboarding.step.0.preview') },
    },
    {
      title: t('onboarding.step.1.title'),
      desc: t('onboarding.step.1.desc'),
      chips: t('onboarding.frameworks').split(','),
    },
    {
      title: t('onboarding.step.2.title'),
      desc: t('onboarding.step.2.desc'),
      preview: { role: 'letter' as const, text: t('onboarding.step.2.preview') },
    },
  ];

  const handlePickLanguage = (picked: Locale) => {
    setLocale(picked);
    setTimeout(() => setLangChosen(true), 180);
  };

  const advance = () => {
    if (index < screens.length - 1) {
      setDirection(1);
      setIndex(i => i + 1);
    } else {
      onComplete();
    }
  };

  // ── Language picker ─────────────────────────────────────
  if (!langChosen) {
    return (
      <div
        className="min-h-dvh max-w-[680px] mx-auto px-6 flex flex-col"
        style={{
          background: 'radial-gradient(ellipse at 50% -10%, rgba(61,127,71,0.1) 0%, transparent 65%)',
        }}
      >
        <div className="flex-1 flex flex-col justify-center py-16">
          {/* Logo mark */}
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10"
          >
            <TendMark size={40} />
          </motion.div>

          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="text-[2rem] leading-tight mb-1"
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                color: 'var(--color-deep)',
              }}
            >
              {/* Shown in all 3 languages before locale is set */}
              Elige · Choose · Выберите
            </p>
            <p className="text-sm mb-10" style={{ color: 'var(--color-muted)' }}>
              {t('onboarding.lang.subtitle')}
            </p>

            <div className="flex flex-col gap-3">
              {LANGUAGE_OPTIONS.map(opt => (
                <motion.button
                  key={opt.locale}
                  type="button"
                  onClick={() => handlePickLanguage(opt.locale)}
                  whileTap={reduced ? {} : { scale: 0.98 }}
                  className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-card)] text-left"
                  style={{
                    background: locale === opt.locale
                      ? 'rgba(61,107,71,0.1)'
                      : 'var(--color-surface)',
                    boxShadow: locale === opt.locale
                      ? 'var(--shadow-glow-sage)'
                      : 'var(--shadow-card)',
                    border: locale === opt.locale
                      ? '1.5px solid var(--color-sage)'
                      : '1.5px solid var(--color-border)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="text-2xl leading-none" aria-hidden="true">{opt.flag}</span>
                  <p className="font-semibold text-base" style={{ color: 'var(--color-deep)' }}>
                    {opt.label}
                  </p>
                  {locale === opt.locale && (
                    <motion.div
                      initial={reduced ? {} : { scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto w-2 h-2 rounded-full"
                      style={{ background: 'var(--color-sage)' }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            <motion.button
              type="button"
              onClick={() => setLangChosen(true)}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="w-full mt-8 py-4 rounded-2xl font-semibold text-white"
              style={{
                background: 'var(--color-sage)',
                boxShadow: 'var(--shadow-glow-sage)',
              }}
            >
              {t('onboarding.cta.next')}
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main onboarding screens ─────────────────────────────
  return (
    <div
      className="min-h-dvh max-w-[680px] mx-auto px-6 flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 50% -10%, rgba(61,107,71,0.08) 0%, transparent 65%)',
      }}
    >
      {/* Progress pill dots */}
      <div className="flex gap-2 justify-center pt-8 pb-2">
        {screens.map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full"
            animate={{
              width: i === index ? 24 : 6,
              background: i === index
                ? 'var(--color-sage)'
                : i < index
                  ? 'rgba(61,107,71,0.35)'
                  : 'var(--color-border)',
            }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 flex flex-col justify-center py-8 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={reduced ? {} : { opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? {} : { opacity: 0, x: direction * -48 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >

            {/* ── Screen 0: Emotional hook ── */}
            {index === 0 && (
              <div>
                <div
                  className="mb-6"
                  style={{
                    fontSize: '1.125rem',
                    color: 'var(--color-sage)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    opacity: 0.8,
                  }}
                  aria-hidden="true"
                >
                  ✦
                </div>
                <h2
                  className="leading-[1.12] mb-4 whitespace-pre-line"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(2.25rem, 8vw, 3.5rem)',
                    color: 'var(--color-deep)',
                  }}
                >
                  {t('onboarding.screen.0.title')}
                </h2>
                <div
                  className="mb-5"
                  style={{ width: 36, height: 2, background: 'var(--color-sage)', opacity: 0.5 }}
                />
                <p
                  className="leading-relaxed max-w-[400px]"
                  style={{ fontSize: '1.0625rem', color: 'var(--color-muted)' }}
                >
                  {t('onboarding.screen.0.body')}
                </p>
              </div>
            )}

            {/* ── Screen 1: How it works — numbered editorial steps ── */}
            {index === 1 && (
              <div>
                <h2
                  className="leading-tight mb-8"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                    color: 'var(--color-deep)',
                  }}
                >
                  {t('onboarding.screen.1.title')}
                </h2>

                <div className="space-y-0">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-5">
                      {/* Left: step number + connector line */}
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 28 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6875rem',
                            color: 'var(--color-sage)',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            lineHeight: 1,
                            paddingTop: 3,
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {i < steps.length - 1 && (
                          <div
                            className="w-px flex-1 mt-2 mb-2"
                            style={{
                              background: 'linear-gradient(to bottom, var(--color-sage), var(--color-border))',
                              opacity: 0.4,
                              minHeight: 32,
                            }}
                          />
                        )}
                      </div>

                      {/* Right: content */}
                      <div className="flex-1 pb-7">
                        <p
                          className="font-semibold mb-1"
                          style={{ fontSize: '0.9375rem', color: 'var(--color-deep)' }}
                        >
                          {step.title}
                        </p>
                        <p
                          className="leading-snug mb-2"
                          style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}
                        >
                          {step.desc}
                        </p>

                        {'preview' in step && step.preview && (
                          <div
                            className="px-3 py-2.5 rounded-[10px]"
                            style={{
                              background: step.preview.role === 'ai'
                                ? 'rgba(61,107,71,0.07)'
                                : 'transparent',
                              borderLeft: step.preview.role === 'letter'
                                ? '2px solid var(--color-sage)'
                                : 'none',
                            }}
                          >
                            <p
                              className="leading-snug whitespace-pre-line"
                              style={{
                                fontSize: '0.8125rem',
                                color: 'var(--color-deep)',
                                fontStyle: step.preview.role === 'letter' ? 'italic' : 'normal',
                                opacity: 0.85,
                              }}
                            >
                              {step.preview.text}
                            </p>
                          </div>
                        )}

                        {'chips' in step && step.chips && (
                          <div className="flex flex-wrap gap-1.5">
                            {step.chips.map(c => (
                              <span
                                key={c}
                                className="px-2.5 py-0.5 rounded-full"
                                style={{
                                  fontSize: '0.7rem',
                                  background: 'rgba(61,107,71,0.08)',
                                  color: 'var(--color-sage)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Screen 2: Privacy ── */}
            {index === 2 && (
              <div>
                {/* Icon in circle */}
                <div
                  className="flex items-center justify-center rounded-full mb-6"
                  style={{
                    width: 56,
                    height: 56,
                    background: 'rgba(61,107,71,0.1)',
                    color: 'var(--color-sage)',
                  }}
                >
                  <Lock size={24} weight="fill" />
                </div>

                <h2
                  className="leading-[1.15] mb-4 whitespace-pre-line"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                    color: 'var(--color-deep)',
                  }}
                >
                  {t('onboarding.screen.2.title')}
                </h2>

                <p
                  className="leading-relaxed mb-6 max-w-[400px]"
                  style={{ fontSize: '1.0625rem', color: 'var(--color-muted)' }}
                >
                  {t('onboarding.screen.2.body')}
                </p>

                {/* Trust badge */}
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full"
                  style={{
                    background: 'rgba(61,107,71,0.08)',
                    border: '1px solid rgba(61,107,71,0.22)',
                  }}
                >
                  <Lock size={11} weight="fill" style={{ color: 'var(--color-sage)', flexShrink: 0 }} />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--color-sage)',
                      fontWeight: 600,
                    }}
                  >
                    {t('onboarding.screen.2.badge')}
                  </span>
                </div>

                <p
                  className="mt-5 opacity-60"
                  style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}
                >
                  {t('onboarding.screen.2.note')}
                </p>
              </div>
            )}

            {/* ── Screen 3: Launch ── */}
            {index === 3 && (
              <div>
                {/* Time estimate badge */}
                <div
                  className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <Clock size={12} style={{ color: 'var(--color-muted)' }} aria-hidden="true" />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {t('onboarding.screen.3.time')}
                  </span>
                </div>

                <h2
                  className="leading-tight mb-4"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(2.25rem, 8vw, 3.5rem)',
                    color: 'var(--color-deep)',
                  }}
                >
                  {t('onboarding.screen.3.title')}
                </h2>

                <div
                  className="mb-5"
                  style={{ width: 36, height: 2, background: 'var(--color-sage)', opacity: 0.5 }}
                />

                <p
                  className="leading-relaxed max-w-[380px]"
                  style={{ fontSize: '1.0625rem', color: 'var(--color-muted)' }}
                >
                  {t('onboarding.screen.3.body')}
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA button */}
      <div className="pb-10 pt-4">
        <motion.button
          type="button"
          onClick={advance}
          whileTap={reduced ? {} : { scale: 0.97 }}
          whileHover={reduced ? {} : { y: -1 }}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
          style={{
            background: index === screens.length - 1
              ? 'var(--color-sage)'
              : 'var(--color-deep)',
            boxShadow: index === screens.length - 1
              ? 'var(--shadow-glow-sage)'
              : 'none',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {screens[index].cta}
        </motion.button>
      </div>
    </div>
  );
}
