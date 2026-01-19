/**
 * Translation helper function
 * In source code, this returns the key as-is (English)
 * At build time, the i18n plugin replaces t("key") with the translated string
 */
export const t = (key: string): string => key;
