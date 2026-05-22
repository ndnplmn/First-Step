'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/language-context';

interface ConsentScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentScreen({ onAccept, onDecline }: ConsentScreenProps) {
  const { t } = useLanguage();
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
        {t('consent.title')}
      </h1>

      <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--color-muted)' }}>
        {t('consent.intro')}
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
            {t('consent.section.collect')}
          </p>
          <p>{t('consent.section.collect.body')}</p>
        </div>

        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-2"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
          >
            {t('consent.section.use')}
          </p>
          <p>{t('consent.section.use.body')}</p>
        </div>

        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-2"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
          >
            {t('consent.section.rights')}
          </p>
          <p>{t('consent.section.rights.body')}</p>
        </div>

        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-2"
            style={{ color: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}
          >
            {t('consent.section.important')}
          </p>
          <p>
            {t('consent.section.important.pre')}
            <strong style={{ color: 'var(--color-deep)' }}>
              {t('consent.section.important.emphasis')}
            </strong>
            {t('consent.section.important.post')}{' '}
            <span style={{ color: 'var(--color-deep)' }}>
              {t('consent.section.important.lines')}
            </span>
            {'. '}
            {t('consent.section.important.age')}
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
          {t('consent.checkbox')}
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
          {t('consent.cta.accept')}
        </motion.button>

        <button
          type="button"
          onClick={onDecline}
          className="w-full py-3 text-sm text-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-muted)' }}
        >
          {t('consent.cta.decline')}
        </button>
      </div>
    </motion.div>
  );
}
