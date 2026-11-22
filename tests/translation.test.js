import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalTranslator} from '../translation.js';
test('native translator chooses the correct pair in both directions and reuses it',async()=>{
 const previous=globalThis.Translator,calls=[];
 globalThis.Translator={availability:async()=> 'available',create:async pair=>{calls.push(pair);return {translate:async text=>`${pair.targetLanguage}:${text}`};}};
 try{const t=new LocalTranslator();assert.equal(await t.translate('안녕','ko-en'),'en:안녕');assert.equal(await t.translate('Hello','en-ko'),'ko:Hello');assert.equal(await t.translate('Again','en-ko'),'ko:Again');assert.deepEqual(calls.map(x=>[x.sourceLanguage,x.targetLanguage]),[['ko','en'],['en','ko']]);}finally{globalThis.Translator=previous;}
});
test('cancel rejects a late native translation',async()=>{
 const previous=globalThis.Translator;let finish;
 globalThis.Translator={availability:async()=> 'available',create:async()=>({translate:()=>new Promise(resolve=>finish=resolve)})};
 try{const t=new LocalTranslator();await t.init('en-ko');const result=t.translate('Old English','en-ko');await Promise.resolve();t.cancel();finish('이전 번역');await assert.rejects(result,{name:'AbortError'});}finally{globalThis.Translator=previous;}
});
