/** Platform revenue-share architecture. No fake payout rails. */
export function computeShare({gross=0,creatorBps=7000,developerBps=0,teacherBps=0,communityBps=0,agentDeveloperBps=0}={}){
  const amount=Math.max(0,Math.round(Number(gross)||0));
  const parts={
    creator:clampBps(creatorBps),
    developer:clampBps(developerBps),
    teacher:clampBps(teacherBps),
    community:clampBps(communityBps),
    agentDeveloper:clampBps(agentDeveloperBps)
  };
  const allocated=Object.values(parts).reduce((a,b)=>a+b,0);
  if(allocated>10000)throw new Error('REVENUE_SHARE_EXCEEDS_100');
  const platform=10000-allocated;
  const legs=Object.fromEntries(Object.entries({...parts,platform}).map(([k,bps])=>[k,{bps,amount:Math.floor(amount*bps/10000)}]));
  const distributed=Object.values(legs).reduce((a,l)=>a+l.amount,0);
  const remainder=amount-distributed;
  if(remainder)legs.platform.amount+=remainder;
  return {gross:amount,mode:'architecture',payoutStatus:'BLOCKED_UNTIL_PAYMENT_PROVIDER',legs};
}

function clampBps(value){const n=Math.round(Number(value)||0);return Math.max(0,Math.min(10000,n))}

export class RevenueShareLedger{
  constructor({entries=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.entries=entries;this.persist=persist;this.now=now}
  record(input){
    const share=computeShare(input);
    const entry={id:input.id||`rev_${this.entries.length+1}`,source:input.source||'unknown',sourceId:input.sourceId||null,userId:input.userId||null,...share,createdAt:this.now()};
    this.entries.push(entry);this.persist();return structuredClone(entry);
  }
  list(userId){return this.entries.filter(x=>!userId||x.userId===userId).map(x=>structuredClone(x))}
}
