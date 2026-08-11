import {randomUUID} from 'node:crypto';

export class EntitlementService{
  constructor({entitlements=[],products=[],provider=null,mode='sandbox',persist=()=>{}}={}){this.entitlements=entitlements;this.products=products;this.provider=provider;this.mode=mode==='production'?'production':'sandbox';this.persist=persist}
  registerProduct(ownerId,input={}){const product={id:randomUUID(),ownerId,type:['subscription','membership','digital_product'].includes(input.type)?input.type:'digital_product',name:String(input.name||'').slice(0,120),price:Math.max(0,Number(input.price)||0),currency:input.currency||'USD',active:true,createdAt:new Date().toISOString()};if(!product.name)throw new Error('PRODUCT_NAME_REQUIRED');this.products.push(product);this.persist();return product}
  async purchase(userId,productId,input={}){
    const product=this.products.find(x=>x.id===productId&&x.active);if(!product)throw new Error('PRODUCT_NOT_FOUND');
    if(this.mode==='production'&&!this.provider)throw new Error('PAYMENT_PROVIDER_REQUIRED');
    if(product.price>0&&!this.provider&&this.mode!=='sandbox')throw new Error('PAYMENT_PROVIDER_REQUIRED');
    const payment=this.provider?await this.provider.charge({userId,product,...input}):{id:`sandbox_${randomUUID()}`,status:'sandbox_approved'};
    if(!['paid','succeeded','sandbox_approved'].includes(payment.status))throw new Error('PAYMENT_NOT_CONFIRMED');
    const entitlement={id:randomUUID(),userId,productId,mode:this.mode,paymentId:payment.id,status:'active',grantedAt:new Date().toISOString(),expiresAt:input.expiresAt||null};this.entitlements.push(entitlement);this.persist();return entitlement;
  }
  has(userId,productId){return this.entitlements.some(x=>x.userId===userId&&x.productId===productId&&x.status==='active'&&(!x.expiresAt||new Date(x.expiresAt)>new Date()))}
}
