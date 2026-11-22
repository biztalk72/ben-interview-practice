let modelPromise,chain=Promise.resolve();
async function load(){
 if(!modelPromise)modelPromise=(async()=>{
  const {KokoroTTS,env}=await import('./vendor/kokoro.web.js');
  env.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/';
  return KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'wasm',progress_callback:p=>self.postMessage({type:'progress',status:p.status,file:p.file||'',progress:p.progress})});
 })().catch(error=>{modelPromise=null;throw error;});
 return modelPromise;
}
self.onmessage=event=>{
 const m=event.data;if(m.type!=='synthesize')return;
 chain=chain.catch(()=>{}).then(async()=>{
  try{
   const model=await load();self.postMessage({type:'ready'});
   const audio=await model.generate(m.text,{voice:m.voice||'af_heart',speed:m.speed||1});
   const samples=audio.audio.slice();
   if(!samples.length||!samples.every(Number.isFinite))throw Error('유효한 음성을 생성하지 못했습니다.');
   self.postMessage({type:'audio',id:m.id,samples:samples.buffer,sampleRate:audio.sampling_rate},[samples.buffer]);
  }catch(error){self.postMessage({type:'error',id:m.id,error:error.message});}
 });
};
