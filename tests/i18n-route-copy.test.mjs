import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {UI_RUNTIME_COPY} from '../public/locales/ui-runtime.js';

const locales=['uk','en','pl','de','ru'];

test('route UI namespace has identical non-empty coverage for five production locales',()=>{
  const keys=Object.keys(UI_RUNTIME_COPY.en).sort();
  assert.ok(keys.length>=90,`expected broad route copy coverage, got ${keys.length}`);
  for(const locale of locales){
    const dict=UI_RUNTIME_COPY[locale];
    assert.ok(dict,`missing ${locale}`);
    assert.deepEqual(Object.keys(dict).sort(),keys,`${locale} route-copy key mismatch`);
    for(const key of keys){
      assert.equal(typeof dict[key],'string',`${locale}.${key} must be string`);
      assert.ok(dict[key].trim(),`${locale}.${key} is empty`);
    }
  }
});

test('localization bridge protects user-generated content from automatic UI translation',()=>{
  const source=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const selector of ['.post-text','.message-bubble p','#liveMessages p','.ai-conversation p','.conference-sylora-messages']){
    assert.ok(source.includes(selector),`UGC protection missing ${selector}`);
  }
});

test('localization bridge relinquishes stale tags when application state writes dynamic copy',()=>{
  const source=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  assert.match(source,/SUPPORTED_UI_LOCALES\.some\(locale=>uiCopy\(locale,key\)===current\)/);
  assert.match(source,/if\(current&&!knownCopy\)\{\s*delete element\.dataset\.syloraCopy;\s*continue;/);
});

test('critical Studio and LIVE labels are covered by centralized aliases',()=>{
  const source=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const literal of ['SOURCES','SCENES','AUDIO MIXER','BROADCAST','RECORD','WAITING FOR HOST','CONNECTION LOST','Подарунки SYLORA','LIVE P2P LIMIT','HOST UNAVAILABLE']){
    assert.ok(source.includes(`'${literal}'`),`missing UI alias ${literal}`);
  }
});

test('technical protocol names remain literal product vocabulary',()=>{
  const all=JSON.stringify(UI_RUNTIME_COPY);
  for(const token of ['OBS','WebRTC','LIVE'])assert.ok(all.includes(token),`technical token ${token} unexpectedly absent`);
});

test('LIVE director and dynamic action copy use the centralized locale namespace',()=>{
  const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  for(const literal of ['placeholder="Назва LIVE"','<b>Новий LIVE</b>','<small>камера або Studio</small>','LIVE ЗАРАЗ','Copilot ready',"toast('Legacy Resonance Battle')"]){
    assert.ok(!source.includes(literal),`hard-coded LIVE copy remains: ${literal}`);
  }
  for(const key of ['liveDirector','liveTitlePlaceholder','newLive','cameraOrStudio','liveNowLabel','copilotReady','battleStarted','legacyBattleStarted']){
    assert.ok(source.includes(`u('${key}')`),`LIVE route is not using ${key}`);
  }
});

test('Studio primary and reference layouts use centralized copy in all five locales',()=>{
  const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  for(const literal of ['<h1>Твоя сцена.</h1>','Output profile для canvas','Прибрати image','Назва scene','Зупинити broadcast','<b>Поточна сцена</b>','<button class="active" type="button">Controls</button>']){
    assert.ok(!source.includes(literal),`hard-coded Studio copy remains: ${literal}`);
  }
  for(const key of ['studioHeroTitle','studioHeroCopy','cameraMic','audioMixer','sceneName','stopBroadcast','studioSecurityNote','currentScene','controls','companionPairingFlow']){
    assert.ok(source.includes(`u('${key}')`),`Studio route is not using ${key}`);
  }
});

test('Inbox reference tabs, empty states, calls and privacy copy are localized',()=>{
  const bridge=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const literal of ['Чати','Події','Запрошення','Дзвінки','Пошук у розмовах','Почніть розмову.','WebRTC voice & video','ПРИВАТНІСТЬ','Ця розмова доступна лише її учасникам.']){
    assert.ok(bridge.includes(`'${literal}'`),`missing Inbox localization alias: ${literal}`);
  }
  for(const key of ['chats','events','invites','calls','searchConversations','startConversationTitle','webrtcVoiceVideo','privacy','conversationParticipantsOnly']){
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});

test('Sylora AI presence, action approval, voice and memory states are localized',()=>{
  const bridge=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const literal of ['Показати Sylora','Сховати Sylora','ПОТРІБНЕ ТВОЄ РІШЕННЯ','Підтвердити','Скасувати','Я слухаю.','Завершити LIVE','Озвучення увімкнено','Постійних спогадів поки немає.']){
    assert.ok(bridge.includes(`'${literal}'`),`missing Sylora AI localization alias: ${literal}`);
  }
  for(const key of ['showSylora','hideSylora','decisionRequired','confirm','cancel','listening','endLive','voiceEnabled','persistentMemoryEmpty']){
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});

