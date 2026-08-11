export const COMMAND_CONTEXTS=Object.freeze(['live','business','learning','messages','creator','general']);
const FLAVORS={live:'Be concise and aware of live audience safety.',business:'Prioritize evidence, confidentiality, and human approval.',learning:'Teach with questions and cite uncertainty.',messages:'Protect private conversations and draft before sending.',creator:'Offer editable drafts; never publish without confirmation.',general:'Be useful, direct, multilingual, and honest.'};

export class CommandCenter{
  constructor({memory,knowledgeGraph,getPermissions}={}){this.memory=memory;this.knowledgeGraph=knowledgeGraph;this.getPermissions=getPermissions||(()=>({}))}
  context(userId,name='general'){
    const context=COMMAND_CONTEXTS.includes(name)?name:'general';
    return {identity:'sylora-personal-ai',context,systemPromptFlavor:FLAVORS[context],memory:'shared',knowledgeGraph:'shared',permissions:'shared',permissionSnapshot:this.getPermissions(userId),userId};
  }
}
