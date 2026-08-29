import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export const locales = ['uk', 'en', 'pl', 'de', 'ru'] as const;
export type Locale = typeof locales[number];

const dictionaries = {
  uk: { home: 'Головна', live: 'LIVE', sylora: 'Sylora', inbox: 'Inbox', profile: 'Профіль', startLive: 'Почати ефір', create: 'Створити', integrations: 'Інтеграції', settings: 'Налаштування', language: 'Мова інтерфейсу', logout: 'Вийти', signIn: 'Увійти', register: 'Створити акаунт', reconnecting: 'Відновлюю зв’язок…' },
  en: { home: 'Home', live: 'LIVE', sylora: 'Sylora', inbox: 'Inbox', profile: 'Profile', startLive: 'Go live', create: 'Create', integrations: 'Integrations', settings: 'Settings', language: 'Interface language', logout: 'Log out', signIn: 'Sign in', register: 'Create account', reconnecting: 'Reconnecting…' },
  pl: { home: 'Główna', live: 'LIVE', sylora: 'Sylora', inbox: 'Skrzynka', profile: 'Profil', startLive: 'Rozpocznij LIVE', create: 'Utwórz', integrations: 'Integracje', settings: 'Ustawienia', language: 'Język interfejsu', logout: 'Wyloguj', signIn: 'Zaloguj', register: 'Utwórz konto', reconnecting: 'Ponowne łączenie…' },
  de: { home: 'Start', live: 'LIVE', sylora: 'Sylora', inbox: 'Postfach', profile: 'Profil', startLive: 'LIVE starten', create: 'Erstellen', integrations: 'Integrationen', settings: 'Einstellungen', language: 'Sprache der Oberfläche', logout: 'Abmelden', signIn: 'Anmelden', register: 'Konto erstellen', reconnecting: 'Verbindung wird wiederhergestellt…' },
  ru: { home: 'Главная', live: 'LIVE', sylora: 'Sylora', inbox: 'Входящие', profile: 'Профиль', startLive: 'Начать эфир', create: 'Создать', integrations: 'Интеграции', settings: 'Настройки', language: 'Язык интерфейса', logout: 'Выйти', signIn: 'Войти', register: 'Создать аккаунт', reconnecting: 'Восстанавливаю связь…' }
} as const;

type I18nValue = { locale: Locale; setLocale: (value: Locale) => void; t: (key: keyof typeof dictionaries.uk) => string };
const I18nContext = createContext<I18nValue | null>(null);
const LOCALE_KEY = 'sylora.locale.v1';

export function I18nProvider({ children }: React.PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>('uk');
  useEffect(() => { SecureStore.getItemAsync(LOCALE_KEY).then(value => { if (locales.includes(value as Locale)) setLocale(value as Locale); }).catch(() => {}); }, []);
  const updateLocale = useCallback((value: Locale) => { setLocale(value); SecureStore.setItemAsync(LOCALE_KEY, value).catch(() => {}); }, []);
  const value = useMemo<I18nValue>(() => ({ locale, setLocale: updateLocale, t: key => dictionaries[locale][key] }), [locale, updateLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('I18N_PROVIDER_REQUIRED');
  return value;
}

export const localeLabels: Record<Locale, string> = { uk: 'Українська', en: 'English', pl: 'Polski', de: 'Deutsch', ru: 'Русский' };
