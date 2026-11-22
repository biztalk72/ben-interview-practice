import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {englishPlaylist,englishDialogue,speechChunks} from '../practice-data.js';
const cards=JSON.parse(readFileSync(new URL('../content.json',import.meta.url))).cards;
const answers=JSON.parse(readFileSync(new URL('../answers.json',import.meta.url))).answers;
test('all 23 PDF questions are uniquely mapped in early-round order with bilingual follow-ups',()=>{
 const early=cards.filter(c=>c.openingOrder).sort((a,b)=>a.openingOrder-b.openingOrder);assert.deepEqual(early.map(c=>c.openingOrder),Array.from({length:23},(_,i)=>i+1));
 for(const c of early){assert.ok(c.questionKo);assert.ok(c.sourceNote);const a=answers[c.id];assert.ok(a.ko.length>60);assert.ok(a.en.length>60);assert.ok(a.followups.length>=1&&a.followups.length<=3);}
});
test('every regular interview question has one to three substantive bilingual follow-up pairs',()=>{
 for(const c of cards.filter(c=>answers[c.id]&&c.group!=='closing')){const f=answers[c.id].followups;assert.ok(f.length>=1&&f.length<=3,c.id);for(const q of f)for(const key of ['questionKo','questionEn','ko','en'])assert.ok(q[key].length>8,`${c.id} ${key}`);}
});
test('full English playlist contains 108 unique cards and all 115 follow-up pairs in question-answer order',()=>{
 const p=englishPlaylist(cards,answers);assert.equal(p.count,108);assert.equal(p.skipped,0);assert.equal(new Set(p.items.map(x=>x.cardId)).size,108);assert.equal(p.items.length,108*2+115*2);assert.equal(p.items[0].cardId,'HR1');assert.equal(p.items[0].kind,'질문');assert.equal(p.items[1].kind,'답변');assert.equal(p.items[2].kind,'후속 질문');assert.equal(p.items[3].kind,'후속 답변');assert.ok(p.items.every(x=>x.lang==='en-US'&&!/[가-힣]/.test(x.text)));
});
test('playlist uses latest English edits and explicitly counts outdated English exclusions',()=>{
 const p=englishPlaylist(cards,answers,{HR1:{answerEn:'My latest answer',syncFrom:'en'},HR7:{answerKo:'수정',syncFrom:'ko'}});assert.equal(p.skipped,1);assert.equal(p.count,107);assert.equal(p.items[1].text,'My latest answer');assert.ok(p.items.every(x=>x.cardId!=='HR7'));
});
test('current-card dialogue and chunking retain follow-ups, every word and card metadata',()=>{
 const c=cards.find(c=>c.id==='HR8');const entries=englishDialogue(c,answers[c.id]);assert.equal(entries.length,8);const chunks=speechChunks(entries);assert.ok(chunks.length>entries.length);assert.ok(chunks.every(x=>x.cardId===c.id&&x.text.length<=190));assert.equal(chunks.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim(),entries.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim());
});
