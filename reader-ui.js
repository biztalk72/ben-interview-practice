// Presentation-only chunks: preserve every word and keep decimal values intact.
export function answerParagraphs(text,limit=360){
 const sections=[];
 for(const paragraph of String(text).split(/\n\s*\n/u).filter(p=>p.trim())){
  let current='';
  for(const sentence of paragraph.trim().split(/(?<=[.!?。！？])\s+/u)){
   if(current&&current.length+sentence.length+1>limit){sections.push(current);current='';}
   current+=(current?' ':'')+sentence;
  }
  if(current)sections.push(current);
 }
 return sections;
}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function paragraphAccordions(text,language='en'){
 return answerParagraphs(text,language==='ko'?220:360).map((p,i)=>`<details class="paragraph-accordion" ${i===0?'open':''}><summary><span class="paragraph-number">${language==='ko'?'문단':'Part'} ${i+1}</span><span class="paragraph-preview">${escapeHTML(p.replace(/\s+/gu,' ').slice(0,language==='ko'?44:76))}${p.length>(language==='ko'?44:76)?'…':''}</span></summary><div class="paragraph-content"><p>${escapeHTML(p).replace(/\n/g,'<br>')}</p></div></details>`).join('');
}
