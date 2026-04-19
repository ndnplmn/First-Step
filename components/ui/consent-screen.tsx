'use client';

import { useState } from 'react';
import { motion } from 'motion/react';

interface ConsentScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentScreen({ onAccept, onDecline }: ConsentScreenProps) {
  const [checked, setChecked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-dvh flex flex-col max-w-[680px] mx-auto px-6 py-12"
    >
      {/* Accent */}
      <div
        className="w-10 h-1 rounded-full mb-8"
        style={{ background: 'var(--color-sage)' }}
      />

      <h1
        className="text-3xl leading-snug mb-4"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-deep)' }}
      >
        Antes de comenzar
      </h1>

      <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-muted)' }}>
        Tend es un espacio de autoexploración guiada. Para ofrecerte la mejor experiencia
        necesitamos recopilar y procesar información sensible sobre tu bienestar emocional.
        Por favor lee con atención.
      </p>

      {/* Scroll area */}
      <div
        className="flex-1 rounded-2xl p-5 mb-6 overflow-y-auto space-y-5 text-sm leading-relaxed"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          maxHeight: '45vh',
          color: 'var(--color-muted)',
        }}
      >
        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-2"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
          >
            Qué recopilamos
          </p>
          <p>
            Recopilamos información personal sensible (categoría especial según el RGPD Art. 9),
            incluyendo: historia psicológica y emocional, experiencias con terapia previa,
            medicación actual, situación familiar y laboral, y el contenido de tus sesiones y
            entradas de diario.
          </p>
        </div>

        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-2"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
          >
            Cómo lo usamos
          </p>
          <p>
            Esta información se usa exclusivamente para personalizar tu experiencia terapéutica
            dentro de Tend. No vendemos ni compartimos tus datos con terceros. El análisis de
            tus sesiones es realizado por modelos de inteligencia artificial (Groq / LLaMA).
            Los datos se almacenan de forma segura en Supabase (cifrado en tránsito y en reposo).
          </p>
        </div>

        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-2"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
          >
            Tus derechos
          </p>
          <p>
            Tienes derecho a acceder, rectificar, suprimir y portar tus datos en cualquier momento.
            Puedes eliminar tu cuenta y todos tus datos desde Configuración → Zona de peligro.
            El consentimiento es revocable en cualquier momento sin consecuencias.
          </p>
        </div>

        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-2"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
          >
            Importante
          </p>
          <p>
            Tend <strong style={{ color: 'var(--color-deep)' }}>no es un servicio de emergencias</strong> ni
            sustituye a un profesional de salud mental. Si estás en crisis, llama a una línea de ayuda:{' '}
            <span style={{ color: 'var(--color-deep)' }}>España 024 · México 800 290 0024 · Argentina 135</span>.
            Debes tener al menos 18 años para usar este servicio.
          </p>
        </div>
      </div>

      {/* Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => setChecked(c => !c)}
        className="flex items-start gap-3 mb-8 text-left"
      >
        <div
          className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
          style={{
            background: checked ? 'var(--color-sage)' : 'transparent',
            border: `2px solid ${checked ? 'var(--color-sage)' : 'var(--color-border-strong)'}`,
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          {checked && (
            <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
              <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          He leído y acepto el tratamiento de mis datos personales para el uso de Tend.
          Confirmo que tengo 18 años o más.
        </span>
      </button>

      {/* Actions */}
      <div className="space-y-3">
        <motion.button
          type="button"
          onClick={onAccept}
          disabled={!checked}
          whileTap={checked ? { scale: 0.97 } : {}}
          className="w-full py-4 rounded-2xl font-semibold text-white tracking-wide disabled:opacity-35"
          style={{
            background: 'var(--color-sage)',
            boxShadow: checked ? 'var(--shadow-glow-sage)' : 'none',
            transition: 'box-shadow 0.2s, opacity 0.2s',
          }}
        >
          Acepto y quiero comenzar
        </motion.button>

        <button
          type="button"
          onClick={onDecline}
          className="w-full py-3 text-sm text-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-muted)' }}
        >
          No acepto — volver
        </button>
      </div>
    </motion.div>
  );
}
