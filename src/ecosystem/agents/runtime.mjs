const FORBIDDEN_DOMAINS=new Set(['financial','legal']);

export class AgentRuntime{
  constructor({marketplace,tools={},permissionCheck=()=>false,auditLogger=null}={}){this.marketplace=marketplace;this.tools=new Map(Object.entries(tools));this.permissionCheck=permissionCheck;this.auditLogger=auditLogger}
  registerTool(name,handler,{domain='general'}={}){this.tools.set(name,{handler,domain})}
  async invoke({userId,agentId,tool,input={},confirmed=false}){
    const install=this.marketplace?.installs.find(x=>x.userId===userId&&x.agentId===agentId&&x.status==='installed');if(!install)throw new Error('AGENT_NOT_INSTALLED');
    const manifest=this.marketplace.catalog.find(x=>x.id===agentId&&x.version===install.version);if(!manifest?.tools.includes(tool))throw new Error('AGENT_TOOL_NOT_DECLARED');
    const entry=this.tools.get(tool);if(!entry)throw new Error('AGENT_TOOL_UNAVAILABLE');
    const definition=typeof entry==='function'?{handler:entry,domain:'general'}:entry;
    if(FORBIDDEN_DOMAINS.has(definition.domain)||FORBIDDEN_DOMAINS.has(input.domain))throw new Error('HUMAN_EXECUTION_REQUIRED');
    if(!this.permissionCheck({userId,agentId,tool,input,permissions:install.permissions,confirmed}))throw new Error('AGENT_TOOL_PERMISSION_DENIED');
    const result=await definition.handler(structuredClone(input),{userId,agentId,sandbox:true});this.auditLogger?.append?.({userId,agentId,action:'agent.tool.invoke',metadata:{tool,outcome:'success'}});return result;
  }
}
