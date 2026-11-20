// The model runs locally. Only static model/runtime downloads leave this worker.
let pipelinePromise;
let chain=Promise.resolve();
let newestRequest=0;
const MODEL='Xenova/opus-mt-ko-en';
const REVISION='d9fa1ac6008242100fecb4fff9b0a5917a1be81f';
async function load(){
 if(!pipelinePromise){
  pipelinePromise=(async()=>{
   const {pipeline,env}=await import('./vendor/transformers.min.js');
   env.allowLocalModels=false;
   env.useBrowserCache=true;
   env.backends.onnx.wasm.numThreads=1;
   env.backends.onnx.wasm.proxy=false;
   env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
   return pipeline('translation',MODEL,{device:'wasm',dtype:'q8',revision:REVISION,progress_callback:p=>self.postMessage({type:'progress',file:p.file||'',progress:p.progress,status:p.status})});
  })().catch(error=>{pipelinePromise=null;throw error;});
 }
 return pipelinePromise;
}
self.onmessage=event=>{
 const message=event.data;
 if(message.type==='cancel'){newestRequest=message.requestId;return;}
 if(message.type==='init'){
  load().then(()=>self.postMessage({type:'ready',engine:'local-wasm'})).catch(error=>self.postMessage({type:'init-error',error:error.message}));
  return;
 }
 if(message.type!=='translate')return;
 newestRequest=message.requestId;
 chain=chain.catch(()=>{}).then(async()=>{
  const {requestId,paragraphs}=message;
  if(requestId!==newestRequest){self.postMessage({type:'canceled',requestId});return;}
  try{
   const translate=await load();const results=[];
   for(let i=0;i<paragraphs.length;i++){
    if(requestId!==newestRequest){self.postMessage({type:'canceled',requestId});return;}
    const text=paragraphs[i];
    if(!/[가-힣]/.test(text)){results.push(text);continue;}
    const output=await translate(text,{max_new_tokens:256,num_beams:2,repetition_penalty:1.05});
    const result=output?.[0]?.translation_text;
    if(typeof result!=='string'||!result.trim())throw Error('번역 모델이 빈 결과를 반환했습니다.');
    results.push(result.trim());
    self.postMessage({type:'translated-progress',requestId,done:i+1,total:paragraphs.length});
   }
   self.postMessage({type:'result',requestId,text:results.join('\n\n')});
  }catch(error){self.postMessage({type:'error',requestId,error:error.message});}
 });
};
