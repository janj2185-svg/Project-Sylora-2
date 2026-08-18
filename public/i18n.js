/** Scalable i18n — brand tokens (SYLORA, LIVE, Lumen) stay as-is. */
const base={
  home:'Home',live:'LIVE',clips:'Clips',studio:'Studio',ai:'Sylora',profile:'Profile',
  inbox:'Inbox',chat:'Inbox',gifts:'Gifts',more:'Settings',explore:'Discover',
  science:'Science',business:'Business',communities:'Communities',videos:'Videos',
  signin:'Sign in',create:'Create account',register:'Register',login:'Sign in',
  password:'Password — 10+ characters with a letter and number',identity:'Email or username',
  composer:"What's new?",publish:'Publish',join:'Create account',
  joinTitle:'Join SYLORA',joinText:'Create an account to publish and interact.',
  authTitle:'Enter your space',
  searchPlaceholder:'Search SYLORA…',
  createHub:'Create',createPost:'Create Post',createClip:'Upload Clip',
  createLive:'Start LIVE',createRoom:'Create Room',createProject:'Create Project',
  createCommunity:'Create Community',createCourse:'Create Course',createEvent:'Create Event',
  talkWithSylora:'Talk with Sylora',syloraNearby:"I'm here",syloraListening:"I'm listening.",
  syloraBusy:'Sylora is taking a short pause. Try again in a moment.',
  syloraUnavailable:'Sylora is temporarily unavailable. Your message is safe — please try again soon.',
  loading:'Starting SYLORA…',emptyFeed:'Your SYLORA feed will grow as you follow people and join spaces.',
  recommendedLive:'Recommended LIVE',people:'People',forYou:'For you',
  inboxMessages:'Messages',inboxNotifications:'Notifications',inboxInvites:'Invites',
  inboxCalls:'Calls',follow:'Follow',workspace:'Workspace',teams:'Teams',
  documents:'Documents',tasks:'Tasks',discoverLive:'Discover',following:'Following',
  guests:'Guests',battles:'Battles',streamSettings:'Stream settings',
  giftGallery:'Gift gallery',settings:'Settings',wallet:'Wallet',
  language:'Language',voiceLanguage:'Voice language',
  memoryTitle:'What Sylora remembers',proactiveOff:'Proactive: off',
  comingSoon:'Coming soon',disabledNeedAuth:'Sign in to use this',
  paidCoursesBlocked:'Paid courses unlock after payment provider configuration.',
  coreOnline:'Core online'
};

function dict(overrides){return {...base,...overrides}}

