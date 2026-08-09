import {REQUIRED_STORY_FUNCTIONS} from './story-graph.js';
import {isForbiddenAudioLabel} from './physical-audio.js';

export function validateGiftDefinition(definition,{siblings=[]}={}){
  const errors=[],functions=definition.story.functions();
  for(const fn of REQUIRED_STORY_FUNCTIONS)if(!functions.has(fn))errors.push(`missing-story-function:${fn}`);
  for(const gap of definition.story.activityGaps(1))errors.push(`dead-time:${gap.from.toFixed(2)}-${gap.to.toFixed(2)}`);
  if(!definition.climaxType)errors.push('missing-unique-climax');
  if(!definition.endingType)errors.push('missing-unique-ending');
  if(definition.audioLabels?.some(isForbiddenAudioLabel))errors.push('forbidden-music');
  if(definition.tier==='epic'||definition.tier==='legendary')if(!definition.streamDepthInteraction)errors.push('missing-depth-interaction');
  const fingerprint=definition.shots.fingerprint();
  for(const sibling of siblings){if(sibling.id===definition.id)continue;if(sibling.shots?.fingerprint()===fingerprint)errors.push(`duplicate-camera:${sibling.id}`);if(sibling.climaxType===definition.climaxType)errors.push(`duplicate-climax:${sibling.id}`);if(sibling.endingType===definition.endingType)errors.push(`duplicate-ending:${sibling.id}`)}
  return{ok:errors.length===0,errors};
}