test('Profile reference statistics, editor, activity and action states are localized',()=>{
  const bridge=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const literal of ['Оновити простір','Редагувати профіль','ПІДПИСНИКІВ','Мій простір','Мої Clips і відео','Мова інтерфейсу','Останні події','Профіль оновлено']){
    assert.ok(bridge.includes(`'${literal}'`),`missing Profile localization alias: ${literal}`);
  }
  for(const key of ['updateSpace','editProfile','audienceUpper','mySpace','myClipsVideos','interfaceLanguage','latestEvents','profileUpdated']){
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});

test('Wallet and Settings reference copy including accessibility labels is localized',()=>{
  const bridge=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const literal of ['ДОСТУПНИЙ БАЛАНС','НАДІСЛАТИ ПОДАРУНОК','Останні транзакції','Захищений гаманець','Розділи налаштувань','ПЕРЕКЛАД ІНТЕРФЕЙСУ','Трансляції без хаосу.','Жива, але під контролем.']){
    assert.ok(bridge.includes(`'${literal}'`),`missing Wallet/Settings localization alias: ${literal}`);
  }
  assert.match(bridge,/querySelectorAll\?\.\('\[aria-label\]'\)/,'aria-label localization is not wired');
  for(const key of ['balanceUpper','sendGiftUpper','recentTransactions','protectedWallet','settingsSections','interfaceTranslation','broadcastNoChaos','aliveControlled']){
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});

test('Communities cards, creation, discovery and channel states are localized',()=>{
  const bridge=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const literal of ['Будуй коло своїх.','＋ Створити спільноту','НОВА СПІЛЬНОТА','ЖИВІ ФОРМАТИ','Увімкнути discovery','МОЇ ДОСЯГНЕННЯ','Додати канал','Написати в канал…']){
    assert.ok(bridge.includes(`'${literal}'`),`missing Communities localization alias: ${literal}`);
  }
  for(const key of ['communityHero','createCommunity','newCommunity','livingFormats','enableDiscovery','myAchievements','addChannel','writeChannel']){
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});

test('Learning catalog, tools, course details and action states are localized',()=>{
  const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  for(const literal of ['<h1>Рости у власному ритмі.</h1>','<h1>Навчання, що оживає.</h1>','Опублікованих курсів поки немає.','<h3>Навчальний простір</h3>',"toast('Колоду створено')","toast('План готовий')",'>Позначити виконаним</button>']){
    assert.ok(!source.includes(literal),`hard-coded Learning copy remains: ${literal}`);
  }
  for(const key of ['growAtYourPace','learningComesAlive','continueLearning','studyWorkspace','research','courseTitle','deckCreated','planReady','enrollFree','markCompleted','tryAnotherExplanation']){
    assert.ok(source.includes(`u('${key}')`),`Learning route is not using ${key}`);
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});

test('Business metrics, workspaces, assistant and action states are localized',()=>{
  const appSource=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const source=appSource.split('async function renderBusinessReference(){')[1].split('function mountSyloraPressInteractions(){')[0];
  for(const literal of ['<h1>Робота в одному ритмі.</h1>','>＋ Draft invoice</button>','<small>ОРГАНІЗАЦІЇ</small>','Фактур ще немає.','>Додати клієнта</button>',"toast('Draft invoice створено')","toast('CRM запис створено')",'placeholder="Meeting title"']){
    assert.ok(!source.includes(literal),`hard-coded Business copy remains: ${literal}`);
  }
  for(const key of ['businessRhythm','businessSafetyCopy','draftInvoice','organizationsUpper','invoicesRealData','quickActions','countryProfile','organizationName','businessAiCopy','invoiceDraftCreated','meetingTitle','summaryDecisions','teamAdded','businessSectionDashboard']){
    assert.ok(source.includes(`u('${key}')`)||source.includes(`'${key}'`),`Business route is not using ${key}`);
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});

test('Identity profile, privacy vocabulary and knowledge graph states are localized',()=>{
  const appSource=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const source=appSource.split('async function renderIdentity(){')[1].split('async function renderAgents(){')[0];
  for(const literal of ['Не сторінка соцмережі','placeholder="Посада"','placeholder="Навички через кому"','ПРИВАТНІСТЬ ПОЛІВ','>Зберегти Identity</button>','Що Sylora може знати з твого дозволу','>Додати вузол</button>',"toast('Вузол додано')"]){
    assert.ok(!source.includes(literal),`hard-coded Identity copy remains: ${literal}`);
  }
  for(const key of ['identityHeroCopy','professionalUpper','jobTitle','skillsCommaSeparated','fieldPrivacyUpper','privacyPublic','privacyAiOnly','saveIdentity','knowledgePermissionTitle','addNode','knowledgeGraphEmpty','identityUpdated','nodeDeleted']){
    assert.ok(source.includes(`u('${key}')`)||source.includes(`'${key}'`),`Identity route is not using ${key}`);
    for(const locale of locales)assert.ok(UI_RUNTIME_COPY[locale][key],`missing ${locale}.${key}`);
  }
});
