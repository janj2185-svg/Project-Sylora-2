const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x)};

export class ParticleDirector{
  constructor({seed=1}={}){this.seed=seed;this.families=new Map();this.emissions=[]}
  registerFamily(id,spec){for(const key of ['cause','material','depthPlane','lifetime','forces','endState'])if(spec[key]===undefined)throw new Error(`Particle family ${id} missing ${key}`);const family=Object.freeze({id,...spec});this.families.set(id,family);return family}
  emit(familyId,{count=1,position={x:0,y:0,z:0},velocity={x:0,y:0,z:0},time=0}={}){const family=this.families.get(familyId);if(!family)throw new Error(`Unknown particle family: ${familyId}`);const particles=[];for(let i=0;i<count;i++){const key=this.seed+this.emissions.length*10007+i*97,jitter=hash(key)-.5;particles.push({familyId,bornAt:time,position:{...position},velocity:{x:velocity.x+jitter*(family.velocityJitter||0),y:velocity.y+(hash(key+1)-.5)*(family.velocityJitter||0),z:velocity.z+(hash(key+2)-.5)*(family.velocityJitter||0)},life:family.lifetime[0]+hash(key+3)*(family.lifetime[1]-family.lifetime[0])})}this.emissions.push(...particles);return particles}
  signature(){return[...this.families.values()].map(x=>`${x.id}:${x.material}:${x.cause}:${x.depthPlane}:${x.endState}`).join('|')}
}
