import test from 'node:test';
import assert from 'node:assert/strict';
import {KokoroPlayer,chooseBrowserVoice} from '../tts.js';
const voice=name=>({name,lang:'en-US',voiceURI:name});
test('browser voice auto selection avoids novelty voices and honors user selection',()=>{
 const voices=[voice('Bad News'),voice('Samantha'),voice('Aria Natural')];
 assert.equal(chooseBrowserVoice(voices,'en-US','').name,'Aria Natural');
 assert.equal(chooseBrowserVoice(voices,'en-US','Samantha').name,'Samantha');
 assert.equal(chooseBrowserVoice(voices,'ko-KR',''),null);
});
function player(){
 const p=new KokoroPlayer();const sources=[];
 p.context={currentTime:0,destination:{},resume:async()=>{},createBuffer:(_,length,rate)=>({duration:length/rate,copyToChannel(){}}),createBufferSource:()=>{const s={connect(){},start(_,offset){this.offset=offset;},stop(){this.stopped=true;}};sources.push(s);return s;}};
 p.unlock=async()=>{};p.generate=async()=>({samples:new Float32Array(24000*3),sampleRate:24000});return {p,sources};
}
test('neural playback pauses at its offset, resumes and finishes exactly once',async()=>{
 const {p,sources}=player();let ended=0;
 await p.speak('Hello',{onend:()=>ended++});p.context.currentTime=1.2;p.pause();
 assert.equal(sources[0].stopped,true);assert.equal(ended,0);p.resume();
 assert.equal(sources[1].offset,1.2);sources[1].onended();assert.equal(ended,1);assert.equal(p.playback,null);
});
test('stopping during generation prevents late audio from starting',async()=>{
 const {p,sources}=player();let finish;p.generate=()=>new Promise(resolve=>finish=resolve);
 const playback=p.speak('Late');await Promise.resolve();p.stop();finish({samples:new Float32Array(24000),sampleRate:24000});
 await assert.rejects(playback,{name:'AbortError'});assert.equal(sources.length,0);
});
test('pause during model loading waits for a deliberate resume',async()=>{
 const {p,sources}=player();let finish;p.generate=()=>new Promise(resolve=>finish=resolve);
 const playback=p.speak('Loading');await Promise.resolve();p.pause();finish({samples:new Float32Array(24000),sampleRate:24000});await playback;
 assert.equal(sources.length,0);p.resume();assert.equal(sources.length,1);
});
