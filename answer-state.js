export function answerFor(base,record={}){
 const ko=typeof record.answerKo==='string'?record.answerKo:base.ko;
 const en=typeof record.answerEn==='string'?record.answerEn:base.en;
 const source=typeof record.enSourceKo==='string'?record.enSourceKo:base.ko;
 return {ko,en,stale:ko!==source,kind:record.enKind||'model',source};
}
export function rememberAnswer(record,base){
 const pair=answerFor(base,record);
 const history=Array.isArray(record.answerHistory)?record.answerHistory:[];
 const previous=history.at(-1);
 if(previous?.ko===pair.ko&&previous?.en===pair.en)return;
 history.push({ko:pair.ko,en:pair.en,source:pair.source,kind:pair.kind,time:new Date().toISOString()});
 record.answerHistory=history.slice(-8);
}
export function editKorean(record,base,text){
 if(typeof record.answerKo!=='string')rememberAnswer(record,base);
 record.answerKo=text;record.answerRevision=(record.answerRevision||0)+1;
 delete record.translationError;
 return record.answerRevision;
}
export function editEnglish(record,base,text){
 record.answerEn=text;record.enSourceKo=answerFor(base,record).ko;record.enKind='manual';
 record.enEditRevision=(record.enEditRevision||0)+1;delete record.translationError;
}
export function applyTranslation(record,base,source,english,enEditRevision){
 if(answerFor(base,record).ko!==source||(record.enEditRevision||0)!==enEditRevision)return false;
 rememberAnswer(record,base);record.answerEn=english;record.enSourceKo=source;record.enKind='auto';delete record.translationError;return true;
}
export function cleanRecord(input={}){
 const output={favorite:!!input.favorite,done:!!input.done,note:typeof input.note==='string'?input.note.slice(0,10000):''};
 for(const key of ['answerKo','answerEn','enSourceKo'])if(typeof input[key]==='string')output[key]=input[key].slice(0,10000);
 if(['model','auto','manual'].includes(input.enKind))output.enKind=input.enKind;
 output.enEditRevision=Number.isSafeInteger(input.enEditRevision)?input.enEditRevision:0;
 if(Array.isArray(input.answerHistory))output.answerHistory=input.answerHistory.slice(-8).filter(x=>x&&typeof x.ko==='string'&&typeof x.en==='string').map(x=>({ko:x.ko.slice(0,10000),en:x.en.slice(0,10000),source:typeof x.source==='string'?x.source.slice(0,10000):x.ko.slice(0,10000),kind:['model','auto','manual'].includes(x.kind)?x.kind:'manual',time:typeof x.time==='string'?x.time:''}));
 return output;
}
