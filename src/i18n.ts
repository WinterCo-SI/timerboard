import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import zh from './locales/zh.json';
import sdeEn from './sde/sde.en.json';
import sdeZh from './sde/sde.zh.json';

export const SUPPORTED_LANGUAGES = ['en', 'zh'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'timerboardLang';

export const i18nReady = i18next.use(LanguageDetector).init({
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  nonExplicitSupportedLngs: true,
  defaultNS: 'translation',
  ns: ['translation', 'sde'],
  resources: {
    en: {
      translation: en,
      sde: sdeEn,
    },
    zh: {
      translation: zh,
      sde: sdeZh,
    },
  },
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    caches: ['localStorage'],
  },
  interpolation: {
    escapeValue: false,
  },
});

export function displayLanguage(): SupportedLanguage {
  return i18next.language?.startsWith('zh') ? 'zh' : 'en';
}

export async function changeLanguage(language: SupportedLanguage) {
  await i18next.changeLanguage(language);
}

function translateSde(
  category: 'region' | 'system' | 'structure',
  value: string | undefined,
): string {
  const key = value || i18next.t('common.unknown');
  return i18next.t(`${category}.${key}`, { ns: 'sde', defaultValue: key });
}

export function translateRegion(value: string | undefined): string {
  return translateSde('region', value);
}

export function translateSystem(value: string | undefined): string {
  return translateSde('system', value);
}

export function translateStructure(value: string | undefined): string {
  return translateSde('structure', value);
}

export function translateState(value: string | undefined): string {
  const key = value || 'Unknown';
  return i18next.t(`state.${key}`, { defaultValue: key });
}

export function translateStatus(value: string | undefined): string {
  if (value === 'Friendly') return i18next.t('common.friendly');
  if (value === 'Hostile') return i18next.t('common.hostile');
  return value || i18next.t('common.unknown');
}

export default i18next;
