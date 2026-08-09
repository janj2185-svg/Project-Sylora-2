const REQUIRED=['baseColor','roughness','metalness'];
const LIMITS={roughness:[0,1],metalness:[0,1],transmission:[0,1],ior:[1,2.6],thickness:[0,10]};

export class MaterialLab{
  constructor(){this.passports=new Map()}
  register(id,passport){for(const key of REQUIRED)if(passport[key]===undefined)throw new Error(`Material ${id} missing ${key}`);for(const [key,[lo,hi]] of Object.entries(LIMITS)){if(passport[key]===undefined)continue;if(passport[key]<lo||passport[key]>hi)throw new Error(`Material ${id} invalid ${key}`)}const frozen=Object.freeze({id,...passport});this.passports.set(id,frozen);return frozen}
  get(id){return this.passports.get(id)||null}
  signature(id){const p=this.get(id);if(!p)return'';return[p.family,p.baseColor,p.roughness,p.metalness,p.transmission??0,p.ior??1].join(':')}
}

export const registerSyloraCoreMaterials=lab=>{
  lab.register('sylora-crystal',{family:'crystal',baseColor:'#F8F7FF',roughness:.11,metalness:.05,transmission:.64,ior:1.62,thickness:.8,dispersion:true,microSurface:true});
  lab.register('sylora-gold',{family:'gold',baseColor:'#E7B765',roughness:.18,metalness:.9,transmission:0,ior:1,microSurface:true});
  return lab;
};
