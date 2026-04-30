'use client';

import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/language-context';
import { LOCALE_LABELS } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const LOCALES: Locale[] = ['es', 'en', 'ru'];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div style={{ display: 'flex', gap: '0.375rem', padding: '0.25rem', borderRadius: '9999px', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}>
      {LOCALES.map((l) => (
        <motion.button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          whileTap={{ scale: 0.92 }}
          style={{
            padding: '0.3125rem 0.6875rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: locale === l ? 600 : 400,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            background: locale === l ? 'var(--color-deep)' : 'transparent',
            color: locale === l ? 'white' : 'var(--color-muted)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          aria-pressed={locale === l}
          aria-label={LOCALE_LABELS[l]}
        >
          {l.toUpperCase()}
        </motion.button>
      ))}
    </div>
  );
}
