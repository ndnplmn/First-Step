'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'es',
  setLocale: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('fs_locale') as Locale) ?? 'es';
    }
    return 'es';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem('fs_locale', newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[locale]?.[key] ?? translations['es']?.[key] ?? fallback ?? key;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
