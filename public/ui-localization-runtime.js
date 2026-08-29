import {getLocale,SUPPORTED_UI_LOCALES} from './i18n.js?v=20260829-shell1';
import {uiCopy} from './locales/ui-runtime.js?v=20260826-ui5';

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

const PLACEHOLDER_ALIASES=new Map(Object.entries({
  'Назва scene':'sceneName','OBS scenes…':'obsScenes','URL з’явиться тут':'urlAppears','Event title':'eventTitle','Starts (e.g. tomorrow 20:00)':'startsWhen','Написати в LIVE…':'writeLive','Коментар...':'comment','Коментар…':'comment','Про себе':'about','Написати повідомлення…':'writeMessage','Поговорити з Sylora…':'talkToSylora','Що запам’ятати':'whatRemember','Назва':'title','Опис':'description'
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
  const nodes=root.matches?.('input,textarea')?[root]:[...(root.querySelectorAll?.('input,textarea')||[])];
  for(const el of nodes){
    const current=String(el.getAttribute('placeholder')||'').trim();
    const key=el.dataset.syloraPlaceholder||PLACEHOLDER_ALIASES.get(current);
    if(!key)continue;
    el.dataset.syloraPlaceholder=key;
    const next=uiCopy(getLocale(),key);
    if(next&&next!==current)el.setAttribute('placeholder',next);
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
