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
 constructor(onStatus=()=>{}){this.onStatus=onStatus;this.worker=null;this.ready=false;this.direction='';this.native=new Map();this.initializing=new Map();this.pending=new Map();this.counter=0;this.requestCounter=0;this.engine='';}
 async init(direction='ko-en'){
  if(!['ko-en','en-ko'].includes(direction))throw Error('지원하지 않는 번역 방향입니다.');
  if(this.native.has(direction)||(this.ready&&this.direction===direction))return;
  if(this.initializing.has(direction))return this.initializing.get(direction);
  const promise=this.initialize(direction).finally(()=>this.initializing.delete(direction));this.initializing.set(direction,promise);return promise;
 }
 async initialize(direction){
  const [sourceLanguage,targetLanguage]=direction.split('-');
  if(globalThis.Translator){try{
   const availability=await globalThis.Translator.availability({sourceLanguage,targetLanguage});
   if(availability!=='unavailable'){
    this.onStatus('loading',`${sourceLanguage==='en'?'영어 → 한국어':'한국어 → 영어'} 언어팩 준비 중…`);
    const native=await globalThis.Translator.create({sourceLanguage,targetLanguage,monitor:monitor=>monitor.addEventListener('downloadprogress',e=>this.onStatus('loading',`언어팩 다운로드 ${Math.round(e.loaded*100)}%`))});
    this.native.set(direction,native);this.ready=true;this.direction=direction;this.engine='browser';this.onStatus('ready','양방향 번역 준비 완료');return;
   }
  }catch(error){console.info('Using local WASM translation.',error.name);}}
  this.onStatus('loading',`${sourceLanguage==='en'?'영어 → 한국어':'한국어 → 영어'} 기기 내 모델 준비 중…`);
  this.ensureWorker();await this.workerRequest({type:'init',direction},480000);this.ready=true;this.direction=direction;this.engine='local-wasm';this.onStatus('ready','양방향 번역 준비 완료');
 }
 ensureWorker(){
  if(this.worker)return;
  this.worker=new Worker(new URL('./translation-worker.js?v=20261123-3',import.meta.url),{type:'module'});
  this.worker.onerror=e=>{const err=Error(e.message||'번역 실행기 오류');for(const p of this.pending.values()){clearTimeout(p.timeout);p.reject(err);}this.pending.clear();this.worker?.terminate();this.worker=null;this.ready=false;this.direction='';this.onStatus('error',err.message);};
  this.worker.onmessage=e=>{
   const m=e.data;
   if(m.type==='progress'&&m.status==='progress'){this.onStatus('loading',`모델 다운로드 · ${m.file.split('/').pop()} ${Math.round(m.progress||0)}%`);return;}
   if(m.type==='translated-progress'){this.onStatus('translating',`${m.direction==='en-ko'?'한국어':'영어'} 갱신 중 · ${m.done}/${m.total}`);return;}
   const p=this.pending.get(m.requestId);if(!p)return;this.pending.delete(m.requestId);clearTimeout(p.timeout);
   if(m.type==='ready')p.resolve();else if(m.type==='result')p.resolve(m.text);else p.reject(m.type==='canceled'?new DOMException('최신 수정으로 대체됨','AbortError'):Error(m.error));
  };
 }
 workerRequest(message,timeoutMs){
  const requestId=++this.requestCounter;
  return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{this.pending.delete(requestId);reject(Error('번역 시간이 초과되었습니다. 연결 상태를 확인하고 다시 시도하세요.'));},timeoutMs);this.pending.set(requestId,{resolve,reject,timeout,type:message.type});this.worker.postMessage({...message,requestId});});
 }
 cancel(){const token=++this.counter;this.worker?.postMessage({type:'cancel',token});for(const[id,p]of this.pending){if(p.type==='translate'){clearTimeout(p.timeout);p.reject(new DOMException('최신 수정으로 대체됨','AbortError'));this.pending.delete(id);}}}
 async translate(text,direction='ko-en'){
  this.cancel();const token=this.counter;await this.init(direction);if(token!==this.counter)throw new DOMException('최신 수정으로 대체됨','AbortError');
  this.onStatus('translating',direction==='en-ko'?'영어 수정 내용을 한국어에 반영하는 중…':'한국어 수정 내용을 영어에 반영하는 중…');
  let result;
  if(this.native.has(direction))result=await this.native.get(direction).translate(text);
  else result=await this.workerRequest({type:'translate',direction,token,paragraphs:splitForTranslation(text)},240000);
  if(token!==this.counter)throw new DOMException('최신 수정으로 대체됨','AbortError');return result;
 }
}
