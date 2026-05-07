'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '@/contexts/language-context';
import type { Locale } from '@/lib/i18n';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const LANGUAGE_OPTIONS: { locale: Locale; label: string; native: string; flag: string }[] = [
  { locale: 'es', label: 'Español',  native: 'Spanish', flag: '🇪🇸' },
  { locale: 'en', label: 'English',  native: 'English', flag: '🇬🇧' },
  { locale: 'ru', label: 'Русский',  native: 'Russian', flag: '🇷🇺' },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const reduced = useReducedMotion();
  const { t, locale, setLocale } = useLanguage();
  const [langChosen, setLangChosen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const screens = [
    {
      title: t('onboarding.screen.0.title'),
      icon: '🌿',
      body: t('onboarding.screen.0.body'),
      cta: t('onboarding.cta.next'),
    },
    {
      title: t('onboarding.screen.1.title'),
      icon: null,
      body: null,
      cta: t('onboarding.cta.next'),
    },
    {
      title: t('onboarding.screen.2.title'),
      icon: '🔒',
      body: t('onboarding.screen.2.body'),
      cta: t('onboarding.cta.next'),
    },
    {
      title: t('onboarding.screen.3.title'),
      icon: '✦',
      body: t('onboarding.screen.3.body'),
      cta: t('onboarding.cta.start'),
    },
  ];

  const steps = [
    {
      icon: '💬',
      title: t('onboarding.step.0.title'),
      desc: t('onboarding.step.0.desc'),
      preview: { role: 'ai', text: t('onboarding.step.0.preview') },
    },
    {
      icon: '🧭',
      title: t('onboarding.step.1.title'),
      desc: t('onboarding.step.1.desc'),
      chips: t('onboarding.frameworks').split(','),
    },
    {
      icon: '✦',
      title: t('onboarding.step.2.title'),
      desc: t('onboarding.step.2.desc'),
      preview: { role: 'letter', text: t('onboarding.step.2.preview') },
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

  const screen = screens[index];

  // ── Language picker screen ──────────────────────────────
  if (!langChosen) {
    return (
      <div
        className="min-h-dvh max-w-[680px] mx-auto px-6 flex flex-col justify-center"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(61,107,71,0.08) 0%, transparent 60%)' }}
      >
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            className="text-[2rem] leading-tight mb-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              color: 'var(--color-deep)',
            }}
          >
            {/* Always shown in the three languages since the user hasn't chosen yet */}
            Elige tu idioma
          </p>
          <p className="text-sm mb-10" style={{ color: 'var(--color-muted)' }}>
            Choose your language · Выберите язык
          </p>

          <div className="flex flex-col gap-3">
            {LANGUAGE_OPTIONS.map(opt => (
              <motion.button
                key={opt.locale}
                type="button"
                onClick={() => handlePickLanguage(opt.locale)}
                whileTap={reduced ? {} : { scale: 0.98 }}
                className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-card)] text-left transition-all"
                style={{
                  background: locale === opt.locale ? 'rgba(107,127,110,0.12)' : 'var(--color-surface)',
                  boxShadow: locale === opt.locale ? 'var(--shadow-glow-sage)' : 'var(--shadow-card)',
                  border: locale === opt.locale ? '1.5px solid var(--color-sage)' : '1.5px solid transparent',
                }}
              >
                <span className="text-2xl leading-none">{opt.flag}</span>
                <div>
                  <p className="font-semibold text-base" style={{ color: 'var(--color-deep)' }}>
                    {opt.label}
                  </p>
                </div>
                {locale === opt.locale && (
                  <div
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
            className="w-full mt-8 py-4 rounded-2xl font-semibold text-white tracking-wide"
            style={{ background: 'var(--color-deep)' }}
          >
            {t('onboarding.cta.next')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Main onboarding screens ─────────────────────────────
  return (
    <div
      className="min-h-dvh max-w-[680px] mx-auto px-6 flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(61,107,71,0.08) 0%, transparent 60%)' }}
    >
      {/* Progress dots */}
      <div className="flex gap-2 justify-center pt-8">
        {screens.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === index ? 20 : 6,
              background: i === index ? 'var(--color-sage)' : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center pt-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={reduced ? {} : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? {} : { opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25 }}
          >
            {screen.icon && (
              <div className="text-[2.5rem] leading-none mb-6">{screen.icon}</div>
            )}

            <h2
              className="leading-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                color: 'var(--color-deep)',
              }}
            >
              {screen.title}
            </h2>

            {screen.body && (
              <p
                className="text-[1.0625rem] leading-relaxed max-w-[480px]"
                style={{ color: 'var(--color-muted)' }}
              >
                {screen.body}
              </p>
            )}

            {/* Screen 1 — How it works */}
            {index === 1 && (
              <div className="flex flex-col gap-3 mt-2">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-[14px] border"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="text-xl leading-none mt-0.5">{step.icon}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-deep)' }}>
                          {step.title}
                        </p>
                        <p className="text-[0.8125rem] leading-snug" style={{ color: 'var(--color-muted)' }}>
                          {step.desc}
                        </p>
                      </div>
                    </div>

                    {'preview' in step && step.preview && (
                      <div
                        className="mt-3 px-3.5 py-2.5 rounded-[10px]"
                        style={{
                          background: step.preview.role === 'ai'
                            ? 'rgba(61,107,71,0.07)'
                            : 'rgba(25,22,15,0.04)',
                          borderLeft: step.preview.role === 'letter'
                            ? '2px solid var(--color-sage)'
                            : 'none',
                        }}
                      >
                        <p
                          className="text-[0.8rem] leading-snug whitespace-pre-line"
                          style={{
                            color: 'var(--color-deep)',
                            fontStyle: step.preview.role === 'letter' ? 'italic' : 'normal',
                          }}
                        >
                          {step.preview.text}
                        </p>
                      </div>
                    )}

                    {'chips' in step && step.chips && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {step.chips.map(c => (
                          <span
                            key={c}
                            className="text-[0.7rem] px-2.5 py-0.5 rounded-full"
                            style={{
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
                ))}
              </div>
            )}

            {/* Screen 2 — Privacy note */}
            {index === 2 && (
              <p className="mt-4 text-[0.8125rem] opacity-75" style={{ color: 'var(--color-muted)' }}>
                {t('onboarding.screen.2.note')}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="pb-10">
        <motion.button
          onClick={advance}
          whileTap={reduced ? {} : { scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide"
          style={{ background: 'var(--color-deep)' }}
        >
          {screen.cta}
        </motion.button>
      </div>
    </div>
  );
}
