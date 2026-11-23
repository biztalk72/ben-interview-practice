export function answerFor(base,record={}){
 const ko=typeof record.answerKo==='string'?record.answerKo:base.ko;
 const en=typeof record.answerEn==='string'?record.answerEn:base.en;
 const source=typeof record.enSourceKo==='string'?record.enSourceKo:base.ko;
 const dirtyLanguage=['ko','en'].includes(record.syncFrom)?record.syncFrom:record.syncFrom===null?null:ko!==source&&typeof record.answerKo==='string'?'ko':record.enKind==='manual'&&typeof record.answerEn==='string'?'en':ko!==source?'ko':null;
 return {ko,en,stale:!!dirtyLanguage,kind:record.enKind||'model',source,dirtyLanguage,enStale:dirtyLanguage==='ko',koStale:dirtyLanguage==='en'};
}
export function rememberAnswer(record,base){
 const pair=answerFor(base,record);const history=Array.isArray(record.answerHistory)?record.answerHistory:[];const previous=history.at(-1);
 if(previous?.ko===pair.ko&&previous?.en===pair.en&&previous?.dirtyLanguage===pair.dirtyLanguage)return;
 history.push({ko:pair.ko,en:pair.en,source:pair.source,kind:pair.kind,dirtyLanguage:pair.dirtyLanguage,time:new Date().toISOString()});record.answerHistory=history.slice(-8);
}
function edited(record,language){record.syncFrom=language;record.lastEditedLanguage=language;record.editRevision=(record.editRevision||0)+1;delete record.translationError;}
export function editKorean(record,base,text){
 if(typeof record.answerKo!=='string')rememberAnswer(record,base);
 record.answerKo=text;record.answerRevision=(record.answerRevision||0)+1;edited(record,'ko');return record.editRevision;
}
export function editEnglish(record,base,text){
 if(typeof record.answerEn!=='string')rememberAnswer(record,base);
 record.answerEn=text;record.enKind='manual';record.enEditRevision=(record.enEditRevision||0)+1;edited(record,'en');return record.editRevision;
}
export function applyPairedTranslation(record,base,{from,source,text,revision}){
 if(!['ko','en'].includes(from)||(record.editRevision||0)!==revision||answerFor(base,record)[from]!==source||answerFor(base,record).dirtyLanguage!==from)return false;
 rememberAnswer(record,base);
 if(from==='ko'){record.answerEn=text;record.enSourceKo=source;record.enKind='auto';}
 else {record.answerKo=text;record.enSourceKo=text;record.enKind='manual';}
 record.syncFrom=null;record.lastTranslationFrom=from;delete record.translationError;return true;
}
// Legacy KO→EN API, retained for old backup consumers/tests.
export function applyTranslation(record,base,source,english,enEditRevision){
 if(answerFor(base,record).ko!==source||(record.enEditRevision||0)!==enEditRevision||answerFor(base,record).dirtyLanguage==='en')return false;
 return applyPairedTranslation(record,base,{from:'ko',source,text:english,revision:record.editRevision||0});
}
export function cleanRecord(input={}){
 const output={favorite:!!input.favorite,done:!!input.done,note:typeof input.note==='string'?input.note.slice(0,10000):''};
 for(const key of ['answerKo','answerEn','enSourceKo'])if(typeof input[key]==='string')output[key]=input[key].slice(0,10000);
 if(['model','auto','manual'].includes(input.enKind))output.enKind=input.enKind;
 for(const key of ['syncFrom','lastEditedLanguage','lastTranslationFrom'])if(['ko','en',null].includes(input[key]))output[key]=input[key];
 for(const key of ['enEditRevision','editRevision'])output[key]=Number.isSafeInteger(input[key])&&input[key]>=0?input[key]:0;
 if(Array.isArray(input.answerHistory))output.answerHistory=input.answerHistory.slice(-8).filter(x=>x&&typeof x.ko==='string'&&typeof x.en==='string').map(x=>({ko:x.ko.slice(0,10000),en:x.en.slice(0,10000),source:typeof x.source==='string'?x.source.slice(0,10000):x.ko.slice(0,10000),kind:['model','auto','manual'].includes(x.kind)?x.kind:'manual',dirtyLanguage:['ko','en'].includes(x.dirtyLanguage)?x.dirtyLanguage:null,time:typeof x.time==='string'?x.time:''}));
 return output;
}
