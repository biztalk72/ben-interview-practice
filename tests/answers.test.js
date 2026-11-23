import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerFor,editKorean,editEnglish,applyTranslation,applyPairedTranslation,rememberAnswer,cleanRecord} from '../answer-state.js';
import {splitForTranslation} from '../translation.js';
const base={ko:'저는 엔지니어링 팀을 이끌었습니다.',en:'I led an engineering team.'};
test('every interview question has a substantive paired model answer',()=>{
 const cards=JSON.parse(readFileSync(new URL('../content.json',import.meta.url))).cards;
 const answers=JSON.parse(readFileSync(new URL('../answers.json',import.meta.url))).answers;
 const questions=cards.filter(c=>['hr','stage','tech','pressure','star'].includes(c.group)&&c.id!=='HR0');
 assert.equal(questions.length,94);
 for(const c of questions){assert.ok(answers[c.id]?.ko.length>60,c.id);assert.ok(answers[c.id]?.en.length>40,c.id);}
});
test('baseline is a synchronized model pair without record changes',()=>{const r={note:'keep'};assert.deepEqual(answerFor(base,r),{ko:base.ko,en:base.en,stale:false,kind:'model',source:base.ko,dirtyLanguage:null,enStale:false,koStale:false});assert.deepEqual(r,{note:'keep'});});
test('editing Korean preserves English and marks it outdated',()=>{const r={note:'keep',favorite:true};editKorean(r,base,'수정한 한국어');const p=answerFor(base,r);assert.equal(p.ko,'수정한 한국어');assert.equal(p.en,base.en);assert.equal(p.stale,true);assert.equal(r.note,'keep');assert.equal(r.favorite,true);assert.equal(r.answerHistory[0].ko,base.ko);});
test('older Korean translation cannot overwrite a newer edit',()=>{const r={};editKorean(r,base,'첫 번째');editKorean(r,base,'두 번째');assert.equal(applyTranslation(r,base,'첫 번째','First',0),false);assert.equal(answerFor(base,r).en,base.en);});
test('English manually edited during translation is preserved',()=>{const r={};editKorean(r,base,'새 한국어');editEnglish(r,base,'My revised English.');assert.equal(applyTranslation(r,base,'새 한국어','Late machine result',0),false);assert.equal(answerFor(base,r).en,'My revised English.');assert.equal(answerFor(base,r).koStale,true);});
test('a current translation updates only its own paired answer',()=>{const r={note:'memo'};editKorean(r,base,'새 한국어');assert.equal(applyTranslation(r,base,'새 한국어','New English',0),true);assert.equal(answerFor(base,r).stale,false);assert.equal(answerFor(base,r).kind,'auto');assert.equal(r.note,'memo');});
test('empty Korean stays empty and does not silently fall back to model',()=>{const r={};editKorean(r,base,'');assert.equal(answerFor(base,r).ko,'');assert.equal(answerFor(base,r).stale,true);});
test('history is bounded and retains source and language fields',()=>{const r={};for(let i=0;i<20;i++){editKorean(r,base,'한국어 '+i);rememberAnswer(r,base);}assert.equal(r.answerHistory.length,8);assert.ok(r.answerHistory.every(x=>typeof x.source==='string'&&typeof x.en==='string'));});
test('old backup records remain compatible',()=>{assert.deepEqual(cleanRecord({note:'legacy',favorite:true}),{note:'legacy',favorite:true,done:false,enEditRevision:0,editRevision:0});});
test('bilingual backup round trip preserves edits and revision history',()=>{const r={note:'keep',done:true};editKorean(r,base,'수정');applyTranslation(r,base,'수정','Revision',0);const imported=cleanRecord(JSON.parse(JSON.stringify(r)));assert.equal(answerFor(base,imported).en,'Revision');assert.equal(answerFor(base,imported).stale,false);assert.equal(imported.note,'keep');assert.ok(imported.answerHistory.length);});
test('malformed backup fields and unknown executable properties are discarded',()=>{const r=cleanRecord({answerKo:{bad:1},answerEn:'a'.repeat(20000),answerHistory:[null,{}, {ko:'가',en:'A'}],script:'bad'});assert.equal(r.answerKo,undefined);assert.equal(r.answerEn.length,10000);assert.equal(r.answerHistory.length,1);assert.equal(r.script,undefined);});
test('translation chunks preserve every word and are bounded for the model context',()=>{const source=('저는 실제 고객 운영에 AI 기술을 적용했습니다. 조직과 고객의 요구를 명확하게 조율합니다. ').repeat(10);const parts=splitForTranslation(source);assert.ok(parts.length>1);assert.ok(parts.every(p=>p.length<=100));assert.equal(parts.join(' ').replace(/\s+/g,' ').trim(),source.replace(/\s+/g,' ').trim());});

test('English edits regenerate Korean and finish without a reverse loop',()=>{
 const r={};editEnglish(r,base,'I build reliable teams.');const revision=r.editRevision;
 assert.equal(answerFor(base,r).koStale,true);
 assert.equal(applyPairedTranslation(r,base,{from:'en',source:r.answerEn,text:'저는 신뢰할 수 있는 팀을 만듭니다.',revision}),true);
 const pair=answerFor(base,r);assert.equal(pair.stale,false);assert.equal(pair.en,'I build reliable teams.');assert.equal(pair.ko,'저는 신뢰할 수 있는 팀을 만듭니다.');assert.equal(r.editRevision,revision);
 assert.equal(applyPairedTranslation(r,base,{from:'en',source:r.answerEn,text:'Duplicate',revision}),false);
});
test('alternating language edits reject every earlier result, even same-source ABA edits',()=>{
 const r={};editEnglish(r,base,'First');const revision=r.editRevision;
 editKorean(r,base,'직접 수정');editEnglish(r,base,'First');
 assert.equal(applyPairedTranslation(r,base,{from:'en',source:'First',text:'늦은 번역',revision}),false);
 assert.equal(answerFor(base,r).ko,'직접 수정');
});
test('pending English-source translation survives backup/import',()=>{
 const r={};editEnglish(r,base,'New English');const imported=cleanRecord(JSON.parse(JSON.stringify(r)));
 assert.equal(answerFor(base,imported).dirtyLanguage,'en');assert.equal(imported.editRevision,r.editRevision);
});
test('legacy manual English becomes the source without overwriting it after a model-answer update',()=>{
 const r={answerEn:'My own English',enKind:'manual',enSourceKo:'이전 모범 답안'};
 assert.equal(answerFor(base,r).dirtyLanguage,'en');assert.equal(answerFor(base,r).en,'My own English');
});
test('a later legacy Korean edit still takes priority over earlier manual English',()=>{
 const r={answerKo:'가장 최근 한국어',answerEn:'Earlier English',enKind:'manual',enSourceKo:'이전 한국어'};
 assert.equal(answerFor(base,r).dirtyLanguage,'ko');
});
