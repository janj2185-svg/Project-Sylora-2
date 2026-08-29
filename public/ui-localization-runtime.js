import {getLocale,SUPPORTED_UI_LOCALES} from './i18n.js?v=20260829-live5';
import {uiCopy} from './locales/ui-runtime.js?v=20260829-live5';

// Temporary bridge for the legacy monolithic renderer. It translates only known UI literals.
// User-generated content is explicitly protected and never rewritten.
const SOURCE_ALIASES=new Map(Object.entries({
  'Люди, яких ти можеш знати':'peopleYouMayKnow','Показати всі':'showAll','Популярні зараз':'popularNow','Дивитися':'watch','Нові люди з’являться тут.':'newPeopleHere','Очікуємо наступні LIVE.':'waitingLive','МІЙ LUMEN':'myLumen','Я поруч':'aiHere',
  'Твій персональний центр.':'personalCenter','Your personal center.':'personalCenter',
  'Daily Brief':'dailyBrief','Continue':'continue','Message':'message','Vertical':'vertical','Long-form':'longForm','Ask Sylora':'askSylora','Підписатися':'followStatusChanged',
  'Коментар...':'comment','Коментар…':'comment','Надіслати':'send','Емоція, що оживає.':'giftEmotion','Власні подарунки SYLORA: світло, рух, звук і realtime-взаємодія.':'giftDescription','КОЛЕКЦІЯ':'collection','РІВНІ':'levels','ЕФЕКТИ':'effects','Увійти для відправлення':'signInToSend','Отримувач':'recipient','Оберіть користувача':'chooseUser',
  'Профіль':'profile','Про себе':'about','Ім’я':'name','Мова':'language','Зберегти зміни':'saveChanges','АКТИВНІСТЬ':'activity','Поки тихо.':'quiet','доступний баланс':'availableBalance','заробіток':'earnings','підписників':'followers','у SYLORA':'publications',
  'SOURCES':'sources','Sources':'sources','SCENES':'scenes','Scenes':'scenes','AUDIO MIXER':'audioMixer','PROGRAM PREVIEW':'programPreview','BROADCAST':'broadcast','RECORD':'record','Record':'record',
  'Output profile для canvas, запису та LIVE.':'outputProfile','Камера + мікрофон':'cameraMic','Screen share':'screenShare','＋ Logo / image':'logoImage','Прибрати image':'removeImage','Вимкнути source':'stopSource','Mic / source':'micSource','Mute':'mute','Unmute':'unmute','Увімкни source з аудіо.':'enableAudio','Saved scene…':'savedScene','Зберегти Scene':'saveScene','Видалити Scene':'deleteScene','Оберіть LIVE':'chooseLive','＋ Створити LIVE':'createLive','Почати WebRTC LIVE':'startWebrtcLive','Зупинити broadcast':'stopBroadcast','LIVE готовий до вибору.':'liveReady','Спочатку створи LIVE.':'createLiveFirst','Підключити OBS':'connectObs','OBS scenes…':'obsScenes','Запустити Virtual Camera':'startVirtualCamera','Зупинити Virtual Camera':'stopVirtualCamera','Почати OBS Stream':'startObsStream','Зупинити OBS Stream':'stopObsStream','Пароль використовується лише локально в браузері й не зберігається.':'obsLocalPassword','OBS BROWSER SOURCE':'browserSource','Створити URL для вибраного LIVE':'createBrowserUrl','Копіювати URL':'copyUrl','URL тимчасовий (2 години) і показує LIVE chat + gifts у прозорому OBS overlay.':'temporaryUrl','● Почати запис':'startRecording','Зупинити':'stop','Очікує source.':'waitingSource',
  'Discover':'discover','Following':'following','Battles':'battles','Following LIVE feed needs a follow-hosts API — not faking streams.':'followingApiMissing','Watch':'watch','Chat':'chat','Copilot':'creatorStudio','♢ Подарунок':'gift','Orbit — твій рівень підтримки':'orbitSupport','WAITING FOR HOST':'waitingHost','CONNECTION LOST':'connectionLost','LIVE завершився':'liveEnded','Написати в LIVE…':'writeLive','realtime':'realtime',
  'Твій простір керування.':'settingsTitle','Спокійні налаштування профілю, приватності, Sylora AI та всієї екосистеми.':'settingsIntro','НАЛАШТУВАННЯ':'settings','Усе під твоїм контролем.':'controlEverything','Акаунт і профіль':'accountProfile','Комунікації':'communications','Медіа':'media','Центр безпеки':'securityCenter',
  'приватна розмова':'privateConversation','Почни розмову.':'startConversation','Написати повідомлення…':'writeMessage','Voice call':'voiceCall','Video call':'videoCall','Call Sylora':'callSylora','Select recipient':'selectRecipient',
  'Я поруч.':'aiHere','Говори зі мною природно. Я бачу лише дозволений тобою контекст, а важливі дії завжди залишаю під твоїм контролем.':'aiNatural','голос · текст · пам’ять':'voiceTextMemory','Контекст':'context','Жива розмова':'liveConversation','Диктувати':'dictate','КЕРОВАНА ПАМ’ЯТЬ':'managedMemory','Забути':'forget','Додати вручну':'addManually',
  'Увійти для публікації':'signInPublish','＋ Завантажити Clip':'uploadClip','＋ Завантажити відео':'uploadVideo','Назва':'title','Опис':'description','Завантажити й опублікувати':'uploadPublish','Завантаження…':'uploading','Публікація…':'publishing',
  'Close':'close','Закрити':'close'
}));