const fullDictionaries={
  uk:dict({
    home:'Головна',profile:'Профіль',inbox:'Вхідні',chat:'Вхідні',gifts:'Подарунки',more:'Налаштування',
    explore:'Відкриття',science:'Наука',business:'Бізнес',communities:'Спільноти',videos:'Відео',
    signin:'Увійти',create:'Створити акаунт',register:'Реєстрація',login:'Вхід',
    password:'Пароль — від 10 символів, з літерою і цифрою',identity:'Email або ім’я користувача',
    composer:'Що нового?',publish:'Опублікувати',join:'Створити акаунт',
    joinTitle:'Приєднуйся до SYLORA',joinText:'Створи акаунт, щоб публікувати та взаємодіяти.',
    authTitle:'Увійди у свій простір',
    searchPlaceholder:'Пошук у SYLORA…',
    createHub:'Створити',createPost:'Створити пост',createClip:'Завантажити кліп',
    createLive:'Почати LIVE',createRoom:'Створити кімнату',createProject:'Створити проєкт',
    createCommunity:'Створити спільноту',createCourse:'Створити курс',createEvent:'Створити подію',
    talkWithSylora:'Поговорити із Sylora',syloraNearby:'Я поруч.',syloraListening:'Я слухаю.',
    syloraBusy:'Sylora зараз зайнята. Спробуй ще раз за мить.',
    syloraUnavailable:'Sylora тимчасово недоступна. Спробуй трохи пізніше.',
    loading:'Запускаємо SYLORA…',emptyFeed:'Стрічка оживе, коли ти підпишешся на людей і приєднаєшся до просторів.',
    recommendedLive:'Рекомендовані LIVE',people:'Люди',forYou:'Для тебе',
    inboxMessages:'Повідомлення',inboxNotifications:'Сповіщення',inboxInvites:'Запрошення',
    inboxCalls:'Дзвінки',follow:'Підписатися',workspace:'Робочий простір',teams:'Команди',
    documents:'Документи',tasks:'Завдання',discoverLive:'Відкриття',following:'Підписки',
    guests:'Гості',battles:'Батли',streamSettings:'Налаштування ефіру',
    giftGallery:'Галерея подарунків',settings:'Налаштування',wallet:'Гаманець',
    language:'Мова',voiceLanguage:'Мова голосу',
    memoryTitle:'Що Sylora пам’ятає про тебе',proactiveOff:'Проактивність: вимкнено',
    comingSoon:'Незабаром',disabledNeedAuth:'Увійди, щоб користуватися',
    paidCoursesBlocked:'Платні курси відкриються після налаштування платежів.',
    coreOnline:'Ядро онлайн'
  }),
  pl:dict({
    home:'Główna',profile:'Profil',inbox:'Skrzynka',chat:'Skrzynka',gifts:'Prezenty',more:'Ustawienia',
    explore:'Odkrywaj',science:'Nauka',business:'Biznes',communities:'Społeczności',videos:'Wideo',
    signin:'Zaloguj',create:'Utwórz konto',register:'Rejestracja',login:'Logowanie',
    password:'Hasło — minimum 10 znaków, litera i cyfra',identity:'Email lub nazwa użytkownika',
    composer:'Co nowego?',publish:'Opublikuj',join:'Utwórz konto',
    joinTitle:'Dołącz do SYLORA',joinText:'Utwórz konto, aby publikować i wchodzić w interakcje.',
    authTitle:'Wejdź do swojej przestrzeni',
    searchPlaceholder:'Szukaj w SYLORA…',
    createHub:'Utwórz',createPost:'Utwórz post',createClip:'Prześlij klip',
    createLive:'Start LIVE',createRoom:'Utwórz pokój',createProject:'Utwórz projekt',
    createCommunity:'Utwórz społeczność',createCourse:'Utwórz kurs',createEvent:'Utwórz wydarzenie',
    talkWithSylora:'Porozmawiaj z Sylorą',syloraNearby:'Jestem tu.',syloraListening:'Słucham.',
    syloraBusy:'Sylora jest chwilowo zajęta. Spróbuj za moment.',
    syloraUnavailable:'Sylora jest tymczasowo niedostępna. Spróbuj ponownie wkrótce.',
    loading:'Uruchamiamy SYLORA…',emptyFeed:'Twój feed ożyje, gdy zaczniesz obserwować ludzi i dołączysz do przestrzeni.',
    recommendedLive:'Polecane LIVE',people:'Ludzie',forYou:'Dla Ciebie',
    inboxMessages:'Wiadomości',inboxNotifications:'Powiadomienia',inboxInvites:'Zaproszenia',
    inboxCalls:'Połączenia',follow:'Obserwuj',workspace:'Obszar roboczy',teams:'Zespoły',
    documents:'Dokumenty',tasks:'Zadania',discoverLive:'Odkrywaj',following:'Obserwowani',
    guests:'Goście',battles:'Bitwy',streamSettings:'Ustawienia transmisji',
    giftGallery:'Galeria prezentów',settings:'Ustawienia',wallet:'Portfel',
    language:'Język',voiceLanguage:'Język głosu',
    memoryTitle:'Co Sylora o Tobie pamięta',proactiveOff:'Proaktywność: wyłączona',
    comingSoon:'Wkrótce',disabledNeedAuth:'Zaloguj się, aby użyć tej funkcji',
    paidCoursesBlocked:'Płatne kursy pojawią się po konfiguracji płatności.',
    coreOnline:'Rdzeń online'
  }),
  en:dict({}),
  de:dict({
    home:'Start',profile:'Profil',inbox:'Posteingang',chat:'Posteingang',gifts:'Geschenke',more:'Einstellungen',
    explore:'Entdecken',science:'Wissenschaft',business:'Business',communities:'Communities',videos:'Videos',
    signin:'Anmelden',create:'Konto erstellen',register:'Registrieren',login:'Anmelden',
    password:'Passwort — mindestens 10 Zeichen, Buchstabe und Zahl',identity:'E-Mail oder Benutzername',
    composer:'Was gibt’s Neues?',publish:'Veröffentlichen',join:'Konto erstellen',
    joinTitle:'SYLORA beitreten',joinText:'Erstelle ein Konto, um zu veröffentlichen und mitzumachen.',
    authTitle:'Tritt in deinen Raum ein',
    searchPlaceholder:'In SYLORA suchen…',
    createHub:'Erstellen',createPost:'Beitrag erstellen',createClip:'Clip hochladen',
    createLive:'LIVE starten',createRoom:'Raum erstellen',createProject:'Projekt erstellen',
    createCommunity:'Community erstellen',createCourse:'Kurs erstellen',createEvent:'Event erstellen',
    talkWithSylora:'Mit Sylora sprechen',syloraNearby:'Ich bin hier.',syloraListening:'Ich höre zu.',
    syloraBusy:'Sylora ist kurz beschäftigt. Bitte gleich noch einmal versuchen.',
    syloraUnavailable:'Sylora ist vorübergehend nicht erreichbar. Bitte später erneut versuchen.',
    loading:'SYLORA startet…',emptyFeed:'Dein Feed wird lebendig, sobald du Menschen folgst und Räumen beitrittst.',
    recommendedLive:'Empfohlene LIVE',people:'Menschen',forYou:'Für dich',
    inboxMessages:'Nachrichten',inboxNotifications:'Benachrichtigungen',inboxInvites:'Einladungen',
    inboxCalls:'Anrufe',follow:'Folgen',workspace:'Arbeitsbereich',teams:'Teams',
    documents:'Dokumente',tasks:'Aufgaben',discoverLive:'Entdecken',following:'Gefolgt',
    guests:'Gäste',battles:'Battles',streamSettings:'Stream-Einstellungen',
    giftGallery:'Geschenkgalerie',settings:'Einstellungen',wallet:'Wallet',
    language:'Sprache',voiceLanguage:'Sprachausgabe',
    memoryTitle:'Was Sylora über dich weiß',proactiveOff:'Proaktiv: aus',
    comingSoon:'Demnächst',disabledNeedAuth:'Zum Verwenden anmelden',
    paidCoursesBlocked:'Kostenpflichtige Kurse nach Zahlungsanbindung.',
    coreOnline:'Kern online'
  }),
  ru:dict({
    home:'Главная',profile:'Профиль',inbox:'Входящие',chat:'Входящие',gifts:'Подарки',more:'Настройки',
    explore:'Открытия',science:'Наука',business:'Бизнес',communities:'Сообщества',videos:'Видео',
    signin:'Войти',create:'Создать аккаунт',register:'Регистрация',login:'Вход',
    password:'Пароль — минимум 10 символов, буква и цифра',identity:'Email или имя пользователя',
    composer:'Что нового?',publish:'Опубликовать',join:'Создать аккаунт',
    joinTitle:'Присоединяйтесь к SYLORA',joinText:'Создайте аккаунт, чтобы публиковать и взаимодействовать.',
    authTitle:'Войдите в своё пространство',
    searchPlaceholder:'Поиск в SYLORA…',
    createHub:'Создать',createPost:'Создать публикацию',createClip:'Загрузить клип',
    createLive:'Начать LIVE',createRoom:'Создать комнату',createProject:'Создать проект',
    createCommunity:'Создать сообщество',createCourse:'Создать курс',createEvent:'Создать событие',
    talkWithSylora:'Поговорить с Sylora',syloraNearby:'Я рядом.',syloraListening:'Я слушаю.',
    syloraBusy:'Sylora сейчас занята. Попробуйте ещё раз через мгновение.',
    syloraUnavailable:'Sylora временно недоступна. Попробуйте немного позже.',
    loading:'Запускаем SYLORA…',emptyFeed:'Лента оживёт, когда вы подпишетесь на людей и присоединитесь к пространствам.',
    recommendedLive:'Рекомендованные LIVE',people:'Люди',forYou:'Для вас',
    inboxMessages:'Сообщения',inboxNotifications:'Уведомления',inboxInvites:'Приглашения',
    inboxCalls:'Звонки',follow:'Подписаться',workspace:'Рабочее пространство',teams:'Команды',
    documents:'Документы',tasks:'Задачи',discoverLive:'Открытия',following:'Подписки',
    guests:'Гости',battles:'Батлы',streamSettings:'Настройки трансляции',
    giftGallery:'Галерея подарков',settings:'Настройки',wallet:'Кошелёк',
    language:'Язык',voiceLanguage:'Язык голоса',
    memoryTitle:'Что Sylora помнит о вас',proactiveOff:'Проактивность: выключена',
    comingSoon:'Скоро',disabledNeedAuth:'Войдите, чтобы использовать',
    paidCoursesBlocked:'Платные курсы станут доступны после настройки платежей.',
    coreOnline:'Ядро онлайн'
  })
};

