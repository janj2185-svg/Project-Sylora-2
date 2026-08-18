import {scryptSync} from 'node:crypto';

export const FIXED_VISUAL_TIME='2026-08-18T12:00:00.000Z';
export const VISUAL_FIXTURE_ID='locked-redesign-visual-v1';
export const VISUAL_RANDOM_SEED=0x5a17c0de;
export const VISUAL_LOCALE='uk';

export const FIXED_VISUAL_ACCOUNT=Object.freeze({
  id:'00000000-0000-4000-8000-000000000026',
  username:'visual_baseline_owner',
  email:'visual-baseline@example.test',
  password:'VisualBaseline!2026Aa9',
  displayName:'SYLORA Visual Baseline',
  bio:'Фіксований профіль для візуальної перевірки.'
});

const PASSWORD_SALT='53594c4f52415f56495355414c5f5631';
const PASSWORD_HASH=`scrypt:${PASSWORD_SALT}:${scryptSync(FIXED_VISUAL_ACCOUNT.password,PASSWORD_SALT,64).toString('hex')}`;

export function createVisualFixtureData(){
  const account=FIXED_VISUAL_ACCOUNT;
  return {
    users:[{
      id:account.id,
      email:account.email,
      username:account.username,
      passwordHash:PASSWORD_HASH,
      displayName:account.displayName,
      bio:account.bio,
      locale:VISUAL_LOCALE,
      avatar:'',
      role:'user',
      status:'active',
      createdAt:FIXED_VISUAL_TIME,
      updatedAt:FIXED_VISUAL_TIME
    }],
    sessions:[],
    wallets:[{userId:account.id,balance:10000,earnings:0,currency:'LUMEN'}],
    dailyBriefPrefs:[{userId:account.id,enabled:false,updatedAt:FIXED_VISUAL_TIME}],
    aiMessages:[],
    aiMemories:[],
    aiActivity:[],
    audit:[]
  };
}
