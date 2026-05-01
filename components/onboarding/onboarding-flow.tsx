'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '@/contexts/language-context';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const reduced = useReducedMotion();
  const { t } = useLanguage();
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
      chips: ['Gestalt', 'Freudiano', 'Adleriano', 'Bioenergético', 'Conductual'],
    },
    {
      icon: '✦',
      title: t('onboarding.step.2.title'),
      desc: t('onboarding.step.2.desc'),
      preview: { role: 'letter', text: t('onboarding.step.2.preview') },
    },
  ];

  const advance = () => {
    if (index < screens.length - 1) {
      setDirection(1);
      setIndex(i => i + 1);
    } else {
      onComplete();
    }
  };

  const screen = screens[index];

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