// These locales remain available internally for future translation work, but are not advertised as complete UI languages.
const experimentalDictionaries={
  es:dict({home:'Inicio',profile:'Perfil',inbox:'Inbox',more:'Ajustes',science:'Ciencia',business:'Negocios',signin:'Entrar',composer:'¿Qué hay de nuevo?',publish:'Publicar',searchPlaceholder:'Buscar en Sylora…',createHub:'Crear',talkWithSylora:'Hablar con Sylora',syloraNearby:'Estoy aquí.',syloraListening:'Te escucho.'}),
  fr:dict({home:'Accueil',profile:'Profil',inbox:'Inbox',more:'Réglages',science:'Science',business:'Business',signin:'Connexion',composer:'Quoi de neuf ?',publish:'Publier',searchPlaceholder:'Rechercher dans Sylora…',createHub:'Créer',talkWithSylora:'Parler à Sylora',syloraNearby:'Je suis là.',syloraListening:"J'écoute."}),
  it:dict({home:'Home',profile:'Profilo',inbox:'Inbox',more:'Impostazioni',science:'Scienza',business:'Business',signin:'Accedi',composer:'Novità?',publish:'Pubblica',searchPlaceholder:'Cerca in Sylora…',createHub:'Crea',talkWithSylora:'Parla con Sylora',syloraNearby:'Sono qui.',syloraListening:'Ti ascolto.'}),
  pt:dict({home:'Início',profile:'Perfil',inbox:'Inbox',more:'Definições',science:'Ciência',business:'Negócios',signin:'Entrar',composer:'Novidades?',publish:'Publicar',searchPlaceholder:'Pesquisar no Sylora…',createHub:'Criar',talkWithSylora:'Falar com a Sylora',syloraNearby:'Estou aqui.',syloraListening:'Estou a ouvir.'}),
  cs:dict({home:'Domů',profile:'Profil',inbox:'Inbox',more:'Nastavení',science:'Věda',business:'Byznys',signin:'Přihlásit',composer:'Co je nového?',publish:'Publikovat',createHub:'Vytvořit',talkWithSylora:'Mluvit se Sylorou',syloraNearby:'Jsem tu.',syloraListening:'Poslouchám.'}),
  sk:dict({home:'Domov',profile:'Profil',inbox:'Inbox',more:'Nastavenia',science:'Veda',business:'Biznis',signin:'Prihlásiť',composer:'Čo je nové?',publish:'Publikovať',createHub:'Vytvoriť',talkWithSylora:'Hovoriť so Sylorou',syloraNearby:'Som tu.',syloraListening:'Počúvam.'}),
  ro:dict({home:'Acasă',profile:'Profil',inbox:'Inbox',more:'Setări',science:'Știință',business:'Business',signin:'Autentificare',composer:'Ce e nou?',publish:'Publică',createHub:'Creează',talkWithSylora:'Vorbește cu Sylora',syloraNearby:'Sunt aici.',syloraListening:'Te ascult.'}),
  nl:dict({home:'Home',profile:'Profiel',inbox:'Inbox',more:'Instellingen',science:'Wetenschap',business:'Business',signin:'Inloggen',composer:'Wat is er nieuw?',publish:'Publiceren',createHub:'Maken',talkWithSylora:'Praat met Sylora',syloraNearby:'Ik ben er.',syloraListening:'Ik luister.'}),
  tr:dict({home:'Ana sayfa',profile:'Profil',inbox:'Inbox',more:'Ayarlar',science:'Bilim',business:'İş',signin:'Giriş',composer:'Yenilikler?',publish:'Yayınla',createHub:'Oluştur',talkWithSylora:'Sylora ile konuş',syloraNearby:'Buradayım.',syloraListening:'Dinliyorum.'})
};