for(const [source,key] of Object.entries({
  'Навчайся й досліджуй разом.':'scienceTitle','Керуй роботою без хаосу.':'businessTitle','← Назад':'conferenceBack','ПІДКЛЮЧЕННЯ':'conferenceConnecting','учасн.':'conferenceParticipants','Камера':'conferenceCamera','Мікрофон':'conferenceMic','Вийти':'conferenceLeave','Запитати Sylora…':'conferenceAsk','тільки за запитом':'conferenceOnRequest','очікуємо':'conferenceWaiting','В ЕФІРІ':'conferenceLive','Власник кімнати ще не увімкнув Sylora':'conferenceOwnerOff','Потрібен доступ до камери й мікрофона':'conferencePermission','Потрібен доступ до мікрофона':'conferenceMicPermission','Не вдалося підключити конференцію':'conferenceConnectionError','ЗАПУСК У TIKTOK · ПО КРОКАХ':'liveStepTitle','НАЛАШТУВАННЯ НЕ ЗАВЕРШЕНО':'liveNotFinished','Нічого не запускається без твоєї явної дії':'liveNoAutoStart','Відкрити Studio':'studioOpen'
}))SOURCE_ALIASES.set(source,key);

for(const [source,key] of Object.entries({
  'Розділи налаштувань':'settingsSections','5 повних локалізацій':'fullLocalizations','голос, пам’ять, дозволи':'voiceMemoryPermissions','Безпека':'security','сесії та приватність':'sessionsPrivacy','Система':'system','повний інтерфейс':'fullInterface','SELECT':'select','ПЕРЕКЛАД ІНТЕРФЕЙСУ':'interfaceTranslation','Меню, системні кнопки, помилки й підказки':'translatedUiParts','Контент користувачів залишається мовою оригіналу; вибір синхронізується з профілем.':'userContentOriginal','Трансляції без хаосу.':'broadcastNoChaos','Слабка мережа, reconnect, OBS, TikFinity та зовнішні платформи видно в одному місці.':'broadcastOverview','Режим слабкої мережі':'weakNetworkMode','adaptive quality і автоматичне відновлення':'adaptiveRecovery','локальний SYLORA Companion, pairing у LIVE':'companionLocalPairing','захищені stream keys через RTMP(S) router':'protectedStreamKeys','додаються як окремі контрольовані напрямки':'controlledDestinations','Жива, але під контролем.':'aliveControlled','Natural Luna voice, емоційна українська інтонація, lip-sync, пам’ять і прозорі дозволи.':'syloraVoiceSummary','Природний голос':'naturalVoice','Не перекривати головний екран':'dontCoverHome','Sylora доступна за запитом, голосом і через mobile dock':'syloraOnRequest','Пам’ять і дозволи':'memoryPermissions','важливі дії завжди потребують підтвердження':'criticalConfirm','Відкрити Sylora':'openSylora','CONTROL GROUP':'controlGroup'
}))SOURCE_ALIASES.set(source,key);

