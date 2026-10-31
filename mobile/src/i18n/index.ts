import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en.json';
import hi from './hi.json';

export type Lang = 'hi' | 'en';

// Default follows the device; the first-launch picker and Profile switch (T3-02) call i18n.changeLanguage.
const deviceLang: Lang = getLocales()[0]?.languageCode === 'hi' ? 'hi' : 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: deviceLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
