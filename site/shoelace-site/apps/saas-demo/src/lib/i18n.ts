/**
 * Build-time i18n helper
 * Returns the key as-is (English) in development
 * Replaced with translations at build time
 */
export const t = (key: string): string => key;