for(const [source,key] of Object.entries({
  'ДОСТУПНИЙ БАЛАНС':'balanceUpper','Ваші LUMEN, подарунки й creator-заробіток в одному захищеному просторі.':'walletAuthedCopy','Увійдіть, щоб побачити баланс і надсилати живі подарунки.':'walletGuestCopy','Увійти в гаманець':'signInWallet','БАЛАНС':'balanceLabel','ПОДАРУНКИ':'giftsUpper','живих ефектів':'livingEffects','тестова економіка':'testEconomy','НАДІСЛАТИ ПОДАРУНОК':'sendGiftUpper','Створіть живий момент.':'createLivingMoment','Колекція подарунків готується.':'giftCollectionPreparing','РУХ LUMEN':'lumenMovement','Останні транзакції':'recentTransactions','Транзакцій поки немає.':'noTransactionsYet','Кінематографічні подарунки':'cinematicGifts','Світло, звук і рух запускаються лише у справжньому LIVE.':'giftsOnlyRealLive','Відкрити LIVE':'openLive','Захищений гаманець':'protectedWallet','Баланс і журнал підтверджуються сервером.':'walletServerVerified','Спочатку оберіть отримувача':'chooseRecipientFirst'
}))SOURCE_ALIASES.set(source,key);

for(const [source,key] of Object.entries({
  'Оновити простір':'updateSpace','Ваш живий простір у SYLORA.':'livingSpaceFallback','Редагувати профіль':'editProfile','Меню профілю':'profileMenuLabel','ПІДПИСНИКІВ':'audienceUpper','ПУБЛІКАЦІЙ':'postsUpper','ЗАРОБЛЕНО':'earnedUpper','ORBIT РІВЕНЬ':'orbitLevel','Мій простір':'mySpace','Мої Clips і відео':'myClipsVideos','Створити нове':'createNew','Вийти в ефір':'goLive','ПЕРСОНАЛЬНИЙ ПРОСТІР':'personalSpace','Мова інтерфейсу':'interfaceLanguage','до ORBIT':'untilOrbit','Останні події':'latestEvents','Останні рухи':'latestMovements','Транзакцій немає.':'noTransactions','Профіль оновлено':'profileUpdated','Обкладинка профілю буде доступна після вибору медіа':'coverMediaRequired'
}))SOURCE_ALIASES.set(source,key);

for(const [source,key] of Object.entries({
  'Показати Sylora':'showSylora','Сховати Sylora':'hideSylora','Я ПОРУЧ':'nearbyUpper','Говори природно. Можеш перебити мене у будь-який момент.':'speakNaturallyInterrupt','Мікрофон':'microphone','Завершити':'end','Завершити LIVE':'endLive','ПОТРІБНЕ ТВОЄ РІШЕННЯ':'decisionRequired','Дії SYLORA AI':'syloraActions','Підтвердити':'confirm','Скасувати':'cancel','ЩО SYLORA ЗНАЄ І МОЖЕ':'syloraKnowsCan','Прозорість Personal AI':'personalAiTransparency','Один асистент · один граф пам’яті · різні контексти.':'oneAssistantGraph','Знає':'knows','Доступ':'access','Останні дії':'recentActions','Ще немає дій':'noActionsYet','Експорт пам’яті':'exportMemory','ТИ':'you','Я слухаю.':'listening','Напиши або натисни «Жива розмова» і говори природно.':'writeOrTalk','Говорити з Sylora':'speakToSylora','Озвучення':'voicePlayback','Озвучення увімкнено':'voiceEnabled','Озвучення вимкнено':'voiceDisabled','Голос':'voiceLabel','Автоматично':'automatic','Постійних спогадів поки немає.':'persistentMemoryEmpty','Напр. Мова':'memoryExample'
}))SOURCE_ALIASES.set(source,key);