const dictionaries={...fullDictionaries,...experimentalDictionaries};
const supportedLocaleSet=new Set(Object.keys(fullDictionaries));

export const SUPPORTED_UI_LOCALES=Object.freeze(Object.keys(fullDictionaries));
export const EXPERIMENTAL_UI_LOCALES=Object.freeze(Object.keys(experimentalDictionaries));
export const PRIORITY_VOICE_LOCALES=Object.freeze(['uk','pl','en','de','ru','es','fr','it','pt','cs','sk','ro','nl','tr']);

const ERROR_MAP={
  AI_PROVIDER_NOT_CONFIGURED:'syloraUnavailable',
  AI_PROVIDER_ERROR:'syloraBusy',
  AI_RATE_LIMITED:'syloraBusy',
  REALTIME_SESSION_FAILED:'syloraBusy',
  REALTIME_PROVIDER_ERROR:'syloraBusy',
  REQUEST_FAILED:'syloraBusy'
};

function readStoredLocale(){
  try{return globalThis.localStorage?.getItem?.('sylora_locale')||''}catch{return ''}
}
function writeStoredLocale(value){
  try{globalThis.localStorage?.setItem?.('sylora_locale',value)}catch{/* node / private mode */}
}
let locale=readStoredLocale()||'uk';
if(!supportedLocaleSet.has(locale))locale='uk';

export function getLocale(){return locale}
export function setLocale(next){
  locale=supportedLocaleSet.has(next)?next:'en';
  writeStoredLocale(locale);
  if(typeof document!=='undefined'){
    document.documentElement.lang=locale;
    document.documentElement.dir=['ar','he','fa','ur'].includes(locale)?'rtl':'ltr';
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
export function detectBrowserLocale(){
  const raw=(globalThis.navigator?.language||'uk').slice(0,2).toLowerCase();
  return supportedLocaleSet.has(raw)?raw:'en';
}
