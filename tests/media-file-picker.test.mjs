import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bindMediaFilePicker,mediaFilePickerMarkup} from '../public/media-file-picker.js';

test('app imports the single shared media picker instead of keeping duplicate helpers',()=>{
  const app=fs.readFileSync('public/app.js','utf8');
  assert.match(app,/import \{ bindMediaFilePicker, mediaFilePickerMarkup \} from '\.\/media-file-picker\.js';/);
  assert.doesNotMatch(app,/function (?:bindMediaFilePicker|mediaFilePickerMarkup)\(/);
});

test('shared media picker renders one accessible localized file control',()=>{
  const markup=mediaFilePickerMarkup('video/mp4,"custom"&video/webm');
  assert.equal((markup.match(/type="file"/g)||[]).length,1);
  assert.match(markup,/class="media-file-picker"/);
  assert.match(markup,/data-sylora-copy="chooseMediaFile"/);
  assert.match(markup,/data-sylora-copy="noFileChosen"/);
  assert.match(markup,/accept="video\/mp4,&quot;custom&quot;&amp;video\/webm"/);
});

test('shared media picker marks filenames as user content and restores localized empty state',()=>{
  let onChange;
  const input={files:[],addEventListener:(type,listener)=>{if(type==='change')onChange=listener}};
  const label={
    dataset:{syloraCopy:'noFileChosen'},
    textContent:'Файл не вибрано',
    removeAttribute:name=>{if(name==='data-user-content')delete label.dataset.userContent}
  };
  const form={querySelector:selector=>selector==='.media-file-input'?input:label};

  bindMediaFilePicker(form);
  input.files=[{name:'owner-live.mp4'}];
  onChange();
  assert.equal(label.textContent,'owner-live.mp4');
  assert.equal(label.dataset.userContent,'');
  assert.equal(label.dataset.syloraCopy,undefined);

  input.files=[];
  onChange();
  assert.equal(label.textContent,'Файл не вибрано');
  assert.equal(label.dataset.syloraCopy,'noFileChosen');
  assert.equal(label.dataset.userContent,undefined);
});
