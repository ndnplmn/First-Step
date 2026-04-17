'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const screens = [
  {
    title: '¿Qué es Tend?',
    icon: '🌿',
    body: 'Un espacio terapéutico guiado por IA, diseñado para ayudarte a explorar y entender lo que sientes. No es un diagnóstico — es un proceso de autoconocimiento.',
    cta: 'Siguiente',
  },
  {
    title: 'Cómo funciona',
    icon: null,
    body: null,
    cta: 'Siguiente',
  },
  {
    title: 'Tu privacidad',
    icon: '🔒',
    body: 'Todo lo que compartas se guarda de forma segura, vinculado únicamente a tu cuenta. Nadie más tiene acceso a tu proceso.',
    cta: 'Siguiente',
  },
  {
    title: 'Estás listo/a',
    icon: '✦',
    body: 'Antes de tu primera sesión, te haremos algunas preguntas para conocerte mejor. Solo una vez.',
    cta: 'Comenzar →',
  },
];

const steps = [
  {
    icon: '💬',
    title: 'Cuéntanos lo que sientes',
    desc: 'Describe tu conflicto en tus propias palabras. La IA escucha sin juzgar.',
    preview: { role: 'ai', text: '¿Cuándo empezaste a sentirte así?' },
  },
  {
    icon: '🧭',
    title: 'Elegimos el enfoque',
    desc: 'Mapeamos tu situación entre 5 enfoques terapéuticos clásicos.',
    chips: ['Gestalt', 'Freudiano', 'Adleriano', 'Bioenergético', 'Conductual'],
  },
  {
    icon: '✦',
    title: 'Trabajo profundo + cierre',
    desc: 'Una sesión completa: exploración, interpretación personalizada y carta de cierre.',
    preview: { role: 'letter', text: 'Querida Carmen,\nLo que describes no es debilidad...' },
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

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
    <div style={{
      minHeight: '100dvh',
      maxWidth: 680,
      margin: '0 auto',
      padding: '0 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(107,127,110,0.08) 0%, transparent 60%)',
    }}>
      {/* Progress dots */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        justifyContent: 'center',
        paddingTop: '2rem',
      }}>
        {screens.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === index ? 'var(--color-sage)' : 'var(--color-border)',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '2rem' }}>
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
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '1.5rem',
                lineHeight: 1,
              }}>
                {screen.icon}
              </div>
            )}

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              color: 'var(--color-deep)',
              marginBottom: '1.25rem',
              lineHeight: 1.15,
            }}>
              {screen.title}
            </h2>

            {screen.body && (
              <p style={{
                color: 'var(--color-muted)',
                fontSize: '1.0625rem',
                lineHeight: 1.65,
                maxWidth: 480,
              }}>
                {screen.body}
              </p>
            )}

            {/* Screen 1 — How it works */}
            {index === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                {steps.map((step, i) => (
                  <div key={i} style={{
                    padding: '1rem',
                    background: 'var(--color-surface)',
                    borderRadius: 14,
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '1.25rem', lineHeight: 1, marginTop: 1 }}>{step.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 600,
                          color: 'var(--color-deep)',
                          fontSize: '0.9rem',
                          marginBottom: '0.2rem',
                        }}>{step.title}</div>
                        <div style={{
                          color: 'var(--color-muted)',
                          fontSize: '0.8125rem',
                          lineHeight: 1.5,
                        }}>{step.desc}</div>
                      </div>
                    </div>
                    {'preview' in step && step.preview && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.625rem 0.875rem',
                        background: step.preview.role === 'ai'
                          ? 'rgba(61,107,71,0.07)'
                          : 'rgba(25,22,15,0.04)',
                        borderRadius: 10,
                        borderLeft: step.preview.role === 'letter' ? '2px solid var(--color-sage)' : 'none',
                      }}>
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-deep)',
                          fontStyle: step.preview.role === 'letter' ? 'italic' : 'normal',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-line',
                        }}>
                          {step.preview.text}
                        </p>
                      </div>
                    )}
                    {'chips' in step && step.chips && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.625rem' }}>
                        {step.chips.map(c => (
                          <span key={c} style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.625rem',
                            borderRadius: 99,
                            background: 'rgba(61,107,71,0.08)',
                            color: 'var(--color-sage)',
                            fontFamily: 'var(--font-mono)',
                          }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Screen 2 — Privacy note */}
            {index === 2 && (
              <p style={{
                marginTop: '1rem',
                fontSize: '0.8125rem',
                color: 'var(--color-muted)',
                opacity: 0.75,
              }}>
                Puedes exportar o eliminar tus datos en cualquier momento.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div style={{ paddingBottom: '2.5rem' }}>
        <button
          onClick={advance}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'var(--color-deep)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {screen.cta}
        </button>
      </div>
    </div>
  );
}
