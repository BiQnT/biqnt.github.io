import { ui, defaultLang, languages } from './ui';

export type Lang = keyof typeof ui;

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function getLocalizedPath(path: string, lang: Lang): string {
  return `/${lang}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getOtherLang(lang: Lang): Lang {
  return lang === 'ko' ? 'en' : 'ko';
}

export function getLanguageLabel(lang: Lang): string {
  return languages[lang];
}

export const locales: Lang[] = Object.keys(languages) as Lang[];
