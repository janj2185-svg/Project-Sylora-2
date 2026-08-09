const v=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b,s=1)=>{a.x+=b.x*s;a.y+=b.y*s;a.z+=b.z*s;return a};
const length=a=>Math.hypot(a.x,a.y,a.z)||1;

export const MATERIAL_PHYSICS=Object.freeze({
  crystal:{density:2.5,drag:.035,restitution:.38},gold:{density:19.3,drag:.06,restitution:.12},
  feather:{density:.08,drag:.58,restitution:.05},ember:{density:.04,drag:.32,restitution:.02},water:{density:1,drag:.24,restitution:.01}
});

export class PhysicsWorld{
  constructor({step=1/120}={}){this.step=step;this.time=0;this.accumulator=0;this.bodies=[];this.fields=[]}
  addBody(body){const material=MATERIAL_PHYSICS[body.material];if(!material)throw new Error(`Unknown physical material: ${body.material}`);const item={id:body.id,material:body.material,mass:body.mass??material.density,position:v(body.position?.x,body.position?.y,body.position?.z),velocity:v(body.velocity?.x,body.velocity?.y,body.velocity?.z),force:v(),drag:body.drag??material.drag};this.bodies.push(item);return item}
  addField(field){if(!['wind','vortex','pressure','buoyancy','gravity'].includes(field.type))throw new Error(`Unknown force field: ${field.type}`);this.fields.push({...field});return field}
  forceFor(body){const total=v();for(const field of this.fields){const strength=field.strength??0;if(field.type==='gravity')add(total,v(0,-strength*body.mass,0));else if(field.type==='wind')add(total,field.direction||v(1,0,0),strength);else if(field.type==='buoyancy')add(total,v(0,strength/body.mass,0));else {const center=field.center||v(),dx=center.x-body.position.x,dy=center.y-body.position.y,dz=center.z-body.position.z,d=Math.max(.08,Math.hypot(dx,dy,dz)),sign=field.type==='pressure'?-1:1;add(total,v(dx/d,dy/d,dz/d),sign*strength/Math.max(1,d*d))}}return total}
  fixedStep(){for(const body of this.bodies){const force=this.forceFor(body);add(body.velocity,force,this.step/body.mass);const damping=Math.exp(-body.drag*this.step*60);body.velocity.x*=damping;body.velocity.y*=damping;body.velocity.z*=damping;add(body.position,body.velocity,this.step)}this.time+=this.step}
  advance(delta){this.accumulator+=Math.min(.1,Math.max(0,delta));while(this.accumulator+1e-9>=this.step){this.fixedStep();this.accumulator-=this.step}}
  kineticEnergy(body){return .5*body.mass*length(body.velocity)**2}
}
