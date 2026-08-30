/**
 * SYLORA UI localization core.
 * Production UI locales: UA / EN / PL / DE / RU.
 * Brand and international technical tokens (SYLORA, LIVE, LUMEN, OBS, WebRTC, RTMP, API) remain stable.
 */

export const DEFAULT_UI_LOCALE='uk';
export const SUPPORTED_UI_LOCALES=Object.freeze(['uk','en','pl','de','ru']);
export const FUTURE_UI_LOCALES=Object.freeze(['es','fr','it','pt']);
export const PRIORITY_VOICE_LOCALES=Object.freeze(['uk','en','pl','de','ru','es','fr','it','pt']);

const supported=new Set(SUPPORTED_UI_LOCALES);

const base={
  home:'Home',live:'LIVE',clips:'Clips',studio:'Studio',ai:'Sylora',profile:'Profile',
  inbox:'Inbox',chat:'Inbox',gifts:'Gifts',more:'Settings',explore:'Discover',
  science:'Learning',learning:'Learning',business:'Business',communities:'Communities',videos:'Videos',
  navMain:'Main',navSpaces:'Spaces',navPersonal:'Personal',startLive:'Start your first LIVE',liveConnected:'A real LIVE room is active.',noLiveNow:'No one is live right now — no simulated broadcasts.',
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
  ,identityEyebrow:'SYLORA IDENTITY',identityIntro:'Not a social profile — a digital identity with controlled privacy.',identityProfessional:'PROFESSIONAL',jobTitle:'Job title',company:'Company',skillsComma:'Skills, separated by commas',interestsComma:'Interests, separated by commas',creatorHeadline:'Creator headline',fieldPrivacy:'FIELD PRIVACY',saveIdentity:'Save Identity',knowledgeGraph:'KNOWLEDGE GRAPH',knowledgeGraphIntro:'What Sylora may know with your permission',knowledgeLabelExample:'For example: Favorite language',value:'Value',addNode:'Add node',graphEmpty:'The graph is empty.',identityUpdated:'Identity updated',nodeAdded:'Node added',nodeDeleted:'Node deleted',privacyProfile:'Profile',privacyProfessional:'Professional',privacyPortfolio:'Portfolio',privacySkills:'Skills',privacyInterests:'Interests',privacyReputation:'Reputation',privacyAgent:'Agent',privacyAssets:'Assets',privacyPublic:'Public',privacyFollowers:'Followers',privacyConnections:'Connections',privacyBusiness:'Business',privacyPrivate:'Private',privacyAiOnly:'AI only'
  ,agentsEyebrow:'AGENT MARKETPLACE',agentsHero:'Agents for your Sylora.',agentsIntro:'Installation requires explicit permissions. Dangerous execution only proceeds after confirmation.',permissions:'Permissions',free:'Free',uninstall:'Uninstall',install:'Install',aiProposal:'AI↔AI proposal',agentInstalled:'Agent installed',agentUninstalled:'Agent uninstalled',negotiationProposed:'Negotiation proposed — confirmation required',negotiationFailed:'Could not propose the negotiation',personalAiRequest:'Request from Personal AI'
  ,developerEyebrow:'DEVELOPER PLATFORM',developerHero:'Build on SYLORA.',developerIntro:'Sandbox apps, hashed API keys and scopes. OAuth/OIDC architecture is prepared.',newApp:'NEW APP',appName:'App name',scopesComma:'Scopes, separated by commas',createApp:'Create app',oauthStatus:'OAUTH STATUS',createApiKey:'Create API key',noApps:'No apps yet.',appCreated:'App created',saveKeyOnce:'Save this key now — it is shown only once:',defaultKeyLabel:'Default'
  ,privacyAiControl:'PRIVACY & AI CONTROL',trustCenter:'Trust Center',trustIntro:'One Sylora · transparent permissions · your control.',controls:'CONTROLS',proactive:'Proactive',importantOnly:'Important only',normal:'Normal',saveControls:'Save controls',whatSyloraCanSee:'WHAT SYLORA CAN SEE',memory:'MEMORY',integrations:'INTEGRATIONS',disconnect:'Disconnect',activityLog:'ACTIVITY LOG',noSyloraActivity:'No Sylora activity yet.',data:'DATA',exportMyData:'Export my data',deleteMemories:'Delete memories',deleteHistory:'Delete conversation history',requestAccountExport:'Request account export',disablePersonalization:'Disable personalization',reputation:'REPUTATION',dispute:'Dispute',capabilities:'Capabilities',on:'On',off:'Off',voice:'Voice',memoryCenter:'MEMORY CENTER',controlledMemory:'Controlled memory',memoryHonesty:'AI does not secretly accumulate personal data.',memoryEnabled:'Memory enabled',empty:'Empty',edit:'Edit',exportReady:'Export ready',confirmDeleteMemories:'Delete all AI memories?',memoriesCleared:'Memories cleared',confirmDeleteHistory:'Delete conversation history?',historyCleared:'History cleared',requestQueued:'Request queued',personalizationOff:'Personalization off',disconnected:'Disconnected',disputeOpened:'Dispute opened',memoryOn:'Memory on',memoryOff:'Memory off',newValue:'New value',memoryCategory:'Category (preferences/people/projects/professional/learning/conversation)',updated:'Updated',deleted:'Deleted',controlsSaved:'Controls saved',controlMemory:'Memory',controlMicrophone:'Microphone',controlCamera:'Camera',controlLocation:'Location',controlContacts:'Contacts',controlFiles:'Files',controlNotifications:'Notifications',controlPersonalization:'Personalization',controlAiActions:'AI actions',controlVoice:'Voice',controlTranslation:'Translation'
  ,personalDashboard:'PERSONAL DASHBOARD',today:'Today',adaptiveOverview:'Your adaptive overview.',goals:'GOALS',continueSection:'CONTINUE',dashboardPrompt:'Sylora, what matters today?',askSyloraOs:'Ask Sylora OS'
  ,canvasEyebrow:'SYLORA CANVAS',canvasWorkspace:'Workspace',canvasIntro:'Conversation and artifact. The mobile layout stacks vertically.',artifact:'ARTIFACT',title:'Title',document:'Document',plan:'Plan',research:'Research',project:'Project',writeWithSylora:'Write with Sylora…',saveWorkspace:'Save workspace',summarizeRewrite:'Summarize, rewrite or extract tasks',ask:'Ask',workspaceSaved:'Workspace saved'
  ,adminSafety:'ADMIN / SAFETY',moderationConsole:'Moderation Console',moderationIntro:'Moderator decisions are recorded in the audit log.',noDetails:'No details',resolve:'Resolve',dismiss:'Dismiss',noReports:'No reports.',auditLog:'Audit log',auditEmpty:'The audit log is empty.',adminResolution:'Moderated in SYLORA Admin'
  ,aiTextDegraded:'Sylora text AI is temporarily unavailable — Inbox, LIVE and creation still work.',incomingCall:'Incoming call',voiceCall:'Voice call',videoCall:'Video call',accept:'Accept',decline:'Decline',callEnded:'Call ended',newMessage:'New message',chartTrend:'Trend chart',expandSidebar:'Expand sidebar',collapseSidebar:'Collapse sidebar',followStatusChanged:'Follow status changed',reportReason:'Report reason',reportSent:'Report sent',blockUserConfirm:'Block this user?',userBlocked:'User blocked',askSyloraPrompt:'Ask Sylora',explain:'Explain',commentPlaceholder:'Comment…',send:'Send'
};

