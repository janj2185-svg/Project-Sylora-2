import { test, expect } from '@playwright/test';
import { createCompanionServer } from '../src/companion.mjs';
import { normalizeTikTokLiveEvent } from '../src/tiktok-live.mjs';
import { registerViaUi, uniqueAccount } from './helpers.mjs';

const token='tiktok-owner-pilot-pairing-token-123456';
let companion;

class FakeTikTokBridge{
  constructor(){this.connected=false;this.events=[];this.cursor=0}
  snapshot(){return{state:this.connected?'connected':'disconnected',connected:this.connected,cursor:this.cursor,url:this.connected?'ws://127.0.0.1:21213/':null}}
  async connect(){this.connected=true;return this.snapshot()}
  disconnect(){this.connected=false;return this.snapshot()}
  eventsAfter(after=0){return{events:this.events.filter(event=>event.cursor>Number(after)),cursor:this.cursor,status:this.snapshot()}}
  simulate(input){const event=normalizeTikTokLiveEvent(input);const queued={...event,source:'simulator',cursor:++this.cursor};this.events.push(queued);return queued}
  close(){this.connected=false}
}

test.beforeAll(async()=>{
  const appPort=Number(process.env.SYLORA_E2E_PORT||8791);
  companion=createCompanionServer({token,allowedOrigins:[`http://127.0.0.1:${appPort}`,`http://localhost:${appPort}`],TikTokBridge:FakeTikTokBridge,allowSimulation:true});
  await companion.listen(43179);
});
test.afterAll(async()=>{await companion?.close()});

test('owner can connect the local bridge and inspect chat, gift and host events safely',async({page})=>{
  await registerViaUi(page,uniqueAccount('tiktok'));
  let copilotRequests=0;page.on('request',request=>{if(request.url().endsWith('/api/ai/live-copilot/respond'))copilotRequests+=1});
  await page.locator('button[data-view="live"]:visible').first().click();
  await expect(page.locator('.tiktok-owner-pilot')).toBeVisible();
  await page.locator('#tiktokBridgeForm [name="token"]').fill(token);
  await page.locator('#tiktokBridgeForm button[type="submit"]').click();
  await expect(page.locator('#tiktokPilotState')).toHaveAttribute('data-state','online');
  await expect(page.locator('#tiktokSimulator')).toBeVisible();
  await expect(page.locator('#tiktokBridgeForm [name="token"]')).toHaveValue('');
  expect(await page.evaluate(secret=>Object.values(localStorage).includes(secret),token)).toBe(false);

  for(const type of ['chat','gift','guest'])await page.locator(`[data-tiktok-sim="${type}"]`).click();
  await expect(page.locator('.tiktok-event-external')).toHaveCount(3,{timeout:8_000});
  await expect(page.locator('#tiktokEventJournal')).toContainText('Test Viewer: Sylora, привіт!');
  await expect(page.locator('#tiktokEventJournal')).toContainText('Rose ×3');
  await expect(page.locator('#tiktokEventJournal')).toContainText('Co-host · linkMicBattle');
  expect(copilotRequests).toBe(0);

  await page.route('**/api/ai/live-copilot/respond',async route=>{
    const event=route.request().postDataJSON()?.event||{};
    const message=event.type==='guest'?'Вітаю співведучого.':'Привіт! Я поруч у цьому LIVE.';
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({message,eventType:event.type,delivery:'local_voice_or_owner_approved',sentToTikTok:false})});
  });

  const hostEvent=page.locator('.tiktok-event-external').filter({hasText:'Co-host · linkMicBattle'});
  await hostEvent.getByRole('button',{name:'Відповісти'}).click();
  await expect.poll(()=>copilotRequests).toBe(1);
  await expect(page.locator('.tiktok-event-sylora')).toContainText('Вітаю співведучого. · LOCAL VOICE ONLY');

  await page.locator('#tiktokResponseMode').selectOption('mentions');
  await page.locator('[data-tiktok-sim="chat"]').click();
  await expect.poll(()=>copilotRequests,{timeout:8_000}).toBe(2);
  await expect(page.locator('.tiktok-event-sylora').first()).toContainText('Привіт! Я поруч у цьому LIVE. · LOCAL VOICE ONLY');
});