for(const [source,key] of Object.entries({
  'Чати':'chats','Події':'events','Запрошення':'invites','Дзвінки':'calls','Priority':'priority','Нова розмова':'newConversation','Оберіть людину':'choosePerson','Розмов ще немає.':'noConversations','Усі важливі стани залишаються видимими.':'importantVisible','Оберіть розмову':'chooseConversation','Приватні повідомлення, голосові й відеодзвінки — в одному потоці.':'inboxUnified','Контекст розмови з’явиться після вибору контакту.':'conversationContext','ПРИВАТНІСТЬ':'privacy','Повідомлення й дзвінки доступні лише учасникам розмови.':'conversationPrivacy','оновлюються наживо':'updatesLive','Нових подій немає.':'noNewEvents','кімнати та події':'roomsEvents','Активних запрошень немає.':'noActiveInvites','Бізнес-кімнати':'businessRooms','Science circles':'scienceCircles','WebRTC voice & video':'webrtcVoiceVideo','Почніть розмову.':'startConversationTitle','Голос':'voice','Відео':'video','пропущено':'missed','нічого не приховано':'nothingHidden','Важливе в одному місці':'priorityFallback','AI лише групує потік — повна історія залишається доступною у вкладках.':'priorityExplanation','Порожньо':'empty','Розмова':'conversation','Вкладення':'attachment','Контакт':'contact','Ця розмова доступна лише її учасникам.':'conversationParticipantsOnly','Потрібен співрозмовник':'peerRequired'
}))SOURCE_ALIASES.set(source,key);

for(const [source,key] of Object.entries({
  '♢ Подарунок':'gift','Подарунки SYLORA':'syloraGifts',' · 10 живих ефектів':'tenLivingEffects',
  'Лайки додають імпульс · подарунки підсилюють Resonance.':'resonanceHelp',
  'TURN relay готовий · P2P transport із NAT fallback.':'turnReadyHelp',
  'P2P development transport · для стабільної роботи через NAT налаштуй TURN.':'turnMissingHelp',
  'LIVE VIDEO':'liveVideo','LIVE P2P LIMIT':'liveP2pLimit','HOST UNAVAILABLE':'hostUnavailable'
}))SOURCE_ALIASES.set(source,key);

const PLACEHOLDER_ALIASES=new Map(Object.entries({
  'Назва scene':'sceneName','OBS scenes…':'obsScenes','URL з’явиться тут':'urlAppears','Event title':'eventTitle','Starts (e.g. tomorrow 20:00)':'startsWhen','Написати в LIVE…':'writeLive','Коментар...':'comment','Коментар…':'comment','Про себе':'about','Написати повідомлення…':'writeMessage','Поговорити з Sylora…':'talkToSylora','Що запам’ятати':'whatRemember','Назва':'title','Опис':'description','Пошук у розмовах':'searchConversations','Напр. Мова':'memoryExample'
}));

const PROTECTED='[data-user-content],.post-text,.comment-zone p,#liveMessages p,.message-bubble p,.ai-conversation p,.realtime-transcript p,.conference-sylora-messages,.creatorIntelOut,pre,code';

function protectedNode(node){
  const el=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
  return !!el?.closest?.(PROTECTED);
}

function directTextNode(element){
  return [...(element?.childNodes||[])].find(node=>node.nodeType===Node.TEXT_NODE&&String(node.nodeValue||'').trim());
}

function updateTaggedCopy(root=document){
  const nodes=[];
  if(root.matches?.('[data-sylora-copy]'))nodes.push(root);
  nodes.push(...(root.querySelectorAll?.('[data-sylora-copy]')||[]));
  for(const element of nodes){
    if(protectedNode(element))continue;
    const key=element.dataset.syloraCopy;
    const translated=uiCopy(getLocale(),key);
    if(!translated)continue;
    const textNode=directTextNode(element);
    const current=String(textNode?.nodeValue??(!element.children.length?element.textContent:'')).trim();
    const knownCopy=SUPPORTED_UI_LOCALES.some(locale=>uiCopy(locale,key)===current);
    if(current&&!knownCopy){
      delete element.dataset.syloraCopy;
      continue;
    }
    if(textNode){
      const raw=textNode.nodeValue||'';
      const trimmed=raw.trim();
      if(trimmed!==translated)textNode.nodeValue=raw.replace(trimmed,translated);
    }else if(!element.children.length&&element.textContent!==translated){
      element.textContent=translated;
    }
  }
}