function dict(overrides={}){return Object.freeze({...base,...overrides})}

const dictionaries=Object.freeze({
  en:dict(),
  uk:dict({
    home:'Головна',profile:'Профіль',inbox:'Вхідні',chat:'Вхідні',gifts:'Подарунки',more:'Налаштування',
    explore:'Відкриття',science:'Навчання',learning:'Навчання',business:'Бізнес',communities:'Спільноти',videos:'Відео',
    navMain:'Головне',navSpaces:'Простори',navPersonal:'Особисте',startLive:'Почати перший LIVE',liveConnected:'Активна справжня LIVE-кімната.',noLiveNow:'Зараз ніхто не в ефірі — без імітації трансляцій.',
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
    ,identityIntro:'Не сторінка соцмережі — цифрова ідентичність із контрольованою приватністю.',identityProfessional:'ПРОФЕСІЙНЕ',jobTitle:'Посада',company:'Компанія',skillsComma:'Навички через кому',interestsComma:'Інтереси через кому',creatorHeadline:'Заголовок автора',fieldPrivacy:'ПРИВАТНІСТЬ ПОЛІВ',saveIdentity:'Зберегти Identity',knowledgeGraph:'ГРАФ ЗНАНЬ',knowledgeGraphIntro:'Що Sylora може знати з твого дозволу',knowledgeLabelExample:'Наприклад: улюблена мова',value:'Значення',addNode:'Додати вузол',graphEmpty:'Граф поки порожній.',identityUpdated:'Identity оновлено',nodeAdded:'Вузол додано',nodeDeleted:'Вузол видалено',privacyProfile:'Профіль',privacyProfessional:'Професійні дані',privacyPortfolio:'Портфоліо',privacySkills:'Навички',privacyInterests:'Інтереси',privacyReputation:'Репутація',privacyAgent:'Агент',privacyAssets:'Активи',privacyPublic:'Публічно',privacyFollowers:'Підписники',privacyConnections:'Контакти',privacyBusiness:'Ділові контакти',privacyPrivate:'Приватно',privacyAiOnly:'Лише AI'
    ,agentsHero:'Агенти для твоєї Sylora.',agentsIntro:'Встановлення потребує явних дозволів. Небезпечне виконання можливе лише після підтвердження.',permissions:'Дозволи',free:'Безкоштовно',uninstall:'Видалити',install:'Встановити',aiProposal:'Пропозиція AI↔AI',agentInstalled:'Агента встановлено',agentUninstalled:'Агента видалено',negotiationProposed:'Переговори запропоновано — потрібне підтвердження',negotiationFailed:'Не вдалося запропонувати переговори',personalAiRequest:'Запит від Personal AI'
    ,developerHero:'Створюй на SYLORA.',developerIntro:'Sandbox-додатки, хешовані API-ключі та scopes. Архітектура OAuth/OIDC підготовлена.',newApp:'НОВИЙ ДОДАТОК',appName:'Назва додатка',scopesComma:'Scopes через кому',createApp:'Створити додаток',oauthStatus:'СТАН OAUTH',createApiKey:'Створити API-ключ',noApps:'Додатків ще немає.',appCreated:'Додаток створено',saveKeyOnce:'Збережи цей ключ зараз — він показується лише один раз:',defaultKeyLabel:'Основний'
    ,privacyAiControl:'ПРИВАТНІСТЬ І КЕРУВАННЯ AI',trustCenter:'Центр довіри',trustIntro:'Одна Sylora · прозорі дозволи · твій контроль.',controls:'КЕРУВАННЯ',proactive:'Проактивність',importantOnly:'Лише важливе',normal:'Звичайний',saveControls:'Зберегти налаштування',whatSyloraCanSee:'ЩО МОЖЕ БАЧИТИ SYLORA',memory:'ПАМ’ЯТЬ',integrations:'ІНТЕГРАЦІЇ',disconnect:'Відключити',activityLog:'ЖУРНАЛ АКТИВНОСТІ',noSyloraActivity:'Дій Sylora поки немає.',data:'ДАНІ',exportMyData:'Експортувати мої дані',deleteMemories:'Видалити спогади',deleteHistory:'Видалити історію розмов',requestAccountExport:'Запросити експорт акаунта',disablePersonalization:'Вимкнути персоналізацію',reputation:'РЕПУТАЦІЯ',dispute:'Оскаржити',capabilities:'Можливості',on:'Увімкнено',off:'Вимкнено',voice:'Голос',memoryCenter:'ЦЕНТР ПАМ’ЯТІ',controlledMemory:'Контрольована пам’ять',memoryHonesty:'AI не накопичує особисті дані приховано.',memoryEnabled:'Пам’ять увімкнена',empty:'Порожньо',edit:'Редагувати',exportReady:'Експорт готовий',confirmDeleteMemories:'Видалити всі спогади AI?',memoriesCleared:'Спогади видалено',confirmDeleteHistory:'Видалити історію розмов?',historyCleared:'Історію видалено',requestQueued:'Запит поставлено в чергу',personalizationOff:'Персоналізацію вимкнено',disconnected:'Відключено',disputeOpened:'Оскарження відкрито',memoryOn:'Пам’ять увімкнено',memoryOff:'Пам’ять вимкнено',newValue:'Нове значення',memoryCategory:'Категорія (preferences/people/projects/professional/learning/conversation)',updated:'Оновлено',deleted:'Видалено',controlsSaved:'Налаштування збережено',controlMemory:'Пам’ять',controlMicrophone:'Мікрофон',controlCamera:'Камера',controlLocation:'Місцезнаходження',controlContacts:'Контакти',controlFiles:'Файли',controlNotifications:'Сповіщення',controlPersonalization:'Персоналізація',controlAiActions:'Дії AI',controlVoice:'Голос',controlTranslation:'Переклад'
    ,personalDashboard:'ПЕРСОНАЛЬНА ПАНЕЛЬ',today:'Сьогодні',adaptiveOverview:'Твій адаптивний огляд.',goals:'ЦІЛІ',continueSection:'ПРОДОВЖИТИ',dashboardPrompt:'Sylora, що сьогодні важливого?',askSyloraOs:'Запитати Sylora OS'
    ,canvasWorkspace:'Робочий простір',canvasIntro:'Розмова та артефакт. На мобільних пристроях блоки розташовуються вертикально.',artifact:'АРТЕФАКТ',title:'Назва',document:'Документ',plan:'План',research:'Дослідження',project:'Проєкт',writeWithSylora:'Пиши разом із Sylora…',saveWorkspace:'Зберегти простір',summarizeRewrite:'Підсумувати, переписати або виділити завдання',ask:'Запитати',workspaceSaved:'Робочий простір збережено'
    ,moderationConsole:'Консоль модерації',moderationIntro:'Рішення модератора записуються до журналу аудиту.',noDetails:'Без додаткових відомостей',resolve:'Вирішити',dismiss:'Відхилити',noReports:'Скарг немає.',auditLog:'Журнал аудиту',auditEmpty:'Журнал аудиту поки порожній.',adminResolution:'Опрацьовано в SYLORA Admin'
    ,aiTextDegraded:'Текстовий AI Sylora тимчасово недоступний — Вхідні, LIVE і створення працюють.',incomingCall:'Вхідний дзвінок',voiceCall:'Голосовий дзвінок',videoCall:'Відеодзвінок',accept:'Прийняти',decline:'Відхилити',callEnded:'Дзвінок завершено',newMessage:'Нове повідомлення',chartTrend:'Графік динаміки',expandSidebar:'Розгорнути бічну панель',collapseSidebar:'Згорнути бічну панель',followStatusChanged:'Статус підписки змінено',reportReason:'Причина скарги',reportSent:'Скаргу надіслано',blockUserConfirm:'Заблокувати цього користувача?',userBlocked:'Користувача заблоковано',askSyloraPrompt:'Запитати Sylora',explain:'Поясни',commentPlaceholder:'Коментар…',send:'Надіслати'
  }),
  pl:dict({
    home:'Główna',profile:'Profil',inbox:'Skrzynka',chat:'Skrzynka',gifts:'Prezenty',more:'Ustawienia',
    explore:'Odkrywaj',science:'Nauka',learning:'Nauka',business:'Biznes',communities:'Społeczności',videos:'Wideo',
    navMain:'Główne',navSpaces:'Przestrzenie',navPersonal:'Osobiste',startLive:'Uruchom pierwszy LIVE',liveConnected:'Prawdziwy pokój LIVE jest aktywny.',noLiveNow:'Nikt teraz nie nadaje — bez symulowanych transmisji.',
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
    ,identityIntro:'To nie profil społecznościowy — to cyfrowa tożsamość z kontrolowaną prywatnością.',identityProfessional:'ZAWODOWE',jobTitle:'Stanowisko',company:'Firma',skillsComma:'Umiejętności oddzielone przecinkami',interestsComma:'Zainteresowania oddzielone przecinkami',creatorHeadline:'Nagłówek twórcy',fieldPrivacy:'PRYWATNOŚĆ PÓL',saveIdentity:'Zapisz Identity',knowledgeGraph:'GRAF WIEDZY',knowledgeGraphIntro:'Co Sylora może wiedzieć za Twoją zgodą',knowledgeLabelExample:'Na przykład: ulubiony język',value:'Wartość',addNode:'Dodaj węzeł',graphEmpty:'Graf jest pusty.',identityUpdated:'Identity zaktualizowano',nodeAdded:'Dodano węzeł',nodeDeleted:'Usunięto węzeł',privacyProfile:'Profil',privacyProfessional:'Dane zawodowe',privacyPortfolio:'Portfolio',privacySkills:'Umiejętności',privacyInterests:'Zainteresowania',privacyReputation:'Reputacja',privacyAgent:'Agent',privacyAssets:'Zasoby',privacyPublic:'Publiczne',privacyFollowers:'Obserwujący',privacyConnections:'Kontakty',privacyBusiness:'Kontakty biznesowe',privacyPrivate:'Prywatne',privacyAiOnly:'Tylko AI'
    ,agentsHero:'Agenci dla Twojej Sylory.',agentsIntro:'Instalacja wymaga jawnych uprawnień. Niebezpieczne wykonanie następuje wyłącznie po potwierdzeniu.',permissions:'Uprawnienia',free:'Bezpłatny',uninstall:'Odinstaluj',install:'Zainstaluj',aiProposal:'Propozycja AI↔AI',agentInstalled:'Agent został zainstalowany',agentUninstalled:'Agent został odinstalowany',negotiationProposed:'Zaproponowano negocjacje — wymagane potwierdzenie',negotiationFailed:'Nie udało się zaproponować negocjacji',personalAiRequest:'Prośba od Personal AI'
    ,developerHero:'Twórz na SYLORA.',developerIntro:'Aplikacje sandbox, hashowane klucze API i scopes. Architektura OAuth/OIDC jest przygotowana.',newApp:'NOWA APLIKACJA',appName:'Nazwa aplikacji',scopesComma:'Scopes oddzielone przecinkami',createApp:'Utwórz aplikację',oauthStatus:'STATUS OAUTH',createApiKey:'Utwórz klucz API',noApps:'Nie ma jeszcze aplikacji.',appCreated:'Aplikacja została utworzona',saveKeyOnce:'Zapisz ten klucz teraz — jest wyświetlany tylko raz:',defaultKeyLabel:'Domyślny'
    ,privacyAiControl:'PRYWATNOŚĆ I KONTROLA AI',trustCenter:'Centrum zaufania',trustIntro:'Jedna Sylora · przejrzyste uprawnienia · Twoja kontrola.',controls:'STEROWANIE',proactive:'Proaktywność',importantOnly:'Tylko ważne',normal:'Normalny',saveControls:'Zapisz ustawienia',whatSyloraCanSee:'CO SYLORA MOŻE ZOBACZYĆ',memory:'PAMIĘĆ',integrations:'INTEGRACJE',disconnect:'Odłącz',activityLog:'DZIENNIK AKTYWNOŚCI',noSyloraActivity:'Brak aktywności Sylory.',data:'DANE',exportMyData:'Eksportuj moje dane',deleteMemories:'Usuń wspomnienia',deleteHistory:'Usuń historię rozmów',requestAccountExport:'Poproś o eksport konta',disablePersonalization:'Wyłącz personalizację',reputation:'REPUTACJA',dispute:'Odwołaj się',capabilities:'Możliwości',on:'Włączone',off:'Wyłączone',voice:'Głos',memoryCenter:'CENTRUM PAMIĘCI',controlledMemory:'Kontrolowana pamięć',memoryHonesty:'AI nie gromadzi potajemnie danych osobowych.',memoryEnabled:'Pamięć włączona',empty:'Pusto',edit:'Edytuj',exportReady:'Eksport gotowy',confirmDeleteMemories:'Usunąć wszystkie wspomnienia AI?',memoriesCleared:'Wspomnienia usunięto',confirmDeleteHistory:'Usunąć historię rozmów?',historyCleared:'Historia usunięta',requestQueued:'Żądanie dodano do kolejki',personalizationOff:'Personalizacja wyłączona',disconnected:'Odłączono',disputeOpened:'Odwołanie zostało otwarte',memoryOn:'Pamięć włączona',memoryOff:'Pamięć wyłączona',newValue:'Nowa wartość',memoryCategory:'Kategoria (preferences/people/projects/professional/learning/conversation)',updated:'Zaktualizowano',deleted:'Usunięto',controlsSaved:'Ustawienia zapisane',controlMemory:'Pamięć',controlMicrophone:'Mikrofon',controlCamera:'Kamera',controlLocation:'Lokalizacja',controlContacts:'Kontakty',controlFiles:'Pliki',controlNotifications:'Powiadomienia',controlPersonalization:'Personalizacja',controlAiActions:'Działania AI',controlVoice:'Głos',controlTranslation:'Tłumaczenie'
    ,personalDashboard:'PANEL OSOBISTY',today:'Dzisiaj',adaptiveOverview:'Twój adaptacyjny przegląd.',goals:'CELE',continueSection:'KONTYNUUJ',dashboardPrompt:'Sylora, co jest dziś ważne?',askSyloraOs:'Zapytaj Sylora OS'
    ,canvasWorkspace:'Obszar roboczy',canvasIntro:'Rozmowa i artefakt. Na urządzeniach mobilnych układ jest pionowy.',artifact:'ARTEFAKT',title:'Tytuł',document:'Dokument',plan:'Plan',research:'Badanie',project:'Projekt',writeWithSylora:'Pisz razem z Sylorą…',saveWorkspace:'Zapisz obszar',summarizeRewrite:'Podsumuj, przepisz lub wyodrębnij zadania',ask:'Zapytaj',workspaceSaved:'Obszar roboczy zapisany'
    ,moderationConsole:'Konsola moderacji',moderationIntro:'Decyzje moderatora są zapisywane w dzienniku audytu.',noDetails:'Brak dodatkowych informacji',resolve:'Rozwiąż',dismiss:'Odrzuć',noReports:'Brak zgłoszeń.',auditLog:'Dziennik audytu',auditEmpty:'Dziennik audytu jest pusty.',adminResolution:'Obsłużono w SYLORA Admin'
    ,aiTextDegraded:'Tekstowy AI Sylora jest chwilowo niedostępny — Skrzynka, LIVE i tworzenie nadal działają.',incomingCall:'Połączenie przychodzące',voiceCall:'Połączenie głosowe',videoCall:'Połączenie wideo',accept:'Odbierz',decline:'Odrzuć',callEnded:'Połączenie zakończone',newMessage:'Nowa wiadomość',chartTrend:'Wykres trendu',expandSidebar:'Rozwiń panel boczny',collapseSidebar:'Zwiń panel boczny',followStatusChanged:'Status obserwowania zmieniony',reportReason:'Powód zgłoszenia',reportSent:'Zgłoszenie wysłane',blockUserConfirm:'Zablokować tego użytkownika?',userBlocked:'Użytkownik zablokowany',askSyloraPrompt:'Zapytaj Sylorę',explain:'Wyjaśnij',commentPlaceholder:'Komentarz…',send:'Wyślij'
  }),
  de:dict({
    home:'Start',profile:'Profil',inbox:'Posteingang',chat:'Posteingang',gifts:'Geschenke',more:'Einstellungen',
    explore:'Entdecken',science:'Lernen',learning:'Lernen',business:'Business',communities:'Communities',videos:'Videos',signin:'Anmelden',signout:'Abmelden',
    navMain:'Hauptbereich',navSpaces:'Räume',navPersonal:'Persönlich',startLive:'Erstes LIVE starten',liveConnected:'Ein echtes LIVE ist aktiv.',noLiveNow:'Gerade ist niemand live — keine simulierten Streams.',
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
    ,identityIntro:'Kein Social-Media-Profil, sondern eine digitale Identität mit kontrolliertem Datenschutz.',identityProfessional:'BERUFLICH',jobTitle:'Position',company:'Unternehmen',skillsComma:'Fähigkeiten, durch Kommas getrennt',interestsComma:'Interessen, durch Kommas getrennt',creatorHeadline:'Creator-Überschrift',fieldPrivacy:'DATENSCHUTZ DER FELDER',saveIdentity:'Identity speichern',knowledgeGraph:'WISSENSGRAPH',knowledgeGraphIntro:'Was Sylora mit deiner Erlaubnis wissen darf',knowledgeLabelExample:'Zum Beispiel: Lieblingssprache',value:'Wert',addNode:'Knoten hinzufügen',graphEmpty:'Der Graph ist leer.',identityUpdated:'Identity aktualisiert',nodeAdded:'Knoten hinzugefügt',nodeDeleted:'Knoten gelöscht',privacyProfile:'Profil',privacyProfessional:'Berufliche Daten',privacyPortfolio:'Portfolio',privacySkills:'Fähigkeiten',privacyInterests:'Interessen',privacyReputation:'Reputation',privacyAgent:'Agent',privacyAssets:'Assets',privacyPublic:'Öffentlich',privacyFollowers:'Follower',privacyConnections:'Kontakte',privacyBusiness:'Geschäftskontakte',privacyPrivate:'Privat',privacyAiOnly:'Nur AI'
    ,agentsHero:'Agenten für deine Sylora.',agentsIntro:'Die Installation erfordert ausdrückliche Berechtigungen. Gefährliche Ausführungen erfolgen nur nach Bestätigung.',permissions:'Berechtigungen',free:'Kostenlos',uninstall:'Deinstallieren',install:'Installieren',aiProposal:'AI↔AI-Vorschlag',agentInstalled:'Agent installiert',agentUninstalled:'Agent deinstalliert',negotiationProposed:'Verhandlung vorgeschlagen — Bestätigung erforderlich',negotiationFailed:'Verhandlung konnte nicht vorgeschlagen werden',personalAiRequest:'Anfrage von Personal AI'
    ,developerHero:'Entwickle auf SYLORA.',developerIntro:'Sandbox-Apps, gehashte API-Schlüssel und Scopes. Die OAuth/OIDC-Architektur ist vorbereitet.',newApp:'NEUE APP',appName:'App-Name',scopesComma:'Scopes, durch Kommas getrennt',createApp:'App erstellen',oauthStatus:'OAUTH-STATUS',createApiKey:'API-Schlüssel erstellen',noApps:'Noch keine Apps vorhanden.',appCreated:'App erstellt',saveKeyOnce:'Speichere diesen Schlüssel jetzt — er wird nur einmal angezeigt:',defaultKeyLabel:'Standard'
    ,privacyAiControl:'DATENSCHUTZ & AI-STEUERUNG',trustCenter:'Vertrauenscenter',trustIntro:'Eine Sylora · transparente Berechtigungen · deine Kontrolle.',controls:'STEUERUNG',proactive:'Proaktivität',importantOnly:'Nur Wichtiges',normal:'Normal',saveControls:'Einstellungen speichern',whatSyloraCanSee:'WAS SYLORA SEHEN KANN',memory:'SPEICHER',integrations:'INTEGRATIONEN',disconnect:'Trennen',activityLog:'AKTIVITÄTSPROTOKOLL',noSyloraActivity:'Noch keine Sylora-Aktivität.',data:'DATEN',exportMyData:'Meine Daten exportieren',deleteMemories:'Erinnerungen löschen',deleteHistory:'Gesprächsverlauf löschen',requestAccountExport:'Kontoexport anfordern',disablePersonalization:'Personalisierung deaktivieren',reputation:'REPUTATION',dispute:'Anfechten',capabilities:'Funktionen',on:'Ein',off:'Aus',voice:'Stimme',memoryCenter:'SPEICHERCENTER',controlledMemory:'Kontrollierter Speicher',memoryHonesty:'AI sammelt keine persönlichen Daten im Verborgenen.',memoryEnabled:'Speicher aktiviert',empty:'Leer',edit:'Bearbeiten',exportReady:'Export bereit',confirmDeleteMemories:'Alle AI-Erinnerungen löschen?',memoriesCleared:'Erinnerungen gelöscht',confirmDeleteHistory:'Gesprächsverlauf löschen?',historyCleared:'Verlauf gelöscht',requestQueued:'Anfrage eingereiht',personalizationOff:'Personalisierung aus',disconnected:'Getrennt',disputeOpened:'Anfechtung eröffnet',memoryOn:'Speicher ein',memoryOff:'Speicher aus',newValue:'Neuer Wert',memoryCategory:'Kategorie (preferences/people/projects/professional/learning/conversation)',updated:'Aktualisiert',deleted:'Gelöscht',controlsSaved:'Einstellungen gespeichert',controlMemory:'Speicher',controlMicrophone:'Mikrofon',controlCamera:'Kamera',controlLocation:'Standort',controlContacts:'Kontakte',controlFiles:'Dateien',controlNotifications:'Benachrichtigungen',controlPersonalization:'Personalisierung',controlAiActions:'AI-Aktionen',controlVoice:'Stimme',controlTranslation:'Übersetzung'
    ,personalDashboard:'PERSÖNLICHES DASHBOARD',today:'Heute',adaptiveOverview:'Deine adaptive Übersicht.',goals:'ZIELE',continueSection:'FORTSETZEN',dashboardPrompt:'Sylora, was ist heute wichtig?',askSyloraOs:'Sylora OS fragen'
    ,canvasWorkspace:'Arbeitsbereich',canvasIntro:'Unterhaltung und Artefakt. Mobil werden die Bereiche vertikal angeordnet.',artifact:'ARTEFAKT',title:'Titel',document:'Dokument',plan:'Plan',research:'Recherche',project:'Projekt',writeWithSylora:'Mit Sylora schreiben…',saveWorkspace:'Arbeitsbereich speichern',summarizeRewrite:'Zusammenfassen, umschreiben oder Aufgaben extrahieren',ask:'Fragen',workspaceSaved:'Arbeitsbereich gespeichert'
    ,moderationConsole:'Moderationskonsole',moderationIntro:'Entscheidungen der Moderation werden im Audit-Protokoll erfasst.',noDetails:'Keine weiteren Angaben',resolve:'Lösen',dismiss:'Verwerfen',noReports:'Keine Meldungen.',auditLog:'Audit-Protokoll',auditEmpty:'Das Audit-Protokoll ist leer.',adminResolution:'In SYLORA Admin moderiert'
    ,aiTextDegraded:'Sylora Text-AI ist vorübergehend nicht verfügbar — Posteingang, LIVE und Erstellen funktionieren weiter.',incomingCall:'Eingehender Anruf',voiceCall:'Sprachanruf',videoCall:'Videoanruf',accept:'Annehmen',decline:'Ablehnen',callEnded:'Anruf beendet',newMessage:'Neue Nachricht',chartTrend:'Trenddiagramm',expandSidebar:'Seitenleiste erweitern',collapseSidebar:'Seitenleiste einklappen',followStatusChanged:'Folgestatus geändert',reportReason:'Grund der Meldung',reportSent:'Meldung gesendet',blockUserConfirm:'Diesen Benutzer blockieren?',userBlocked:'Benutzer blockiert',askSyloraPrompt:'Sylora fragen',explain:'Erklären',commentPlaceholder:'Kommentar…',send:'Senden'
  }),
  ru:dict({
    home:'Главная',profile:'Профиль',inbox:'Входящие',chat:'Входящие',gifts:'Подарки',more:'Настройки',explore:'Открытия',science:'Обучение',
    business:'Бизнес',communities:'Сообщества',videos:'Видео',learning:'Обучение',signin:'Войти',signout:'Выйти',create:'Создать аккаунт',register:'Регистрация',login:'Вход',
    navMain:'Главное',navSpaces:'Пространства',navPersonal:'Личное',startLive:'Начать первый LIVE',liveConnected:'Активна настоящая LIVE-комната.',noLiveNow:'Сейчас никто не в эфире — без имитации трансляций.',
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
    identityIntro:'Не страница соцсети, а цифровая идентичность с управляемой приватностью.',identityProfessional:'ПРОФЕССИОНАЛЬНОЕ',jobTitle:'Должность',company:'Компания',skillsComma:'Навыки через запятую',interestsComma:'Интересы через запятую',creatorHeadline:'Заголовок автора',fieldPrivacy:'ПРИВАТНОСТЬ ПОЛЕЙ',saveIdentity:'Сохранить Identity',knowledgeGraph:'ГРАФ ЗНАНИЙ',knowledgeGraphIntro:'Что Sylora может знать с вашего разрешения',knowledgeLabelExample:'Например: любимый язык',value:'Значение',addNode:'Добавить узел',graphEmpty:'Граф пока пуст.',identityUpdated:'Identity обновлено',nodeAdded:'Узел добавлен',nodeDeleted:'Узел удалён',privacyProfile:'Профиль',privacyProfessional:'Профессиональные данные',privacyPortfolio:'Портфолио',privacySkills:'Навыки',privacyInterests:'Интересы',privacyReputation:'Репутация',privacyAgent:'Агент',privacyAssets:'Активы',privacyPublic:'Публично',privacyFollowers:'Подписчики',privacyConnections:'Контакты',privacyBusiness:'Деловые контакты',privacyPrivate:'Приватно',privacyAiOnly:'Только AI',
    agentsHero:'Агенты для вашей Sylora.',agentsIntro:'Установка требует явных разрешений. Опасное выполнение возможно только после подтверждения.',permissions:'Разрешения',free:'Бесплатно',uninstall:'Удалить',install:'Установить',aiProposal:'Предложение AI↔AI',agentInstalled:'Агент установлен',agentUninstalled:'Агент удалён',negotiationProposed:'Переговоры предложены — требуется подтверждение',negotiationFailed:'Не удалось предложить переговоры',personalAiRequest:'Запрос от Personal AI',
    developerHero:'Создавайте на SYLORA.',developerIntro:'Sandbox-приложения, хешированные API-ключи и scopes. Архитектура OAuth/OIDC подготовлена.',newApp:'НОВОЕ ПРИЛОЖЕНИЕ',appName:'Название приложения',scopesComma:'Scopes через запятую',createApp:'Создать приложение',oauthStatus:'СТАТУС OAUTH',createApiKey:'Создать API-ключ',noApps:'Приложений пока нет.',appCreated:'Приложение создано',saveKeyOnce:'Сохраните этот ключ сейчас — он показывается только один раз:',defaultKeyLabel:'Основной',
    privacyAiControl:'ПРИВАТНОСТЬ И УПРАВЛЕНИЕ AI',trustCenter:'Центр доверия',trustIntro:'Одна Sylora · прозрачные разрешения · ваш контроль.',controls:'УПРАВЛЕНИЕ',proactive:'Проактивность',importantOnly:'Только важное',normal:'Обычный',saveControls:'Сохранить настройки',whatSyloraCanSee:'ЧТО МОЖЕТ ВИДЕТЬ SYLORA',memory:'ПАМЯТЬ',integrations:'ИНТЕГРАЦИИ',disconnect:'Отключить',activityLog:'ЖУРНАЛ АКТИВНОСТИ',noSyloraActivity:'Действий Sylora пока нет.',data:'ДАННЫЕ',exportMyData:'Экспортировать мои данные',deleteMemories:'Удалить воспоминания',deleteHistory:'Удалить историю разговоров',requestAccountExport:'Запросить экспорт аккаунта',disablePersonalization:'Отключить персонализацию',reputation:'РЕПУТАЦИЯ',dispute:'Оспорить',capabilities:'Возможности',on:'Включено',off:'Выключено',voice:'Голос',memoryCenter:'ЦЕНТР ПАМЯТИ',controlledMemory:'Контролируемая память',memoryHonesty:'AI не накапливает личные данные скрытно.',memoryEnabled:'Память включена',empty:'Пусто',edit:'Изменить',exportReady:'Экспорт готов',confirmDeleteMemories:'Удалить все воспоминания AI?',memoriesCleared:'Воспоминания удалены',confirmDeleteHistory:'Удалить историю разговоров?',historyCleared:'История удалена',requestQueued:'Запрос поставлен в очередь',personalizationOff:'Персонализация отключена',disconnected:'Отключено',disputeOpened:'Оспаривание открыто',memoryOn:'Память включена',memoryOff:'Память выключена',newValue:'Новое значение',memoryCategory:'Категория (preferences/people/projects/professional/learning/conversation)',updated:'Обновлено',deleted:'Удалено',controlsSaved:'Настройки сохранены',controlMemory:'Память',controlMicrophone:'Микрофон',controlCamera:'Камера',controlLocation:'Местоположение',controlContacts:'Контакты',controlFiles:'Файлы',controlNotifications:'Уведомления',controlPersonalization:'Персонализация',controlAiActions:'Действия AI',controlVoice:'Голос',controlTranslation:'Перевод',
    personalDashboard:'ПЕРСОНАЛЬНАЯ ПАНЕЛЬ',today:'Сегодня',adaptiveOverview:'Ваш адаптивный обзор.',goals:'ЦЕЛИ',continueSection:'ПРОДОЛЖИТЬ',dashboardPrompt:'Sylora, что сегодня важно?',askSyloraOs:'Спросить Sylora OS',
    canvasWorkspace:'Рабочее пространство',canvasIntro:'Разговор и артефакт. На мобильных устройствах блоки располагаются вертикально.',artifact:'АРТЕФАКТ',title:'Название',document:'Документ',plan:'План',research:'Исследование',project:'Проект',writeWithSylora:'Пишите вместе с Sylora…',saveWorkspace:'Сохранить пространство',summarizeRewrite:'Подытожить, переписать или выделить задачи',ask:'Спросить',workspaceSaved:'Рабочее пространство сохранено',
    moderationConsole:'Консоль модерации',moderationIntro:'Решения модератора записываются в журнал аудита.',noDetails:'Без дополнительных сведений',resolve:'Решить',dismiss:'Отклонить',noReports:'Жалоб нет.',auditLog:'Журнал аудита',auditEmpty:'Журнал аудита пока пуст.',adminResolution:'Обработано в SYLORA Admin',
    aiTextDegraded:'Текстовый AI Sylora временно недоступен — Входящие, LIVE и создание продолжают работать.',incomingCall:'Входящий звонок',voiceCall:'Голосовой звонок',videoCall:'Видеозвонок',accept:'Принять',decline:'Отклонить',callEnded:'Звонок завершён',newMessage:'Новое сообщение',chartTrend:'График динамики',expandSidebar:'Развернуть боковую панель',collapseSidebar:'Свернуть боковую панель',followStatusChanged:'Статус подписки изменён',reportReason:'Причина жалобы',reportSent:'Жалоба отправлена',blockUserConfirm:'Заблокировать этого пользователя?',userBlocked:'Пользователь заблокирован',askSyloraPrompt:'Спросить Sylora',explain:'Объясни',commentPlaceholder:'Комментарий…',send:'Отправить',
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
