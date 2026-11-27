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
test('full English playlist contains 152 unique cards and all 204 follow-up pairs in question-answer order',()=>{
 const p=englishPlaylist(cards,answers);assert.equal(p.count,152);assert.equal(p.skipped,0);assert.equal(new Set(p.items.map(x=>x.cardId)).size,152);assert.equal(p.items.length,152*2+204*2);assert.equal(p.items[0].cardId,'CEO1');assert.equal(p.items[0].kind,'질문');assert.equal(p.items[1].kind,'답변');assert.equal(p.items[2].kind,'후속 질문');assert.equal(p.items[3].kind,'후속 답변');assert.ok(p.items.every(x=>x.lang==='en-US'&&!/[가-힣]/.test(x.text)));
});
test('playlist uses latest English edits and explicitly counts outdated English exclusions',()=>{
 const p=englishPlaylist(cards,answers,{HR1:{answerEn:'My latest answer',syncFrom:'en'},HR7:{answerKo:'수정',syncFrom:'ko'}});assert.equal(p.skipped,1);assert.equal(p.count,151);assert.equal(p.items.find(x=>x.cardId==='HR1'&&x.kind==='답변').text,'My latest answer');assert.ok(p.items.every(x=>x.cardId!=='HR7'));
});
test('current-card dialogue and chunking retain follow-ups, every word and card metadata',()=>{
 const c=cards.find(c=>c.id==='HR8');const entries=englishDialogue(c,answers[c.id]);assert.equal(entries.length,8);const chunks=speechChunks(entries);assert.ok(chunks.length>entries.length);assert.ok(chunks.every(x=>x.cardId===c.id&&x.text.length<=190));assert.equal(chunks.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim(),entries.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim());
});

test('CEO-only playlist contains 44 ordered question cards, 89 bilingual follow-ups and cue cards',()=>{
 const ceo=cards.filter(c=>c.group==='ceo');assert.equal(ceo.length,44);assert.deepEqual(ceo.map(c=>c.ceoOrder).sort((a,b)=>a-b),Array.from({length:44},(_,i)=>i+1));
 const playlist=englishPlaylist(ceo,answers);assert.equal(playlist.count,44);assert.equal(playlist.items.length,44*2+89*2);assert.ok(playlist.items.every(x=>x.cardId.startsWith('CEO')));
 for(const card of ceo){assert.ok(card.body.includes('**큐카드:**'),card.id);assert.equal(answers[card.id].followups.length,card.id==='CEO21'?3:2);assert.ok(card.questionKo.length>8);}
 assert.equal(cards.filter(c=>c.group==='ceo-guide').length,4);
});

test('candidate incident keeps daily impact distinct from cumulative or avoided loss',()=>{
 const incident=answers.CEO21.evidence;assert.equal(incident.approximateOutageDays,4);assert.equal(incident.reportedDailyImpactKrw,10000000000);assert.equal(incident.totalLossKrw,null);assert.equal(incident.avoidedLossKrw,null);assert.equal(incident.noRecurrenceConfirmed,false);assert.equal(incident.preChangeApprovalScopeConfirmed,false);
 assert.equal(incident.referenceFx.observationDate,'2026-11-20');assert.ok(Math.abs(incident.referenceFx.dailyImpactUsdApprox-incident.reportedDailyImpactKrw/incident.referenceFx.krwPerUsd)<1);
});

test('full playlist speech preserves every word, including decimal business figures',()=>{
 const items=englishPlaylist(cards,answers).items,chunks=speechChunks(items);const normalize=x=>x.replace(/\s+/g,' ').trim();
 assert.equal(normalize(chunks.map(x=>x.text).join(' ')),normalize(items.map(x=>x.text).join(' ')));
 const incident=speechChunks(englishDialogue(cards.find(c=>c.id==='CEO21'),answers.CEO21));assert.ok(incident.some(x=>x.text.includes('7.45 million')));
});
test('speech preserves decimals, abbreviations and versions together with card metadata',()=>{
 const text='Dr. Lee reviewed USD 7.45 million at 1,342.41 KRW per dollar. Version v1.2.3 processed 98.5% successfully.';
 const chunks=speechChunks([{text,cardId:'number-test',lang:'en-US'}]);assert.equal(chunks.map(x=>x.text).join(' '),text);assert.ok(chunks.every(x=>x.cardId==='number-test'));
});

test('CEO technical tracks are complete and every new question has bilingual deep follow-ups',()=>{
 const ben=cards.filter(c=>c.ceoTrack==='ben-technical'),projects=cards.filter(c=>c.ceoTrack==='project-technical');
 assert.deepEqual(ben.map(c=>c.id),Array.from({length:12},(_,i)=>`CEO${25+i}`));
 assert.deepEqual(projects.map(c=>c.id),Array.from({length:8},(_,i)=>`CEO${37+i}`));
 for(const c of [...ben,...projects]){const a=answers[c.id];assert.ok(c.sourceNote);assert.ok(c.body.includes('**큐카드:**'));assert.equal(a.followups.length,2);assert.ok(a.en.length>350&&a.ko.length>180);}
 assert.match(answers.CEO41.en,/I would consider adaptation/);assert.match(answers.CEO41.note,/미확인/);assert.match(answers.CEO42.en,/reference deployment/);assert.match(answers.CEO43.en,/not a claim of formal mathematical proof/);
 assert.match(answers.CEO44.en,/conversational history from durable task state/);
});
