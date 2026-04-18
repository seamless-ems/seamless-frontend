// Locale and currency helpers
const EURO_COUNTRIES = new Set([
  'AT','BE','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','ES','SI','SK'
]);

export function detectLocale(): string {
  try {
    if (typeof navigator !== 'undefined') {
      // navigator.language is typically like 'en-US' or 'fr'
      const lang = (navigator.language || (navigator.languages && navigator.languages[0]) || 'en-US');
      return String(lang);
    }
  } catch (e) {}
  return 'en-US';
}

export function currencyForLocale(locale: string): string {
  if (!locale) return 'USD';
  const parts = String(locale).replace('_','-').split('-');
  const region = (parts[1] || parts[0] || '').toUpperCase();

  if (EURO_COUNTRIES.has(region)) return 'EUR';
  if (region === 'GB' || region === 'UK') return 'GBP';
  if (region === 'US') return 'USD';
  if (region === 'CA') return 'CAD';

  // Fallback: for language-only like 'en' assume USD
  return 'USD';
}

export function getLocaleAndCurrency(preferredLocale?: string) {
  const locale = preferredLocale || detectLocale();
  const currency = currencyForLocale(locale);
  return { locale, currency };
}

export default {
  detectLocale,
  currencyForLocale,
  getLocaleAndCurrency,
};
