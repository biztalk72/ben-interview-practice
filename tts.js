export const KOKORO_VOICES=[
 {id:'af_heart',name:'Heart · 미국 여성',lang:'en-US'},
 {id:'af_bella',name:'Bella · 미국 여성',lang:'en-US'},
 {id:'am_michael',name:'Michael · 미국 남성',lang:'en-US'},
 {id:'am_fenrir',name:'Fenrir · 미국 남성',lang:'en-US'},
 {id:'bf_emma',name:'Emma · 영국 여성',lang:'en-GB'},
 {id:'bm_george',name:'George · 영국 남성',lang:'en-GB'}
];
export function chooseBrowserVoice(voices,lang,preferred){
 const matches=voices.filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));
 const exact=matches.find(v=>v.voiceURI===preferred);if(exact)return exact;
 const normal=matches.filter(v=>!/bad news|good news|bahh|bells|boing|bubbles|cellos|organ|jester|trinoids|wobble|whisper|zarvox|superstar|grandpa|grandma/i.test(v.name));
 const pool=normal.length?normal:matches;
 return pool.find(v=>/natural|neural|enhanced|premium|google us english|aria|jenny|guy/i.test(v.name))||pool.find(v=>lang.startsWith('ko')?/yuna|sora/i.test(v.name):/samantha|daniel|karen/i.test(v.name))||pool.find(v=>v.default)||pool[0]||null;
}
export class KokoroPlayer{
 constructor(onStatus=()=>{}){this.onStatus=onStatus;this.worker=null;this.context=null;this.pending=new Map();this.counter=0;this.playToken=0;this.playback=null;this.source=null;this.paused=false;this.ready=false;this.cache=new Map();}
 unlock(){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw Error('이 브라우저는 신경망 음성 재생을 지원하지 않습니다.');if(!this.context)this.context=new Audio({latencyHint:'interactive'});return this.context.resume();}
 ensureWorker(){
  if(this.worker)return;
  this.worker=new Worker(new URL('./tts-worker.js?v=20261127-3',import.meta.url),{type:'module'});
  this.worker.onerror=e=>{const error=Error(e.message||'음성 엔진 로딩 실패');for(const p of this.pending.values()){clearTimeout(p.timeout);p.reject(error);}this.pending.clear();this.worker?.terminate();this.worker=null;this.ready=false;};
  this.worker.onmessage=e=>{
   const m=e.data;
   if(m.type==='progress'){if(m.status==='progress')this.onStatus(`Kokoro 음성 모델 다운로드 · ${Math.round(m.progress||0)}%`);return;}
   if(m.type==='ready'){this.ready=true;this.onStatus('Kokoro 음성 생성 중…');return;}
   const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.timeout);
   if(m.type==='error')p.reject(Error(m.error));
   else p.resolve({samples:new Float32Array(m.samples),sampleRate:m.sampleRate});
  };
 }
 async generate(text,voice,speed){
  const key=JSON.stringify([text,voice,speed]);if(this.cache.has(key))return this.cache.get(key);
  this.ensureWorker();this.onStatus(this.ready?'Kokoro 음성 생성 중…':'Kokoro 음성 엔진 준비 중 · 첫 다운로드 약 100MB');
  const clip=await new Promise((resolve,reject)=>{const id=++this.counter;const timeout=setTimeout(()=>{this.pending.delete(id);reject(Error('음성 생성 시간이 초과되었습니다. 다시 시도하거나 브라우저 음성을 선택하세요.'));},300000);this.pending.set(id,{resolve,reject,timeout});this.worker.postMessage({type:'synthesize',id,text,voice,speed});});
  this.cache.set(key,clip);if(this.cache.size>8)this.cache.delete(this.cache.keys().next().value);return clip;
 }
 async speak(text,{voice='af_heart',speed=1,onstart=()=>{},onend=()=>{}}={}){
  const token=++this.playToken;this.paused=false;await this.unlock();
  const clip=await this.generate(text,voice,speed);
  if(token!==this.playToken)throw new DOMException('재생이 중지되었습니다.','AbortError');
  const buffer=this.context.createBuffer(1,clip.samples.length,clip.sampleRate);buffer.copyToChannel(clip.samples,0);
  this.playback={token,buffer,offset:0,onstart,onend};if(!this.paused)this.begin();
 }
 begin(){
  const p=this.playback;if(!p||p.token!==this.playToken||this.source)return;
  const source=this.context.createBufferSource();source.buffer=p.buffer;source.connect(this.context.destination);this.source=source;p.startedAt=this.context.currentTime;
  source.onended=()=>{if(this.source!==source||p.token!==this.playToken)return;this.source=null;this.playback=null;p.onend();};
  source.start(0,p.offset);p.onstart();
 }
 pause(){this.paused=true;const p=this.playback;if(p&&this.source){p.offset=Math.min(p.buffer.duration,p.offset+this.context.currentTime-p.startedAt);this.source.onended=null;this.source.stop();this.source=null;}}
 resume(){this.paused=false;this.context?.resume();if(this.playback&&this.playback.offset>=this.playback.buffer.duration){const p=this.playback;this.playback=null;p.onend();return;}this.begin();}
 stop(){this.playToken++;this.paused=false;if(this.source){this.source.onended=null;this.source.stop();this.source=null;}this.playback=null;}
}
