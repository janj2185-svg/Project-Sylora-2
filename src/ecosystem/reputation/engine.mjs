import {randomUUID} from 'node:crypto';

export const REPUTATION_AXES=Object.freeze(['creator','professional','marketplace','community','contribution','verifiedExpertise','trustScore']);

export class ReputationEngine{
  constructor({scores=[],disputes=[],persist=()=>{}}={}){this.scores=scores;this.disputes=disputes;this.persist=persist}
  get(userId){let row=this.scores.find(x=>x.userId===userId);if(!row){row={userId,axes:Object.fromEntries(REPUTATION_AXES.map(x=>[x,0])),factors:[],updatedAt:new Date().toISOString()};this.scores.push(row);this.persist()}return structuredClone(row)}
  recordFactor(userId,{axis,value,reason,evidenceId=null}={}){if(!REPUTATION_AXES.includes(axis))throw new Error('INVALID_REPUTATION_AXIS');const row=this.scores.find(x=>x.userId===userId)||this.getMutable(userId);const delta=Math.max(-20,Math.min(20,Number(value)||0));row.axes[axis]=Math.max(0,Math.min(100,row.axes[axis]+delta));row.factors.push({axis,value:delta,reason:String(reason||'unspecified').slice(0,300),evidenceId,createdAt:new Date().toISOString()});row.factors=row.factors.slice(-200);row.updatedAt=new Date().toISOString();this.persist();return structuredClone(row)}
  explain(userId){const row=this.scores.find(x=>x.userId===userId)||this.getMutable(userId);return {userId,axes:{...row.axes},factors:structuredClone(row.factors),method:'bounded additive factors; no hidden global rank'}}
  dispute(userId,factorIndex,reason){const dispute={id:randomUUID(),userId,factorIndex:Number(factorIndex),reason:String(reason).slice(0,1000),status:'received',createdAt:new Date().toISOString()};this.disputes.push(dispute);this.persist();return dispute}
  getMutable(userId){const row={userId,axes:Object.fromEntries(REPUTATION_AXES.map(x=>[x,0])),factors:[],updatedAt:new Date().toISOString()};this.scores.push(row);return row}
}
