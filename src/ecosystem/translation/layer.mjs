const LANGUAGE_HINTS=[[/[іїєґ]/i,'uk'],[/[ąćęłńóśźż]/i,'pl'],[/[a-z]/i,'en']];

export class TranslationLayer{
  constructor({provider=null,providerName=null,now=()=>new Date().toISOString()}={}){this.provider=provider;this.providerName=providerName;this.now=now}
  detect(text){for(const [pattern,language] of LANGUAGE_HINTS)if(pattern.test(String(text)))return {status:'detected',language,confidence:0.6};return {status:'unknown',language:null,confidence:0}}
  async translate({text,targetLanguage,sourceLanguage=null}={}){
    if(!String(text||'').trim()||!targetLanguage)throw new Error('TRANSLATION_INPUT_REQUIRED');
    if(!this.provider)return {status:'BLOCKED',reason:'TRANSLATION_PROVIDER_NOT_CONFIGURED',provider:null,sourceLanguage:sourceLanguage||this.detect(text).language,targetLanguage,text:null,createdAt:this.now()};
    const translated=await this.provider({text:String(text),sourceLanguage:sourceLanguage||this.detect(text).language,targetLanguage});
    return {status:'completed',provider:this.providerName||'configured',sourceLanguage:sourceLanguage||this.detect(text).language,targetLanguage,text:String(translated),createdAt:this.now()};
  }
  markSyntheticVoice(record={}){return {...record,syntheticVoice:true,contentLabel:'synthetic_voice'}}
  speechInterface(){return {status:'architecture_only',productionReady:false,methods:['transcribe','translateSpeech','synthesize']}}
  videoInterface(){return {status:'architecture_only',productionReady:false,methods:['caption','dub','preserveOriginalTrack']}}
}

export function openAiTranslationAdapter(openai,model){
  return async({text,sourceLanguage,targetLanguage})=>{const response=await openai.responses.create({model,store:false,max_output_tokens:2000,instructions:`Translate faithfully from ${sourceLanguage||'the detected language'} to ${targetLanguage}. Return only the translated text.`,input:text});if(!response.output_text)throw new Error('TRANSLATION_PROVIDER_EMPTY');return response.output_text};
}
