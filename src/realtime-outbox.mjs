export class RealtimeOutbox {
  constructor({repository,dispatch,intervalMs=750,batchSize=20}={}){this.repository=repository;this.dispatch=dispatch;this.intervalMs=Math.max(250,intervalMs);this.batchSize=Math.max(1,Math.min(100,batchSize));this.timer=null;this.running=false}

  start(){if(!this.repository?.enabled||this.timer)return false;this.timer=setInterval(()=>this.flush().catch(()=>{}),this.intervalMs);this.timer.unref?.();this.flush().catch(()=>{});return true}

  async flush(){if(!this.repository?.enabled||this.running)return 0;this.running=true;let delivered=0;try{const {claimToken,events}=await this.repository.claimBatch({limit:this.batchSize});for(const event of events){try{await this.dispatch(event);await this.repository.markPublished(event.id,claimToken);delivered++}catch(error){const delay=Math.min(30_000,500*2**Math.min(6,event.attempts||0));await this.repository.releaseClaim(event.id,claimToken,error?.message||error,delay)}}return delivered}finally{this.running=false}}

  stop(){if(this.timer){clearInterval(this.timer);this.timer=null}}
}
