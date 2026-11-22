let pipeline=null,loadingDirection=null;
let chain=Promise.resolve(),newestToken=0;
const MODELS={
 'ko-en':{id:'Xenova/opus-mt-ko-en',revision:'d9fa1ac6008242100fecb4fff9b0a5917a1be81f'},
 'en-ko':{id:'noticemkjung/opus-mt-tc-big-en-ko-ONNX',revision:'aea67600956847d47609f96b364f33a734007d50'}
};
async function load(direction){
 if(pipeline&&loadingDirection===direction)return pipeline;
 if(pipeline){await pipeline.dispose();pipeline=null;}
 loadingDirection=direction;
 const {pipeline:createPipeline,env,MarianTokenizer,AutoModelForSeq2SeqLM,TranslationPipeline}=await import('./vendor/transformers.min.js');
 env.allowLocalModels=false;env.useBrowserCache=true;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
 env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
 const model=MODELS[direction];if(!model)throw Error('지원하지 않는 번역 방향입니다.');
 const options={device:'wasm',dtype:'q8',revision:model.revision,progress_callback:p=>self.postMessage({type:'progress',direction,file:p.file||'',progress:p.progress,status:p.status})};
 if(direction==='en-ko'){
  // This ONNX conversion omits tokenizer assets. Use the original Helsinki SentencePiece scores and vocabulary, with EOS.
  const [data,config]=await Promise.all(['en-ko-tokenizer.json','en-ko-tokenizer-config.json'].map(async file=>{const r=await fetch(new URL('./vendor/'+file,import.meta.url));if(!r.ok)throw Error('영한 토크나이저 로딩 실패');return r.json();}));
  const tokenizer=new MarianTokenizer(data,config);
  const decoder=new MarianTokenizer(await (await fetch(new URL('./vendor/en-ko-decoder.json',import.meta.url))).json(),config);
  tokenizer.batch_decode=decoder.batch_decode.bind(decoder);tokenizer.decode=decoder.decode.bind(decoder);
  const network=await AutoModelForSeq2SeqLM.from_pretrained(model.id,options);
  pipeline=new TranslationPipeline({task:'translation',model:network,tokenizer});
 }else pipeline=await createPipeline('translation',model.id,options);
 return pipeline;
}
self.onmessage=event=>{
 const m=event.data;if(m.type==='cancel'){newestToken=m.token;return;}
 if(!['init','translate'].includes(m.type))return;
 if(m.type==='translate')newestToken=m.token;
 chain=chain.catch(()=>{}).then(async()=>{
  const {requestId,direction}=m;
  try{
   if(m.type==='translate'&&m.token!==newestToken){self.postMessage({type:'canceled',requestId});return;}
   const translate=await load(direction);
   if(m.type==='init'){self.postMessage({type:'ready',requestId,direction});return;}
   const results=[];
   for(let i=0;i<m.paragraphs.length;i++){
    if(m.token!==newestToken){self.postMessage({type:'canceled',requestId});return;}
    const text=m.paragraphs[i];
    if(direction==='ko-en'&&!/[가-힣]/.test(text)){results.push(text);continue;}
    const output=await translate(text,{max_new_tokens:128,num_beams:1,repetition_penalty:1.05});
    const result=output?.[0]?.translation_text;if(typeof result!=='string'||!result.trim())throw Error('빈 번역 결과입니다.');results.push(result.trim());
    self.postMessage({type:'translated-progress',requestId,done:i+1,total:m.paragraphs.length,direction});
   }
   self.postMessage({type:'result',requestId,direction,text:results.join('\n\n')});
  }catch(error){self.postMessage({type:'error',requestId,direction,error:error.message});}
 });
};
