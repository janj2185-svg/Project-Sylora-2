export class Observability{
  constructor({logger=console,now=()=>new Date().toISOString()}={}){this.logger=logger;this.now=now;this.counters=new Map();this.startedAt=Date.now()}
  log(level,event,fields={}){const record={timestamp:this.now(),level,event,...fields};(this.logger[level]||this.logger.log).call(this.logger,JSON.stringify(record));return record}
  increment(name,value=1,labels={}){const key=`${name}:${JSON.stringify(labels)}`;this.counters.set(key,(this.counters.get(key)||0)+Number(value));return this.counters.get(key)}
  recordAiUsage({provider='unknown',model='unknown',inputTokens=0,outputTokens=0,costUsd=0}={}){this.increment('ai.input_tokens',inputTokens,{provider,model});this.increment('ai.output_tokens',outputTokens,{provider,model});this.increment('ai.cost_usd',costUsd,{provider,model})}
  health(extra={}){return {status:'ok',uptimeSeconds:Math.floor((Date.now()-this.startedAt)/1000),metrics:Object.fromEntries(this.counters),...extra}}
}
