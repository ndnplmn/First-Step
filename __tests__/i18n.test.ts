import { describe, it, expect } from 'vitest';
import { translations } from '../lib/i18n';

describe('i18n completeness', () => {
  const locales = Object.keys(translations) as (keyof typeof translations)[];
  const esKeys = Object.keys(translations.es).sort();

  it('all locales have the same number of keys as ES', () => {
    for (const locale of locales) {
      const keys = Object.keys(translations[locale]);
      expect(keys.length, `${locale} should have ${esKeys.length} keys`).toBe(esKeys.length);
    }
  });

  it('all locales contain every ES key', () => {
    for (const locale of locales) {
      for (const key of esKeys) {
        expect(
          Object.prototype.hasOwnProperty.call(translations[locale], key),
          `locale "${locale}" is missing key "${key}"`
        ).toBe(true);
      }
    }
  });

  it('no key has an empty string value in any locale', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(translations[locale])) {
        expect(value, `locale "${locale}", key "${key}" is empty`).not.toBe('');
      }
    }
  });
});
