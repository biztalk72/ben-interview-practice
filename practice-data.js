import {answerFor} from './answer-state.js?v=20261127-1';
export function questionEnglish(card){return card.questionEn||card.title;}
export function orderedQuestions(cards,answers){return cards.filter(c=>answers[c.id]).sort((a,b)=>(a.ceoOrder|| (a.openingOrder?100+a.openingOrder:1000))-(b.ceoOrder|| (b.openingOrder?100+b.openingOrder:1000)));}
export function englishDialogue(card,base,record={}){
 const pair=answerFor(base,record);if(pair.enStale)return [];
 const items=[{text:questionEnglish(card),kind:'질문'},{text:pair.en,kind:'답변'}];
 for(const f of base.followups||[])items.push({text:f.questionEn,kind:'후속 질문'},{text:f.en,kind:'후속 답변'});
 return items.filter(x=>x.text?.trim()).map(x=>({...x,lang:'en-US',cardId:card.id,title:questionEnglish(card)}));
}
export function englishPlaylist(cards,answers,records={}){
 const questions=orderedQuestions(cards,answers);let skipped=0,count=0;const items=[];
 for(const card of questions){const dialogue=englishDialogue(card,answers[card.id],records[card.id]);if(!dialogue.length){skipped++;continue;}count++;items.push(...dialogue.map(x=>({...x,cardNumber:count})));}
 return {items,count,skipped};
}
export function speechChunks(items){
 const result=[];
 for(const item of items){
  // Tokenize on whitespace so decimal points, abbreviations and version numbers are never discarded.
  let buffer='';
  for(const word of item.text.trim().split(/\s+/)){
   if(!word)continue;
   if(buffer.length+word.length>190&&buffer){result.push({...item,text:buffer.trim()});buffer='';}
   buffer+=word+' ';
  }
  if(buffer.trim())result.push({...item,text:buffer.trim()});
 }
 return result;
}
