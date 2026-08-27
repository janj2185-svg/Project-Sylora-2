import test from 'node:test';
import assert from 'node:assert/strict';
import { authErrorKey, authText, validateAuthInput } from '../public/auth-ui.js';

test('registration validation matches the server account rules',()=>{
  assert.deepEqual(validateAuthInput('register',{username:' Іван ',email:'ivan@example.com',password:'password123'}),{
    ok:false,field:'username',messageKey:'invalidUsername'
  });
  assert.deepEqual(validateAuthInput('register',{username:'ivan_user',email:'not-an-email',password:'password123'}),{
    ok:false,field:'email',messageKey:'invalidEmail'
  });
  assert.deepEqual(validateAuthInput('register',{username:'ivan_user',email:'ivan@example.com',password:'onlyletters'}),{
    ok:false,field:'password',messageKey:'invalidPassword'
  });
  assert.deepEqual(validateAuthInput('register',{username:' ivan_user ',email:' ivan@example.com ',password:'password123'}),{
    ok:true,input:{username:'ivan_user',email:'ivan@example.com',password:'password123'}
  });
});

test('login validation keeps passwords intact and trims identity',()=>{
  assert.deepEqual(validateAuthInput('login',{identity:'  ivan@example.com ',password:' password123 '}),{
    ok:true,input:{identity:'ivan@example.com',password:' password123 '}
  });
  assert.deepEqual(validateAuthInput('login',{identity:'',password:'password123'}),{
    ok:false,field:'identity',messageKey:'required'
  });
});

test('authentication failures map to safe localized UI messages',()=>{
  assert.equal(authErrorKey({status:409,data:{code:'ACCOUNT_ALREADY_EXISTS'}}),'accountExists');
  assert.equal(authErrorKey({status:429,data:{code:'RATE_LIMITED'}}),'rateLimited');
  assert.equal(authErrorKey({status:503}),'serviceUnavailable');
  assert.equal(authErrorKey(new TypeError('Failed to fetch')),'networkError');
  assert.match(authText('uk','invalidUsername'),/латинських/);
  assert.equal(authText('unknown','working'),'Please wait…');
});
