import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export const locales = ['uk', 'en', 'pl', 'de', 'ru'] as const;
export type Locale = typeof locales[number];

const dictionaries = {
  uk: {
    home: 'Головна', live: 'LIVE', sylora: 'Sylora', inbox: 'Inbox', profile: 'Профіль', startLive: 'Почати ефір', create: 'Створити',
    integrations: 'Інтеграції', settings: 'Налаштування', language: 'Мова інтерфейсу', logout: 'Вийти', signIn: 'Увійти', register: 'Створити акаунт', reconnecting: 'Відновлюю зв’язок…',
    streamConnections: 'Підключення трансляцій', connectionsHint: 'Один центр для TikTok, YouTube, OBS, TikFinity та RTMP(S). Статуси показують реальну готовність.',
    available: 'Доступно', needsSetup: 'Потрібне налаштування', openLive: 'Відкрити LIVE', configuredDestinations: 'Налаштовані напрямки',
    ownerRelayNote: 'Чат і подарунки TikTok надходять через TikFinity на комп’ютері власника. Офіційний TikTok API не підміняється.',
    youtubeNote: 'Трансляція використовує ваш YouTube stream key через захищений RTMP(S) router.',
    obsNote: 'OBS керується локально через SYLORA Companion; пароль OBS не надсилається на сервер.',
    tikfinityNote: 'Pairing створюється всередині вашого LIVE і діє обмежений час.',
    rtmpNote: 'Мультистрім вмикається після production-конфігурації router, TLS і захищеного сховища ключів.'
  },
  en: {
    home: 'Home', live: 'LIVE', sylora: 'Sylora', inbox: 'Inbox', profile: 'Profile', startLive: 'Go live', create: 'Create',
    integrations: 'Integrations', settings: 'Settings', language: 'Interface language', logout: 'Log out', signIn: 'Sign in', register: 'Create account', reconnecting: 'Reconnecting…',
    streamConnections: 'Streaming connections', connectionsHint: 'One control center for TikTok, YouTube, OBS, TikFinity and RTMP(S). Statuses reflect real readiness.',
    available: 'Available', needsSetup: 'Setup required', openLive: 'Open LIVE', configuredDestinations: 'Configured destinations',
    ownerRelayNote: 'TikTok chat and gifts arrive through TikFinity on the owner’s computer. This does not impersonate the official TikTok API.',
    youtubeNote: 'Streaming uses your YouTube stream key through the protected RTMP(S) router.',
    obsNote: 'OBS is controlled locally through SYLORA Companion; the OBS password is never sent to the server.',
    tikfinityNote: 'Pairing is created inside your LIVE and expires after a limited time.',
    rtmpNote: 'Multistream becomes available after production router, TLS and encrypted key storage are configured.'
  },
  pl: {
    home: 'Główna', live: 'LIVE', sylora: 'Sylora', inbox: 'Skrzynka', profile: 'Profil', startLive: 'Rozpocznij LIVE', create: 'Utwórz',
    integrations: 'Integracje', settings: 'Ustawienia', language: 'Język interfejsu', logout: 'Wyloguj', signIn: 'Zaloguj', register: 'Utwórz konto', reconnecting: 'Ponowne łączenie…',
    streamConnections: 'Połączenia transmisji', connectionsHint: 'Jedno centrum dla TikTok, YouTube, OBS, TikFinity i RTMP(S). Statusy pokazują rzeczywistą gotowość.',
    available: 'Dostępne', needsSetup: 'Wymaga konfiguracji', openLive: 'Otwórz LIVE', configuredDestinations: 'Skonfigurowane kierunki',
    ownerRelayNote: 'Czat i prezenty TikTok trafiają przez TikFinity na komputerze właściciela. Oficjalny interfejs TikTok API nie jest imitowany.',
    youtubeNote: 'Transmisja używa Twojego klucza YouTube stream key przez chroniony router RTMP(S).',
    obsNote: 'OBS jest sterowany lokalnie przez SYLORA Companion; hasło OBS nie trafia na serwer.',
    tikfinityNote: 'Parowanie jest tworzone wewnątrz Twojego LIVE i wygasa po ograniczonym czasie.',
    rtmpNote: 'Multistream działa po skonfigurowaniu produkcyjnego routera, TLS i szyfrowanego magazynu kluczy.'
  },
  de: {
    home: 'Start', live: 'LIVE', sylora: 'Sylora', inbox: 'Postfach', profile: 'Profil', startLive: 'LIVE starten', create: 'Erstellen',
    integrations: 'Integrationen', settings: 'Einstellungen', language: 'Sprache der Oberfläche', logout: 'Abmelden', signIn: 'Anmelden', register: 'Konto erstellen', reconnecting: 'Verbindung wird wiederhergestellt…',
    streamConnections: 'Streaming-Verbindungen', connectionsHint: 'Eine Zentrale für TikTok, YouTube, OBS, TikFinity und RTMP(S). Statusangaben zeigen die tatsächliche Bereitschaft.',
    available: 'Verfügbar', needsSetup: 'Einrichtung erforderlich', openLive: 'LIVE öffnen', configuredDestinations: 'Eingerichtete Ziele',
    ownerRelayNote: 'TikTok-Chat und Geschenke kommen über TikFinity auf dem Rechner des Owners. Die offizielle TikTok API wird nicht imitiert.',
    youtubeNote: 'Der Stream verwendet deinen YouTube Stream-Key über den geschützten RTMP(S)-Router.',
    obsNote: 'OBS wird lokal über SYLORA Companion gesteuert; das OBS-Passwort wird nie an den Server gesendet.',
    tikfinityNote: 'Das Pairing wird innerhalb deines LIVE erstellt und läuft nach begrenzter Zeit ab.',
    rtmpNote: 'Multistream wird nach Einrichtung von Production-Router, TLS und verschlüsseltem Schlüsselspeicher verfügbar.'
  },
  ru: {
    home: 'Главная', live: 'LIVE', sylora: 'Sylora', inbox: 'Входящие', profile: 'Профиль', startLive: 'Начать эфир', create: 'Создать',
    integrations: 'Интеграции', settings: 'Настройки', language: 'Язык интерфейса', logout: 'Выйти', signIn: 'Войти', register: 'Создать аккаунт', reconnecting: 'Восстанавливаю связь…',
    streamConnections: 'Подключения трансляций', connectionsHint: 'Один центр для TikTok, YouTube, OBS, TikFinity и RTMP(S). Статусы показывают реальную готовность.',
    available: 'Доступно', needsSetup: 'Нужна настройка', openLive: 'Открыть LIVE', configuredDestinations: 'Настроенные направления',
    ownerRelayNote: 'Чат и подарки TikTok поступают через TikFinity на компьютере владельца. Официальный TikTok API не подменяется.',
    youtubeNote: 'Трансляция использует ваш YouTube stream key через защищённый RTMP(S) router.',
    obsNote: 'OBS управляется локально через SYLORA Companion; пароль OBS не отправляется на сервер.',
    tikfinityNote: 'Pairing создаётся внутри вашего LIVE и действует ограниченное время.',
    rtmpNote: 'Мультистрим доступен после production-настройки router, TLS и зашифрованного хранилища ключей.'
  }
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