function translateTextNode(node){
  if(protectedNode(node))return false;
  const raw=node.nodeValue||'';
  const trimmed=raw.trim();
  if(!trimmed)return false;
  const key=SOURCE_ALIASES.get(trimmed);
  if(!key)return false;
  const translated=uiCopy(getLocale(),key);
  const parent=node.parentElement;
  if(parent)parent.dataset.syloraCopy=key;
  if(!translated||translated===trimmed)return false;
  node.nodeValue=raw.replace(trimmed,translated);
  return true;
}

function translateAttributes(root){
  const fields=root.matches?.('input,textarea')?[root]:[...(root.querySelectorAll?.('input,textarea')||[])];
  for(const el of fields){
    const current=String(el.getAttribute('placeholder')||'').trim();
    const key=el.dataset.syloraPlaceholder||PLACEHOLDER_ALIASES.get(current);
    if(!key)continue;
    el.dataset.syloraPlaceholder=key;
    const next=uiCopy(getLocale(),key);
    if(next&&next!==current)el.setAttribute('placeholder',next);
  }
  const labelled=root.matches?.('[aria-label]')?[root]:[...(root.querySelectorAll?.('[aria-label]')||[])];
  for(const el of labelled){
    const current=String(el.getAttribute('aria-label')||'').trim();
    const key=el.dataset.syloraAria||SOURCE_ALIASES.get(current);
    if(!key)continue;
    el.dataset.syloraAria=key;
    const next=uiCopy(getLocale(),key);
    if(next&&next!==current)el.setAttribute('aria-label',next);
  }
}

function normalizeProfileLocale(root=document){
  for(const select of root.querySelectorAll?.('select[name="locale"]')||[]){
    const current=SUPPORTED_UI_LOCALES.includes(select.value)?select.value:getLocale();
    const labels={uk:'Українська',en:'English',pl:'Polski',de:'Deutsch',ru:'Русский'};
    if(select.dataset.syloraLocales!=='uk,en,pl,de,ru'){
      select.replaceChildren(...SUPPORTED_UI_LOCALES.map(code=>{
        const option=document.createElement('option');option.value=code;option.textContent=labels[code];return option;
      }));
      select.dataset.syloraLocales='uk,en,pl,de,ru';
    }
    if(select.value!==current)select.value=current;
  }
}

function normalizeGreetingName(value=''){
  const clean=String(value).trim().replace(/[!]+$/,'').trim();
  if(/^(у|в|in|w|bei)\s+SYLORA$/i.test(clean)||/^SYLORA$/i.test(clean))return 'SYLORA';
  return clean;
}

function localizeGreeting(root=document){
  const h=root.querySelector?.('.horizon-copy h1');
  if(!h)return false;
  let name=h.dataset.syloraGreetingName||'';
  if(!name){
    const match=h.textContent.match(/^(Добрий ранок|Добрий день|Добрий вечір|Good morning|Good afternoon|Good evening|Dzień dobry|Dobry wieczór|Guten Morgen|Guten Tag|Guten Abend|Доброе утро|Добрый день|Добрый вечер),\s*(.+)$/i);
    if(!match)return false;
    name=normalizeGreetingName(match[2]);
    if(!name)return false;
    h.dataset.syloraGreetingName=name;
  }
  const hour=new Date().getHours();
  const key=hour<12?'goodMorning':hour<18?'goodAfternoon':'goodEvening';
  const next=`${uiCopy(getLocale(),key)}, ${name}!`;
  if(h.textContent===next)return false;
  h.textContent=next;
  return true;
}

function localize(root=document){
  const target=root.nodeType===Node.DOCUMENT_NODE?root.documentElement:root;
  if(!target)return;
  updateTaggedCopy(target);
  const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);
  const text=[];while(walker.nextNode())text.push(walker.currentNode);
  text.forEach(translateTextNode);
  translateAttributes(target);
  normalizeProfileLocale(target);
  localizeGreeting(document);
}

let scheduled=false;
function scheduleLocalize(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;localize(document)});
}

function boot(){
  localize(document);
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'||r.type==='characterData'))scheduleLocalize();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('storage',event=>{if(event.key==='sylora_locale')scheduleLocalize()});
  document.addEventListener('sylora:localechange',scheduleLocalize);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

export {SOURCE_ALIASES,PLACEHOLDER_ALIASES,localize};
