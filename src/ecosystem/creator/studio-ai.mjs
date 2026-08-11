import {randomUUID} from 'node:crypto';

/** AI Creator Studio proposals — never auto-publish. Integrates with existing LIVE/Studio. */
export const CREATOR_PACKAGE_FIELDS=Object.freeze([
  'topic','structure','scenes','overlays','questions','interactives','polls','subtitles','translation','moderation','streamAssistant','analytics','highlightHints','clipPlan','titles','descriptions','thumbnails','shorts','postSummary'
]);

export function buildLivePackage({topic,locale='uk',durationMinutes=45}={}){
  const clean=String(topic||'').trim().slice(0,160);
  if(!clean)throw new Error('CREATOR_TOPIC_REQUIRED');
  const minutes=Math.max(10,Math.min(180,Number(durationMinutes)||45));
  return {
    id:randomUUID(),
    status:'draft_proposal',
    requiresCreatorApproval:true,
    topic:clean,
    locale,
    durationMinutes:minutes,
    structure:[
      {beat:'open',minutes:Math.round(minutes*0.08),goal:'Welcome and promise'},
      {beat:'core',minutes:Math.round(minutes*0.62),goal:`Deliver value on ${clean}`},
      {beat:'interact',minutes:Math.round(minutes*0.18),goal:'Audience Q&A and polls'},
      {beat:'close',minutes:Math.round(minutes*0.12),goal:'Summary, CTA, next LIVE'}
    ],
    scenes:[
      {id:'intro',overlayTitle:clean,overlayStyle:'clean',profileId:'vertical1080'},
      {id:'main',overlayTitle:clean,overlayStyle:'violet',profileId:'vertical1080'},
      {id:'qa',overlayTitle:'Q&A',overlayStyle:'cyan',profileId:'vertical1080'}
    ],
    overlays:[{type:'lower_third',text:clean},{type:'topic_chip',text:clean}],
    questions:[`Що для вас найважливіше в темі «${clean}»?`,`Який досвід ви вже маєте з цим?`],
    interactives:[{type:'reaction_prompt',text:'Поділіться емодзі, якщо згодні'}],
    polls:[{question:`Наскільки актуальна тема «${clean}»?`,options:['Дуже','Середньо','Нова для мене']}],
    subtitles:{enabled:true,mode:'live_caption_proposal'},
    translation:{enabled:false,status:'BLOCKED_UNTIL_PROVIDER',note:'Uses /api/translate when configured'},
    moderation:{mode:'assist',autoMute:false,requiresHostConfirm:true},
    streamAssistant:{role:'creator_assistant',samePersonalAi:true},
    analytics:['retention_hints','chat_velocity','gift_spikes'],
    highlightHints:['first value statement','strong audience question','closing CTA'],
    clipPlan:[{title:`${clean} — ключ`,durationSec:35},{title:`${clean} — Q&A`,durationSec:28}],
    titles:[`${clean} | SYLORA LIVE`,`LIVE: ${clean}`],
    descriptions:[`Прямий ефір про ${clean}. Питання в чаті, підсумки після ефіру.`],
    thumbnails:[{style:'portrait_topic',text:clean}],
    shorts:[{hook:clean,durationSec:20}],
    postSummary:{template:'after_live',includeHighlights:true,includeNextActions:true},
    createdAt:new Date().toISOString()
  };
}

export class CreatorStudioAi{
  constructor({packages=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.packages=packages;this.persist=persist;this.now=now}
  propose(userId,input={}){
    const pack={...buildLivePackage(input),userId,createdAt:this.now(),updatedAt:this.now()};
    this.packages.push(pack);this.persist();return structuredClone(pack);
  }
  list(userId){return this.packages.filter(x=>x.userId===userId).map(x=>structuredClone(x))}
  get(userId,id){const pack=this.packages.find(x=>x.id===id&&x.userId===userId);return pack?structuredClone(pack):null}
  approveSceneExport(userId,id){
    const pack=this.packages.find(x=>x.id===id&&x.userId===userId);if(!pack)throw new Error('CREATOR_PACKAGE_NOT_FOUND');
    pack.status='approved_for_studio';pack.updatedAt=this.now();this.persist();
    return pack.scenes.map(scene=>({name:`${pack.topic} · ${scene.id}`,overlayTitle:scene.overlayTitle,overlayStyle:scene.overlayStyle,profileId:scene.profileId,micGain:100,micMuted:false,fromAiPackageId:pack.id}));
  }
}
