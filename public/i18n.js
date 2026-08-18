/**
 * SYLORA UI localization core.
 * Production UI locales: UK / EN / PL / DE / RU.
 * Brand and international technical tokens (SYLORA, LIVE, LUMEN, OBS, WebRTC, RTMP, API) remain stable.
 */

export const DEFAULT_UI_LOCALE='uk';
export const SUPPORTED_UI_LOCALES=Object.freeze(['uk','en','pl','de','ru']);
export const FUTURE_UI_LOCALES=Object.freeze(['es','fr','it','pt']);
export const PRIORITY_VOICE_LOCALES=Object.freeze(['uk','en','pl','de','ru']);

const supported=new Set(SUPPORTED_UI_LOCALES);

const base={
  home:'Home',live:'LIVE',clips:'Clips',studio:'Studio',ai:'Sylora',profile:'Profile',
  inbox:'Inbox',chat:'Inbox',gifts:'Gifts',more:'Settings',explore:'Discover',
  science:'Learning',business:'Business',communities:'Communities',videos:'Videos',
  signin:'Sign in',signout:'Sign out',create:'Create account',register:'Register',login:'Sign in',
  password:'Password — 10+ characters with a letter and number',identity:'Email or username',
  composer:"What's new?",publish:'Publish',join:'Create account',
  joinTitle:'Join SYLORA',joinText:'Create an account to publish and interact.',authTitle:'Enter your space',
  searchPlaceholder:'Search SYLORA…',createHub:'Create',createPost:'Create post',createClip:'Upload clip',
  createLive:'Start LIVE',createRoom:'Create room',createProject:'Create project',
  createCommunity:'Create community',createCourse:'Create course',createEvent:'Create event',
  talkWithSylora:'Ask Sylora',syloraNearby:"I'm here",syloraListening:"I'm listening.",
  syloraBusy:'Sylora is taking a short pause. Try again in a moment.',
  syloraUnavailable:'Sylora is temporarily unavailable. Try again soon.',
  voiceUnavailable:'Voice is unavailable. Text still works.',loading:'Starting SYLORA…',
  emptyFeed:'Your SYLORA feed will grow as you follow people and join spaces.',
  recommendedLive:'Recommended LIVE',people:'People',forYou:'For you',
  inboxMessages:'Messages',inboxNotifications:'Notifications',inboxInvites:'Invites',inboxCalls:'Calls',
  follow:'Follow',following:'Following',workspace:'Workspace',teams:'Teams',documents:'Documents',tasks:'Tasks',
  discoverLive:'Discover',guests:'Guests',battles:'Battles',streamSettings:'Stream settings',
  giftGallery:'Gift gallery',settings:'Settings',wallet:'Wallet',language:'Language',voiceLanguage:'Voice language',
  memoryTitle:'What Sylora remembers',proactiveOff:'Proactive: off',comingSoon:'Coming soon',
  disabledNeedAuth:'Sign in to use this',paidCoursesBlocked:'Paid courses unlock after payment provider configuration.',
  coreOnline:'Core online',translate:'Translate',showOriginal:'Show original',
  retry:'Retry',cancel:'Cancel',confirm:'Confirm',save:'Save',delete:'Delete',close:'Close',
  offline:'Offline',connecting:'Connecting',connected:'Connected',degraded:'Degraded',error:'Error'
};

function dict(overrides={}){return Object.freeze({...base,...overrides})}

