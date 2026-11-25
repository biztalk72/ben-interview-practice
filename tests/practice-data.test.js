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
test('full English playlist contains 132 unique cards and all 164 follow-up pairs in question-answer order',()=>{
 const p=englishPlaylist(cards,answers);assert.equal(p.count,132);assert.equal(p.skipped,0);assert.equal(new Set(p.items.map(x=>x.cardId)).size,132);assert.equal(p.items.length,132*2+164*2);assert.equal(p.items[0].cardId,'CEO1');assert.equal(p.items[0].kind,'질문');assert.equal(p.items[1].kind,'답변');assert.equal(p.items[2].kind,'후속 질문');assert.equal(p.items[3].kind,'후속 답변');assert.ok(p.items.every(x=>x.lang==='en-US'&&!/[가-힣]/.test(x.text)));
});
test('playlist uses latest English edits and explicitly counts outdated English exclusions',()=>{
 const p=englishPlaylist(cards,answers,{HR1:{answerEn:'My latest answer',syncFrom:'en'},HR7:{answerKo:'수정',syncFrom:'ko'}});assert.equal(p.skipped,1);assert.equal(p.count,131);assert.equal(p.items.find(x=>x.cardId==='HR1'&&x.kind==='답변').text,'My latest answer');assert.ok(p.items.every(x=>x.cardId!=='HR7'));
});
test('current-card dialogue and chunking retain follow-ups, every word and card metadata',()=>{
 const c=cards.find(c=>c.id==='HR8');const entries=englishDialogue(c,answers[c.id]);assert.equal(entries.length,8);const chunks=speechChunks(entries);assert.ok(chunks.length>entries.length);assert.ok(chunks.every(x=>x.cardId===c.id&&x.text.length<=190));assert.equal(chunks.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim(),entries.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim());
});

test('CEO-only playlist contains 24 ordered question cards, 49 bilingual follow-ups and cue cards',()=>{
 const ceo=cards.filter(c=>c.group==='ceo');assert.equal(ceo.length,24);assert.deepEqual(ceo.map(c=>c.ceoOrder).sort((a,b)=>a-b),Array.from({length:24},(_,i)=>i+1));
 const playlist=englishPlaylist(ceo,answers);assert.equal(playlist.count,24);assert.equal(playlist.items.length,24*2+49*2);assert.ok(playlist.items.every(x=>x.cardId.startsWith('CEO')));
 for(const card of ceo){assert.ok(card.body.includes('**큐카드:**'),card.id);assert.equal(answers[card.id].followups.length,card.id==='CEO21'?3:2);assert.ok(card.questionKo.length>8);}
 assert.equal(cards.filter(c=>c.group==='ceo-guide').length,2);
});

test('candidate incident keeps daily impact distinct from cumulative or avoided loss',()=>{
 const incident=answers.CEO21.evidence;assert.equal(incident.approximateOutageDays,4);assert.equal(incident.reportedDailyImpactKrw,10000000000);assert.equal(incident.totalLossKrw,null);assert.equal(incident.avoidedLossKrw,null);assert.equal(incident.noRecurrenceConfirmed,false);assert.equal(incident.preChangeApprovalScopeConfirmed,false);
 assert.equal(incident.referenceFx.observationDate,'2026-11-20');assert.ok(Math.abs(incident.referenceFx.dailyImpactUsdApprox-incident.reportedDailyImpactKrw/incident.referenceFx.krwPerUsd)<1);
});
