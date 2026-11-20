export function splitForTranslation(text){
 const result=[];
 for(const paragraph of text.trim().split(/\n\s*\n/).filter(Boolean)){
  // Keep inputs below the Marian model's 512-token context. Korean syllables can tokenize densely.
  const sentences=paragraph.match(/[^.!?。！？]+[.!?。！？]*(?:\s|$)|.+$/g)||[paragraph];
  let chunk='';
  for(const sentence of sentences){
   const clean=sentence.trim();
   if(clean.length<=100){
    if(chunk.length+clean.length+1>100&&chunk){result.push(chunk.trim());chunk='';}
    chunk+=clean+' ';continue;
   }
   if(chunk){result.push(chunk.trim());chunk='';}
   for(const word of clean.split(/\s+/)){
    if(chunk.length+word.length+1>100&&chunk){result.push(chunk.trim());chunk='';}
    if(word.length>100){if(chunk){result.push(chunk.trim());chunk='';}for(let i=0;i<word.length;i+=100)result.push(word.slice(i,i+100));}
    else chunk+=word+' ';
   }
  }
  if(chunk.trim())result.push(chunk.trim());
 }
 return result;
}
export class LocalTranslator{
 constructor(onStatus=()=>{}){this.onStatus=onStatus;this.worker=null;this.ready=false;this.pending=new Map();this.counter=0;this.initPromise=null;this.native=null;this.engine='';}
 async init(){
  if(this.ready)return;
  if(this.initPromise)return this.initPromise;
  this.initPromise=this.initialize().catch(error=>{this.initPromise=null;this.onStatus('error','자동번역 준비 실패 · 다시 시도할 수 있습니다.');throw error;});
  return this.initPromise;
 }
 async initialize(){
  if('Translator'in globalThis){
   try{
    const availability=await globalThis.Translator.availability({sourceLanguage:'ko',targetLanguage:'en'});
    if(availability!=='unavailable'){
     this.onStatus('loading','브라우저 번역 모델 준비 중…');
     this.native=await globalThis.Translator.create({sourceLanguage:'ko',targetLanguage:'en',monitor:monitor=>monitor.addEventListener('downloadprogress',event=>this.onStatus('loading',`언어팩 다운로드 ${Math.round(event.loaded*100)}%`))});
     this.ready=true;this.engine='browser';this.onStatus('ready','자동번역 준비 완료 · 이 기기에서 번역합니다.');return;
    }
   }catch(error){console.info('Built-in translation unavailable; using local WASM model.',error.name);}
  }
  this.onStatus('loading','기기 내 번역 모델 준비 중 · 첫 다운로드 약 150MB');
  this.worker=new Worker(new URL('./translation-worker.js',import.meta.url),{type:'module'});
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{this.worker?.terminate();this.worker=null;reject(Error('모델 준비 시간이 초과되었습니다. 연결 상태를 확인하고 다시 시도하세요.'));},480000);
   this.worker.onerror=event=>{clearTimeout(timeout);reject(Error(event.message||'번역 실행기를 불러오지 못했습니다.'));this.rejectPending(Error('번역 실행기가 중단되었습니다.'));this.ready=false;this.initPromise=null;};
   this.worker.onmessage=event=>{
    const m=event.data;
    if(m.type==='ready'){clearTimeout(timeout);this.ready=true;this.engine='local-wasm';this.onStatus('ready','자동번역 준비 완료 · 이 기기에서 번역합니다.');resolve();}
    else if(m.type==='init-error'){clearTimeout(timeout);this.worker?.terminate();this.worker=null;reject(Error(m.error));}
    else if(m.type==='progress'&&m.status==='progress')this.onStatus('loading',`모델 다운로드 · ${m.file.split('/').pop()} ${Math.round(m.progress||0)}%`);
    else if(m.type==='translated-progress')this.onStatus('translating',`영문 갱신 중 · ${m.done}/${m.total}`);
    else if(['result','error','canceled'].includes(m.type)){
     const pending=this.pending.get(m.requestId);if(!pending)return;this.pending.delete(m.requestId);clearTimeout(pending.timeout);
     if(m.type==='result')pending.resolve(m.text);else pending.reject(m.type==='canceled'?new DOMException('최신 수정으로 대체됨','AbortError'):Error(m.error));
    }
   };
   this.worker.postMessage({type:'init'});
  });
 }
 rejectPending(error){for(const p of this.pending.values()){clearTimeout(p.timeout);p.reject(error);}this.pending.clear();}
 cancel(){const requestId=++this.counter;this.worker?.postMessage({type:'cancel',requestId});this.rejectPending(new DOMException('최신 수정으로 대체됨','AbortError'));}
 async translate(text){
  await this.init();
  const requestId=++this.counter;
  this.rejectPending(new DOMException('최신 수정으로 대체됨','AbortError'));
  this.onStatus('translating','한국어 답안을 영어로 갱신하는 중…');
  if(this.native){const result=await this.native.translate(text);if(requestId!==this.counter)throw new DOMException('최신 수정으로 대체됨','AbortError');return result;}
  return new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{this.pending.delete(requestId);this.worker?.postMessage({type:'cancel',requestId:++this.counter});reject(Error('번역 시간이 초과되었습니다. 짧은 문장으로 나누거나 다시 시도하세요.'));},240000);
   this.pending.set(requestId,{resolve,reject,timeout});
   this.worker.postMessage({type:'translate',requestId,paragraphs:splitForTranslation(text)});
  });
 }
}