const dictionaries=Object.freeze({
  en:dict(),
  uk:dict({
    home:'Головна',profile:'Профіль',inbox:'Вхідні',chat:'Вхідні',gifts:'Подарунки',more:'Налаштування',
    explore:'Відкриття',science:'Навчання',business:'Бізнес',communities:'Спільноти',videos:'Відео',
    signin:'Увійти',signout:'Вийти',create:'Створити акаунт',register:'Реєстрація',login:'Вхід',
    password:'Пароль — від 10 символів, з літерою і цифрою',identity:'Email або ім’я користувача',
    composer:'Що нового?',publish:'Опублікувати',join:'Створити акаунт',
    joinTitle:'Приєднуйся до SYLORA',joinText:'Створи акаунт, щоб публікувати та взаємодіяти.',authTitle:'Увійди у свій простір',
    searchPlaceholder:'Пошук у SYLORA…',createHub:'Створити',createPost:'Створити пост',createClip:'Завантажити кліп',
    createLive:'Почати LIVE',createRoom:'Створити кімнату',createProject:'Створити проєкт',
    createCommunity:'Створити спільноту',createCourse:'Створити курс',createEvent:'Створити подію',
    talkWithSylora:'Запитати Sylora',syloraNearby:'Я поруч.',syloraListening:'Я слухаю.',
    syloraBusy:'Sylora зараз зайнята. Спробуй ще раз за мить.',syloraUnavailable:'Sylora тимчасово недоступна. Спробуй трохи пізніше.',
    voiceUnavailable:'Голос недоступний. Текстовий режим працює.',loading:'Запускаємо SYLORA…',
    emptyFeed:'Стрічка оживе, коли ти підпишешся на людей і приєднаєшся до просторів.',
    recommendedLive:'Рекомендовані LIVE',people:'Люди',forYou:'Для тебе',
    inboxMessages:'Повідомлення',inboxNotifications:'Сповіщення',inboxInvites:'Запрошення',inboxCalls:'Дзвінки',
    follow:'Підписатися',following:'Підписки',workspace:'Робочий простір',teams:'Команди',documents:'Документи',tasks:'Завдання',
    discoverLive:'Відкриття',guests:'Гості',battles:'Батли',streamSettings:'Налаштування ефіру',
    giftGallery:'Галерея подарунків',settings:'Налаштування',wallet:'Гаманець',language:'Мова',voiceLanguage:'Мова голосу',
    memoryTitle:'Що Sylora пам’ятає про тебе',proactiveOff:'Проактивність: вимкнено',comingSoon:'Незабаром',
    disabledNeedAuth:'Увійди, щоб користуватися',paidCoursesBlocked:'Платні курси відкриються після налаштування платежів.',
    coreOnline:'Ядро онлайн',translate:'Перекласти',showOriginal:'Показати оригінал',retry:'Спробувати ще раз',cancel:'Скасувати',
    confirm:'Підтвердити',save:'Зберегти',delete:'Видалити',close:'Закрити',offline:'Офлайн',connecting:'Підключення',
    connected:'Підключено',degraded:'Обмежений режим',error:'Помилка'
  }),
  pl:dict({
    home:'Główna',profile:'Profil',inbox:'Skrzynka',chat:'Skrzynka',gifts:'Prezenty',more:'Ustawienia',
    explore:'Odkrywaj',science:'Nauka',business:'Biznes',communities:'Społeczności',videos:'Wideo',
    signin:'Zaloguj',signout:'Wyloguj',create:'Utwórz konto',register:'Rejestracja',login:'Logowanie',
    password:'Hasło — minimum 10 znaków, litera i cyfra',identity:'Email lub nazwa użytkownika',
    composer:'Co nowego?',publish:'Opublikuj',join:'Utwórz konto',joinTitle:'Dołącz do SYLORA',
    joinText:'Utwórz konto, aby publikować i wchodzić w interakcje.',authTitle:'Wejdź do swojej przestrzeni',
    searchPlaceholder:'Szukaj w SYLORA…',createHub:'Utwórz',createPost:'Utwórz post',createClip:'Prześlij klip',
    createLive:'Start LIVE',createRoom:'Utwórz pokój',createProject:'Utwórz projekt',createCommunity:'Utwórz społeczność',
    createCourse:'Utwórz kurs',createEvent:'Utwórz wydarzenie',talkWithSylora:'Zapytaj Sylorę',syloraNearby:'Jestem tu.',
    syloraListening:'Słucham.',syloraBusy:'Sylora jest chwilowo zajęta. Spróbuj za moment.',
    syloraUnavailable:'Sylora jest tymczasowo niedostępna. Spróbuj ponownie wkrótce.',
    voiceUnavailable:'Głos jest niedostępny. Tekst nadal działa.',loading:'Uruchamiamy SYLORA…',
    emptyFeed:'Twój feed ożyje, gdy zaczniesz obserwować ludzi i dołączysz do przestrzeni.',recommendedLive:'Polecane LIVE',
    people:'Ludzie',forYou:'Dla Ciebie',inboxMessages:'Wiadomości',inboxNotifications:'Powiadomienia',
    inboxInvites:'Zaproszenia',inboxCalls:'Połączenia',follow:'Obserwuj',following:'Obserwowani',workspace:'Obszar roboczy',
    teams:'Zespoły',documents:'Dokumenty',tasks:'Zadania',discoverLive:'Odkrywaj',guests:'Goście',battles:'Bitwy',
    streamSettings:'Ustawienia transmisji',giftGallery:'Galeria prezentów',settings:'Ustawienia',wallet:'Portfel',
    language:'Język',voiceLanguage:'Język głosu',memoryTitle:'Co Sylora o Tobie pamięta',proactiveOff:'Proaktywność: wyłączona',
    comingSoon:'Wkrótce',disabledNeedAuth:'Zaloguj się, aby użyć tej funkcji',paidCoursesBlocked:'Płatne kursy pojawią się po konfiguracji płatności.',
    coreOnline:'Rdzeń online',translate:'Przetłumacz',showOriginal:'Pokaż oryginał',retry:'Spróbuj ponownie',cancel:'Anuluj',confirm:'Potwierdź',
    save:'Zapisz',delete:'Usuń',close:'Zamknij',offline:'Offline',connecting:'Łączenie',connected:'Połączono',degraded:'Tryb ograniczony',error:'Błąd'
  }),
  de:dict({
    home:'Start',profile:'Profil',inbox:'Posteingang',chat:'Posteingang',gifts:'Geschenke',more:'Einstellungen',
    explore:'Entdecken',science:'Lernen',business:'Business',communities:'Communities',videos:'Videos',signin:'Anmelden',signout:'Abmelden',
    create:'Konto erstellen',register:'Registrieren',login:'Anmelden',password:'Passwort — mindestens 10 Zeichen, Buchstabe und Zahl',
    identity:'E-Mail oder Benutzername',composer:'Was gibt’s Neues?',publish:'Veröffentlichen',join:'Konto erstellen',joinTitle:'SYLORA beitreten',
    joinText:'Erstelle ein Konto, um zu veröffentlichen und mitzumachen.',authTitle:'Tritt in deinen Raum ein',searchPlaceholder:'In SYLORA suchen…',
    createHub:'Erstellen',createPost:'Beitrag erstellen',createClip:'Clip hochladen',createLive:'LIVE starten',createRoom:'Raum erstellen',
    createProject:'Projekt erstellen',createCommunity:'Community erstellen',createCourse:'Kurs erstellen',createEvent:'Event erstellen',
    talkWithSylora:'Sylora fragen',syloraNearby:'Ich bin hier.',syloraListening:'Ich höre zu.',
    syloraBusy:'Sylora ist kurz beschäftigt. Bitte gleich noch einmal versuchen.',syloraUnavailable:'Sylora ist vorübergehend nicht erreichbar. Bitte später erneut versuchen.',
    voiceUnavailable:'Sprache ist nicht verfügbar. Text funktioniert weiterhin.',loading:'SYLORA startet…',
    emptyFeed:'Dein Feed wird lebendig, sobald du Menschen folgst und Räumen beitrittst.',recommendedLive:'Empfohlene LIVE',people:'Menschen',forYou:'Für dich',
    inboxMessages:'Nachrichten',inboxNotifications:'Benachrichtigungen',inboxInvites:'Einladungen',inboxCalls:'Anrufe',follow:'Folgen',following:'Gefolgt',
    workspace:'Arbeitsbereich',teams:'Teams',documents:'Dokumente',tasks:'Aufgaben',discoverLive:'Entdecken',guests:'Gäste',battles:'Battles',
    streamSettings:'Stream-Einstellungen',giftGallery:'Geschenkgalerie',settings:'Einstellungen',wallet:'Wallet',language:'Sprache',voiceLanguage:'Sprachausgabe',
    memoryTitle:'Was Sylora über dich weiß',proactiveOff:'Proaktiv: aus',comingSoon:'Demnächst',disabledNeedAuth:'Zum Verwenden anmelden',
    paidCoursesBlocked:'Kostenpflichtige Kurse nach Zahlungsanbindung.',coreOnline:'Kern online',translate:'Übersetzen',showOriginal:'Original anzeigen',
    retry:'Erneut versuchen',cancel:'Abbrechen',confirm:'Bestätigen',save:'Speichern',delete:'Löschen',close:'Schließen',offline:'Offline',
    connecting:'Verbindung wird hergestellt',connected:'Verbunden',degraded:'Eingeschränkter Modus',error:'Fehler'
  }),
  ru:dict({
    home:'Главная',profile:'Профиль',inbox:'Входящие',chat:'Входящие',gifts:'Подарки',more:'Настройки',explore:'Открытия',science:'Обучение',
    business:'Бизнес',communities:'Сообщества',videos:'Видео',signin:'Войти',signout:'Выйти',create:'Создать аккаунт',register:'Регистрация',login:'Вход',
    password:'Пароль — минимум 10 символов, буква и цифра',identity:'Email или имя пользователя',composer:'Что нового?',publish:'Опубликовать',
    join:'Создать аккаунт',joinTitle:'Присоединяйтесь к SYLORA',joinText:'Создайте аккаунт, чтобы публиковать и взаимодействовать.',
    authTitle:'Войдите в своё пространство',searchPlaceholder:'Поиск в SYLORA…',createHub:'Создать',createPost:'Создать публикацию',createClip:'Загрузить клип',
    createLive:'Начать LIVE',createRoom:'Создать комнату',createProject:'Создать проект',createCommunity:'Создать сообщество',createCourse:'Создать курс',
    createEvent:'Создать событие',talkWithSylora:'Спросить Sylora',syloraNearby:'Я рядом.',syloraListening:'Я слушаю.',
    syloraBusy:'Sylora сейчас занята. Попробуйте ещё раз через мгновение.',syloraUnavailable:'Sylora временно недоступна. Попробуйте немного позже.',
    voiceUnavailable:'Голос недоступен. Текстовый режим работает.',loading:'Запускаем SYLORA…',
    emptyFeed:'Лента оживёт, когда вы подпишетесь на людей и присоединитесь к пространствам.',recommendedLive:'Рекомендованные LIVE',people:'Люди',forYou:'Для вас',
    inboxMessages:'Сообщения',inboxNotifications:'Уведомления',inboxInvites:'Приглашения',inboxCalls:'Звонки',follow:'Подписаться',following:'Подписки',
    workspace:'Рабочее пространство',teams:'Команды',documents:'Документы',tasks:'Задачи',discoverLive:'Открытия',guests:'Гости',battles:'Батлы',
    streamSettings:'Настройки трансляции',giftGallery:'Галерея подарков',settings:'Настройки',wallet:'Кошелёк',language:'Язык',voiceLanguage:'Язык голоса',
    memoryTitle:'Что Sylora помнит о вас',proactiveOff:'Проактивность: выключена',comingSoon:'Скоро',disabledNeedAuth:'Войдите, чтобы использовать',
    paidCoursesBlocked:'Платные курсы станут доступны после настройки платежей.',coreOnline:'Ядро онлайн',translate:'Перевести',showOriginal:'Показать оригинал',
    retry:'Повторить',cancel:'Отмена',confirm:'Подтвердить',save:'Сохранить',delete:'Удалить',close:'Закрыть',offline:'Офлайн',connecting:'Подключение',
    connected:'Подключено',degraded:'Ограниченный режим',error:'Ошибка'
  })
});

