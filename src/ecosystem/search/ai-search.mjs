import {can,ACTION_LEVELS} from '../permissions.mjs';

export class AiSearch{
  constructor({sources={},vectorProvider=null}={}){this.sources=sources;this.vectorProvider=vectorProvider}
  plan(query,{semantic=false,types=[]}={}){const q=String(query||'').trim();return {query:q,strategy:semantic&&this.vectorProvider?'hybrid':'structured_substring',semantic:{status:semantic&&!this.vectorProvider?'BLOCKED':'available',reason:semantic&&!this.vectorProvider?'VECTOR_SEARCH_PROVIDER_NOT_CONFIGURED':null},types}}
  async search(query,{user=null,permissions={},semantic=false,types=[],limit=50,context={}}={}){
    const plan=this.plan(query,{semantic,types}),needle=plan.query.toLowerCase();if(needle.length<2)return {plan,results:[]};
    const results=[];
    for(const [type,provider] of Object.entries(this.sources)){
      if(types.length&&!types.includes(type))continue;const rows=typeof provider==='function'?await provider():provider;
      for(const row of rows||[]){const resource={ownerId:row.ownerId||row.userId,scope:row.scope||'profile',privacy:row.privacy||'public'};if(JSON.stringify(row).toLowerCase().includes(needle)&&can(user,ACTION_LEVELS.READ,resource,{...context,permissions}))results.push({type,item:row,score:1})}
    }
    return {plan,results:results.slice(0,Math.min(200,limit))};
  }
}
