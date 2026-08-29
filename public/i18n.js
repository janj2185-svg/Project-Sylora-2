/**
 * SYLORA UI localization core.
 * Production UI locales: UA / EN / PL / DE / RU.
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
  goodMorning:'Good morning',goodAfternoon:'Good afternoon',goodEvening:'Good evening',personalCenter:'Your personal center.',
  peopleMayKnow:'People you may know',showAll:'Show all',newPeopleHere:'New people will appear here.',
  popularNow:'Popular now',watch:'Watch',waitingLive:'Waiting for the next LIVE.',myLumen:'MY LUMEN',
  dailyBrief:'Daily Brief',enable:'Enable',disable:'Disable',continue:'Continue',dailyBriefUpdated:'Daily Brief updated',
  notifications:'notifications',conversations:'conversations',message:'Message',vertical:'Vertical',longForm:'Long-form',
  homeEmptyTitle:'Your world starts here.',homeEmptyText:'Follow people or explore a space once. SYLORA will build this Home around real activity — never fake counters.',
  liveCapabilities:'Available LIVE modes',liveEmptyTitle:'The next LIVE starts with you.',liveEmptyText:'No one is live right now. Start a real room or return when a creator goes live.',
  liveFollowingEmptyTitle:'Your following LIVE feed is quiet.',liveFollowingEmptyText:'Follow creators first. This view stays honest until a followed creator is live.',
  inboxMessages:'Messages',inboxNotifications:'Notifications',inboxInvites:'Invites',inboxCalls:'Calls',
  follow:'Follow',following:'Following',workspace:'Workspace',teams:'Teams',documents:'Documents',tasks:'Tasks',
  discoverLive:'Discover',guests:'Guests',battles:'Battles',streamSettings:'Stream settings',
  streamConnections:'Streaming connections',integrationTruth:'Open LIVE or Studio to configure each connection.',
  ownerRelay:'Owner relay',streamKeyRequired:'Stream key required',localControl:'Local control',localBridge:'Local companion',routerSetup:'Router setup',
  interfaceLanguage:'Interface language',interfaceLanguageHint:'Changes menus and system controls. User content stays in its original language.',
  settingsTitle:'Your control space.',settingsIntro:'Identity, privacy, security and system tools without repeating the main navigation.',
  personalSecurity:'Personal & security',personalSecurityCopy:'Identity, privacy and data controls.',systemTools:'System tools',systemToolsCopy:'Focused workspaces and integrations.',
  administration:'Administration',administrationCopy:'Platform operations.',identityTitle:'SYLORA Identity',identityCopy:'Skills, portfolio and privacy levels.',
  dashboardTitle:'Personal Dashboard',dashboardCopy:'Today · Tasks · Goals · Continuity.',securityCenter:'Security Center',securityCenterCopy:'Privacy, data export and provenance.',
  canvasTitle:'Sylora Canvas',canvasCopy:'Documents, plans and research.',agentMarketplace:'Agent Marketplace',agentMarketplaceCopy:'AI agents with explicit permissions.',
  developerPlatform:'Developer Platform',developerPlatformCopy:'API keys, scopes and sandbox.',moderation:'Moderation',moderationCopy:'Reports and audit log.',
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
    goodMorning:'Добрий ранок',goodAfternoon:'Добрий день',goodEvening:'Добрий вечір',personalCenter:'Твій персональний центр.',
    peopleMayKnow:'Люди, яких ти можеш знати',showAll:'Показати всі',newPeopleHere:'Нові люди з’являться тут.',
    popularNow:'Популярні зараз',watch:'Дивитися',waitingLive:'Очікуємо наступний LIVE.',myLumen:'МІЙ LUMEN',
    dailyBrief:'Щоденний огляд',enable:'Увімкнути',disable:'Вимкнути',continue:'Продовжити',dailyBriefUpdated:'Щоденний огляд оновлено',
    notifications:'сповіщень',conversations:'розмов',message:'Повідомлення',vertical:'Вертикальний формат',longForm:'Довгий формат',
    homeEmptyTitle:'Твій світ починається тут.',homeEmptyText:'Підпишись на людей або відкрий простір. SYLORA побудує цю Головну на реальній активності — без вигаданих лічильників.',
    liveCapabilities:'Доступні режими LIVE',liveEmptyTitle:'Наступний LIVE починається з тебе.',liveEmptyText:'Зараз ніхто не в ефірі. Створи реальну кімнату або повернись, коли автор вийде у LIVE.',
    liveFollowingEmptyTitle:'У підписках зараз тихо.',liveFollowingEmptyText:'Спочатку підпишись на авторів. Тут з’являться лише їхні справжні LIVE.',
    inboxMessages:'Повідомлення',inboxNotifications:'Сповіщення',inboxInvites:'Запрошення',inboxCalls:'Дзвінки',
    follow:'Підписатися',following:'Підписки',workspace:'Робочий простір',teams:'Команди',documents:'Документи',tasks:'Завдання',
    discoverLive:'Відкриття',guests:'Гості',battles:'Батли',streamSettings:'Налаштування ефіру',
    streamConnections:'Підключення трансляцій',integrationTruth:'Відкрий LIVE або Studio, щоб налаштувати кожне підключення.',
    ownerRelay:'Relay власника',streamKeyRequired:'Потрібен stream key',localControl:'Локальне керування',localBridge:'Локальний companion',routerSetup:'Налаштування router',
    interfaceLanguage:'Мова інтерфейсу',interfaceLanguageHint:'Змінює меню та системні елементи. Контент користувачів залишається мовою оригіналу.',
    settingsTitle:'Твій простір керування.',settingsIntro:'Ідентичність, приватність, безпека та системні інструменти — без повторення основної навігації.',
    personalSecurity:'Особисте й безпека',personalSecurityCopy:'Ідентичність, приватність і контроль даних.',systemTools:'Системні інструменти',systemToolsCopy:'Спеціалізовані робочі поверхні й інтеграції.',
    administration:'Адміністрування',administrationCopy:'Службові інструменти платформи.',identityTitle:'SYLORA Identity',identityCopy:'Навички, портфоліо та рівні приватності.',
    dashboardTitle:'Personal Dashboard',dashboardCopy:'Сьогодні · Завдання · Цілі · Безперервність.',securityCenter:'Центр безпеки',securityCenterCopy:'Приватність, експорт даних і provenance.',
    canvasTitle:'Sylora Canvas',canvasCopy:'Документи, плани та дослідження.',agentMarketplace:'Agent Marketplace',agentMarketplaceCopy:'AI-агенти з явними дозволами.',
    developerPlatform:'Developer Platform',developerPlatformCopy:'API-ключі, scopes і sandbox.',moderation:'Модерація',moderationCopy:'Скарги та журнал аудиту.',
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
    goodMorning:'Dzień dobry',goodAfternoon:'Dzień dobry',goodEvening:'Dobry wieczór',personalCenter:'Twoje osobiste centrum.',
    peopleMayKnow:'Osoby, które możesz znać',showAll:'Pokaż wszystkie',newPeopleHere:'Nowe osoby pojawią się tutaj.',
    popularNow:'Popularne teraz',watch:'Oglądaj',waitingLive:'Czekamy na następny LIVE.',myLumen:'MÓJ LUMEN',
    dailyBrief:'Codzienny przegląd',enable:'Włącz',disable:'Wyłącz',continue:'Kontynuuj',dailyBriefUpdated:'Codzienny przegląd zaktualizowany',
    notifications:'powiadomień',conversations:'rozmów',message:'Wiadomość',vertical:'Pionowe',longForm:'Długi format',
    homeEmptyTitle:'Twój świat zaczyna się tutaj.',homeEmptyText:'Zaobserwuj osoby lub odkryj przestrzeń. SYLORA zbuduje tę stronę z prawdziwej aktywności — bez fikcyjnych liczników.',
    liveCapabilities:'Dostępne tryby LIVE',liveEmptyTitle:'Następny LIVE zaczyna się od Ciebie.',liveEmptyText:'Nikt teraz nie nadaje. Uruchom prawdziwy pokój albo wróć, gdy twórca rozpocznie LIVE.',
    liveFollowingEmptyTitle:'W obserwowanych jest teraz cicho.',liveFollowingEmptyText:'Najpierw obserwuj twórców. Tutaj pojawią się tylko ich prawdziwe transmisje LIVE.',
    inboxInvites:'Zaproszenia',inboxCalls:'Połączenia',follow:'Obserwuj',following:'Obserwowani',workspace:'Obszar roboczy',
    teams:'Zespoły',documents:'Dokumenty',tasks:'Zadania',discoverLive:'Odkrywaj',guests:'Goście',battles:'Bitwy',
    streamConnections:'Połączenia transmisji',integrationTruth:'Otwórz LIVE lub Studio, aby skonfigurować każde połączenie.',
    ownerRelay:'Relay właściciela',streamKeyRequired:'Wymagany stream key',localControl:'Sterowanie lokalne',localBridge:'Lokalny companion',routerSetup:'Konfiguracja routera',
    interfaceLanguage:'Język interfejsu',interfaceLanguageHint:'Zmienia menu i elementy systemowe. Treści użytkowników pozostają w języku oryginalnym.',
    settingsTitle:'Twoje centrum sterowania.',settingsIntro:'Tożsamość, prywatność, bezpieczeństwo i narzędzia systemowe bez powielania głównej nawigacji.',
    personalSecurity:'Prywatne i bezpieczeństwo',personalSecurityCopy:'Tożsamość, prywatność i kontrola danych.',systemTools:'Narzędzia systemowe',systemToolsCopy:'Wyspecjalizowane obszary robocze i integracje.',
    administration:'Administracja',administrationCopy:'Narzędzia operacyjne platformy.',identityTitle:'SYLORA Identity',identityCopy:'Umiejętności, portfolio i poziomy prywatności.',
    dashboardTitle:'Personal Dashboard',dashboardCopy:'Dzisiaj · Zadania · Cele · Ciągłość.',securityCenter:'Centrum bezpieczeństwa',securityCenterCopy:'Prywatność, eksport danych i pochodzenie.',
    canvasTitle:'Sylora Canvas',canvasCopy:'Dokumenty, plany i badania.',agentMarketplace:'Agent Marketplace',agentMarketplaceCopy:'Agenci AI z jawnymi uprawnieniami.',
    developerPlatform:'Developer Platform',developerPlatformCopy:'Klucze API, zakresy i sandbox.',moderation:'Moderacja',moderationCopy:'Zgłoszenia i dziennik audytu.',
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
    goodMorning:'Guten Morgen',goodAfternoon:'Guten Tag',goodEvening:'Guten Abend',personalCenter:'Dein persönliches Zentrum.',
    peopleMayKnow:'Personen, die du kennen könntest',showAll:'Alle anzeigen',newPeopleHere:'Neue Personen erscheinen hier.',
    popularNow:'Jetzt beliebt',watch:'Ansehen',waitingLive:'Warten auf das nächste LIVE.',myLumen:'MEIN LUMEN',
    dailyBrief:'Täglicher Überblick',enable:'Aktivieren',disable:'Deaktivieren',continue:'Fortsetzen',dailyBriefUpdated:'Täglicher Überblick aktualisiert',
    notifications:'Benachrichtigungen',conversations:'Unterhaltungen',message:'Nachricht',vertical:'Vertikal',longForm:'Langformat',
    homeEmptyTitle:'Deine Welt beginnt hier.',homeEmptyText:'Folge Menschen oder entdecke einen Raum. SYLORA baut diese Startseite aus echter Aktivität auf — ohne erfundene Zähler.',
    liveCapabilities:'Verfügbare LIVE-Modi',liveEmptyTitle:'Das nächste LIVE beginnt mit dir.',liveEmptyText:'Gerade ist niemand live. Starte einen echten Raum oder komm zurück, wenn ein Creator live geht.',
    liveFollowingEmptyTitle:'Bei deinen Abos ist es gerade ruhig.',liveFollowingEmptyText:'Folge zuerst Creators. Hier erscheinen nur ihre echten LIVE-Sendungen.',
    inboxMessages:'Nachrichten',inboxNotifications:'Benachrichtigungen',inboxInvites:'Einladungen',inboxCalls:'Anrufe',follow:'Folgen',following:'Gefolgt',
    workspace:'Arbeitsbereich',teams:'Teams',documents:'Dokumente',tasks:'Aufgaben',discoverLive:'Entdecken',guests:'Gäste',battles:'Battles',
    streamConnections:'Streaming-Verbindungen',integrationTruth:'Öffne LIVE oder Studio, um jede Verbindung einzurichten.',
    ownerRelay:'Owner-Relay',streamKeyRequired:'Stream-Key erforderlich',localControl:'Lokale Steuerung',localBridge:'Lokaler Companion',routerSetup:'Router einrichten',
    interfaceLanguage:'Sprache der Oberfläche',interfaceLanguageHint:'Ändert Menüs und Systemelemente. Benutzerinhalte bleiben in der Originalsprache.',
    settingsTitle:'Dein Kontrollbereich.',settingsIntro:'Identität, Datenschutz, Sicherheit und Systemwerkzeuge ohne doppelte Hauptnavigation.',
    personalSecurity:'Persönlich & Sicherheit',personalSecurityCopy:'Identität, Datenschutz und Datenkontrolle.',systemTools:'Systemwerkzeuge',systemToolsCopy:'Spezialisierte Arbeitsbereiche und Integrationen.',
    administration:'Administration',administrationCopy:'Betriebswerkzeuge der Plattform.',identityTitle:'SYLORA Identity',identityCopy:'Fähigkeiten, Portfolio und Datenschutzstufen.',
    dashboardTitle:'Personal Dashboard',dashboardCopy:'Heute · Aufgaben · Ziele · Kontinuität.',securityCenter:'Sicherheitscenter',securityCenterCopy:'Datenschutz, Datenexport und Herkunft.',
    canvasTitle:'Sylora Canvas',canvasCopy:'Dokumente, Pläne und Recherche.',agentMarketplace:'Agent Marketplace',agentMarketplaceCopy:'KI-Agenten mit ausdrücklichen Berechtigungen.',
    developerPlatform:'Developer Platform',developerPlatformCopy:'API-Schlüssel, Scopes und Sandbox.',moderation:'Moderation',moderationCopy:'Meldungen und Audit-Protokoll.',
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
    goodMorning:'Доброе утро',goodAfternoon:'Добрый день',goodEvening:'Добрый вечер',personalCenter:'Ваш персональный центр.',
    peopleMayKnow:'Люди, которых вы можете знать',showAll:'Показать всех',newPeopleHere:'Новые люди появятся здесь.',
    popularNow:'Популярно сейчас',watch:'Смотреть',waitingLive:'Ожидаем следующий LIVE.',myLumen:'МОЙ LUMEN',
    dailyBrief:'Ежедневный обзор',enable:'Включить',disable:'Выключить',continue:'Продолжить',dailyBriefUpdated:'Ежедневный обзор обновлён',
    notifications:'уведомлений',conversations:'диалогов',message:'Сообщение',vertical:'Вертикальный формат',longForm:'Длинный формат',
    homeEmptyTitle:'Ваш мир начинается здесь.',homeEmptyText:'Подпишитесь на людей или откройте пространство. SYLORA построит эту Главную на реальной активности — без выдуманных счётчиков.',
    liveCapabilities:'Доступные режимы LIVE',liveEmptyTitle:'Следующий LIVE начинается с вас.',liveEmptyText:'Сейчас никто не в эфире. Создайте настоящую комнату или вернитесь, когда автор начнёт LIVE.',
    liveFollowingEmptyTitle:'В подписках сейчас тихо.',liveFollowingEmptyText:'Сначала подпишитесь на авторов. Здесь появятся только их настоящие LIVE.',
    inboxMessages:'Сообщения',inboxNotifications:'Уведомления',inboxInvites:'Приглашения',inboxCalls:'Звонки',follow:'Подписаться',following:'Подписки',
    workspace:'Рабочее пространство',teams:'Команды',documents:'Документы',tasks:'Задачи',discoverLive:'Открытия',guests:'Гости',battles:'Батлы',
    streamConnections:'Подключения трансляций',integrationTruth:'Откройте LIVE или Studio, чтобы настроить каждое подключение.',
    ownerRelay:'Relay владельца',streamKeyRequired:'Нужен stream key',localControl:'Локальное управление',localBridge:'Локальный companion',routerSetup:'Настройка router',
    interfaceLanguage:'Язык интерфейса',interfaceLanguageHint:'Изменяет меню и системные элементы. Контент пользователей остаётся на языке оригинала.',
    settingsTitle:'Ваше пространство управления.',settingsIntro:'Идентичность, приватность, безопасность и системные инструменты без дублирования основной навигации.',
    personalSecurity:'Личное и безопасность',personalSecurityCopy:'Идентичность, приватность и контроль данных.',systemTools:'Системные инструменты',systemToolsCopy:'Специализированные рабочие пространства и интеграции.',
    administration:'Администрирование',administrationCopy:'Служебные инструменты платформы.',identityTitle:'SYLORA Identity',identityCopy:'Навыки, портфолио и уровни приватности.',
    dashboardTitle:'Personal Dashboard',dashboardCopy:'Сегодня · Задачи · Цели · Непрерывность.',securityCenter:'Центр безопасности',securityCenterCopy:'Приватность, экспорт данных и provenance.',
    canvasTitle:'Sylora Canvas',canvasCopy:'Документы, планы и исследования.',agentMarketplace:'Agent Marketplace',agentMarketplaceCopy:'AI-агенты с явными разрешениями.',
    developerPlatform:'Developer Platform',developerPlatformCopy:'API-ключи, scopes и sandbox.',moderation:'Модерация',moderationCopy:'Жалобы и журнал аудита.',
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