const ERROR_MAP=Object.freeze({
  AI_PROVIDER_NOT_CONFIGURED:'syloraUnavailable',AI_PROVIDER_ERROR:'syloraBusy',AI_RATE_LIMITED:'syloraBusy',
  REALTIME_SESSION_FAILED:'syloraBusy',REALTIME_PROVIDER_ERROR:'syloraBusy',REQUEST_FAILED:'syloraBusy'
});

function readStoredLocale(){try{return globalThis.localStorage?.getItem?.('sylora_locale')||''}catch{return ''}}
function writeStoredLocale(value){try{globalThis.localStorage?.setItem?.('sylora_locale',value)}catch{/* storage unavailable */}}
function browserLocale(){
  const raw=String(globalThis.navigator?.language||'').slice(0,2).toLowerCase();
  return supported.has(raw)?raw:DEFAULT_UI_LOCALE;
}

let locale=readStoredLocale();
if(!supported.has(locale))locale=browserLocale();
if(!supported.has(locale))locale=DEFAULT_UI_LOCALE;

export function getLocale(){return locale}
export function getDictionary(target=locale){return dictionaries[supported.has(target)?target:DEFAULT_UI_LOCALE]}
export function setLocale(next,{persist=true}={}){
  locale=supported.has(next)?next:DEFAULT_UI_LOCALE;
  if(persist)writeStoredLocale(locale);
  if(typeof document!=='undefined'){
    document.documentElement.lang=locale;
    document.documentElement.dir='ltr';
  }
  return locale;
}
export function t(key){return dictionaries[locale]?.[key]??dictionaries.en?.[key]??dictionaries.uk?.[key]??key}
export function tf(key,...args){let s=t(key);args.forEach((v,i)=>{s=s.replace(new RegExp(`\\{${i}\\}`,'g'),String(v))});return s}
export function humanError(codeOrMessage){
  const code=String(codeOrMessage||'');
  const key=ERROR_MAP[code];
  if(key)return t(key);
  if(/AI_PROVIDER|REALTIME_|OPENAI|PROVIDER/i.test(code))return t('syloraUnavailable');
  return code.length<120?code:t('syloraBusy');
}
export function detectBrowserLocale(){return browserLocale()}
export function localeLabel(value){return ({uk:'UA',en:'EN',pl:'PL',de:'DE',ru:'RU'})[value]||String(value||'').toUpperCase()}
