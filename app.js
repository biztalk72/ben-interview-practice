import { marked } from './vendor/marked.js';
import {englishDialogue,englishPlaylist,speechChunks,questionEnglish} from './practice-data.js?v=20261124-1';
import { LocalTranslator } from './translation.js?v=20261124-1';
import { KokoroPlayer, KOKORO_VOICES, chooseBrowserVoice } from './tts.js?v=20261124-1';
import { answerFor, editKorean, editEnglish, applyPairedTranslation, rememberAnswer, cleanRecord } from './answer-state.js?v=20261124-1';
const $ = id => document.getElementById(id);
const KEY = 'ben-practice-v1';
const groups = { early:'초반 라운드 · PDF 핵심 23문답',closing:'역질문 · 마무리', hr:'11/23 · HR Director', roadmap:'단계별 준비 지도', all:'전체 연습', stage:'5단계 인터뷰', tech:'ELM · 기술 심층', star:'STAR 경험 답변', pressure:'압박 질문', cue:'큐카드', guide:'준비 가이드', favorite:'즐겨찾기' };
const stageNames=['','경력 · 역할 적합성','조직 · 개발 운영','아키텍처 · 성능','ELM · 협업 · 상용화','경영진 · 사업 판단'];
let saved; try { saved=JSON.parse(localStorage.getItem(KEY)||'{}'); } catch { saved={}; }
saved=saved&&typeof saved==='object'?saved:{};
const records=saved.records&&typeof saved.records==='object'&&!Array.isArray(saved.records)?saved.records:{};
const settings={rate:1,enVoice:'',koVoice:'',mode:'dialogue',answerLanguage:'both',englishEngine:'kokoro',kokoroVoice:'af_heart',autoTranslate:false,repeat:false,continuous:false,...saved.settings};
let activeSpeechEngine='browser';
const neuralVoice=new KokoroPlayer(message=>{if(speechState!=='idle'&&activeSpeechEngine==='kokoro')updateAudio(message);});
let modelAnswers={},translationTimer=null,translationCardId=null,engineStatus='idle',engineMessage='';
const translator=new LocalTranslator((state,message)=>{engineStatus=state;engineMessage=message;updateTranslationStatus();});
let playlistActive=false,playlistCount=0;
let deck='hr',query='',filter='all',current=null,cards=[],visible=[],hidden=false,timerInterval=null,timerRemaining=90,timerRunning=false,timerEnd=0,voices=[],speechSession=0,speechItems=[],speechIndex=0,speechState='idle',utteranceRef=null,toastTimeout;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=s=>s.replace(/[`*_#>]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1');
function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:1,records,settings,last:current?.id}));}catch{toast('저장 공간에 접근할 수 없습니다. 기록을 내보내 백업하세요.');}}
function record(id){return records[id]??(records[id]={});}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').hidden=true,4300);}
function label(card){if(card.openingOrder)return `${card.round} · 초반 라운드 ${card.openingOrder}/23`;return card.group==='stage'?`STAGE ${card.stage} · ${stageNames[card.stage]}`:groups[card.group];}
function isDeck(card){if(deck==='early')return !!card.openingOrder;if(deck==='all')return true;if(deck==='favorite')return !!records[card.id]?.favorite;if(deck.startsWith('stage-'))return card.stage===Number(deck.at(-1));return card.group===deck;}
function filtered(){return cards.filter(c=>isDeck(c)).sort((a,b)=>deck==='early'?(a.openingOrder-b.openingOrder):0).filter(c=>filter==='all'||(filter==='favorite'?records[c.id]?.favorite:filter==='done'?records[c.id]?.done:!records[c.id]?.done)).filter(c=>!query||`${c.title} ${c.body} ${records[c.id]?.answerKo||''} ${records[c.id]?.answerEn||''}`.toLowerCase().includes(query));}
function renderNav(){
 const options=[['hr','HR Director'],['roadmap',groups.roadmap],['all','전체 연습'],...stageNames.slice(1).map((n,i)=>[`stage-${i+1}`,`${i+1}. ${n}`]),['tech',groups.tech],['star',groups.star],['pressure',groups.pressure],['cue',groups.cue],['guide',groups.guide],['early','초반 라운드 · PDF 23문답'],['closing',groups.closing],['favorite',groups.favorite]];
 const count=id=>cards.filter(c=>id==='all'?true:id==='early'?!!c.openingOrder:id==='favorite'?records[c.id]?.favorite:id.startsWith('stage-')?c.stage===Number(id.at(-1)):c.group===id).length;
 $('deckSelect').innerHTML=options.map(([id,title])=>`<option value="${id}">${escapeHTML(title)}</option>`).join('');$('deckSelect').value=deck;
 $('categoryNavigation').innerHTML=options.map(([id,title])=>`${id==='all'||id==='tech'||id==='early'?'<hr>':''}<button data-deck="${id}" class="category-link ${deck===id?'active':''}" ${deck===id?'aria-current="page"':''}><span>${escapeHTML(title)}</span><span class="category-count">${count(id)}</span></button>`).join('');
 $('categoryNavigation').querySelectorAll('button').forEach(button=>button.onclick=()=>setDeck(button.dataset.deck));
 $('categoryTitle').textContent=options.find(([id])=>id===deck)?.[1]||groups[deck];updatePlaylistSummary();
}
function updatePlaylistSummary(){const p=englishPlaylist(cards,modelAnswers,records);$('playlistSummary').textContent=`${p.count}개 문답 · 본 질문, 답변과 후속 질답을 순서대로 재생${p.skipped?` · 영문 갱신 대기 ${p.skipped}개 제외`:''}`;}
function setDeck(id){deck=id;filter='all';query='';$('search').value='';$('statusFilter').value='all';stopSpeech();renderNav();renderList();if(visible.length)selectCard(visible[0].id,false);else emptyReader();closeMenu();setMobile(true);}
function renderList(){visible=filtered();const name=deck.startsWith('stage-')?`Stage ${deck.at(-1)} · ${stageNames[Number(deck.at(-1))]}`:groups[deck];$('deckTitle').firstChild.textContent='질문 목록 '; $('deckCount').textContent=visible.length;$('questionList').innerHTML=visible.length?visible.map((c,i)=>`<button class="question-item ${current?.id===c.id?'active':''}" data-id="${c.id}" ${current?.id===c.id?'aria-current="true"':''}><span class="item-top"><span>${escapeHTML(label(c))}</span><span class="item-flags">${records[c.id]?.favorite?'즐겨찾기 ':''}${records[c.id]?.done?'완료':''}</span></span><span class="item-title">${escapeHTML(c.title)}</span></button>`).join(''):'<div class="empty-state">일치하는 질문이 없습니다.<br>검색어나 학습 상태를 바꿔보세요.</div>';$('questionList').querySelectorAll('button').forEach(b=>b.onclick=()=>selectCard(b.dataset.id,true));updateProgress();}
function sanitize(markdown){const t=document.createElement('template');t.innerHTML=marked.parse(markdown,{gfm:true,breaks:false});t.content.querySelectorAll('script,iframe,object,embed,style,link,form,input,svg,math').forEach(n=>n.remove());t.content.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(/^on/i.test(a.name)||['srcdoc','style'].includes(a.name))n.removeAttribute(a.name);if(n.hasAttribute('href')&&!/^(https?:|#|\.\/)/i.test(n.getAttribute('href')))n.removeAttribute('href');if(n.tagName==='A'){n.target='_blank';n.rel='noopener noreferrer';}});t.content.querySelectorAll('table').forEach(t=>{const w=document.createElement('div');w.className='table-scroll';t.replaceWith(w);w.append(t);});return t.innerHTML;}
function selectCard(id,mobile=true){const c=cards.find(x=>x.id===id);if(!c)return;clearTimeout(translationTimer);stopSpeech();stopTimer();current=c;hidden=false;timerRemaining=90;history.replaceState(null,'','#'+id);persist();renderList();renderReader();if(mobile){setMobile(true);if(matchMedia('(max-width:640px)').matches)$('reader').scrollIntoView({block:'start',behavior:'smooth'});} }
function emptyReader(){current=null;$('readingContent').innerHTML='<div class="empty-state">목록에서 질문을 선택하세요.</div>';stopSpeech();}
function renderReader(){if(!current)return;updatePlaylistSummary();const r=record(current.id);$('readingContent').innerHTML=`<header class="reader-head question-card" aria-label="질문 카드"><div class="reader-meta"><span>${escapeHTML(label(current))}</span><span>${escapeHTML(current.id)}</span></div><h2 class="reader-title" lang="en">${escapeHTML(questionEnglish(current))}</h2>${current.questionKo?`<p class="question-ko lang-ko">${escapeHTML(current.questionKo)}</p>`:''}<div class="reader-tools"><button id="hideAnswer" aria-pressed="false">답변 가리기</button><button id="favoriteCard" class="${r.favorite?'is-on':''}" aria-pressed="${!!r.favorite}">${r.favorite?'즐겨찾기 해제':'즐겨찾기'}</button><button id="doneCard" class="${r.done?'is-on':''}" aria-pressed="${!!r.done}">${r.done?'연습 완료':'완료 표시'}</button><button id="listenAnswer">이 질문 듣기</button></div></header><div class="reader-body"><div id="answerBody">${modelAnswers[current.id]?bilingualHTML(current):`<div class="prose">${sanitize(current.body)}</div>`}</div><div class="answer-hidden" id="hiddenAnswer" hidden><b>이제, 당신의 언어로 답해보세요.</b><p>상황 → 책임 → 내가 한 행동 → 결과<br>숫자의 정의와 본인 기여를 분명하게.</p></div><details class="practice-panel"><summary>타이머 · 나만의 메모</summary><div class="timer-row"><div><span class="timer-label">답변 연습 시간</span><div class="timer-display" id="timerDisplay">01:30</div></div><div class="timer-controls"><label><span class="sr-only">연습 시간</span><select id="timerDuration"><option value="60">60초</option><option value="90" selected>90초</option><option value="120">120초</option></select></label><button id="timerStart">시작</button><button id="timerReset" aria-label="타이머 초기화">초기화</button></div></div><label class="note-field"><span class="note-label">나만의 답변 메모 <span>이 기기에 자동 저장</span></span><textarea id="cardNote" placeholder="내가 한 선택, 실제 수치의 정의, 더 간결하게 말할 문장…" maxlength="10000"></textarea></label></details><div class="reader-pagination"><button id="readerPrev">이전 질문</button><span>${Math.max(0,visible.findIndex(c=>c.id===current.id))+1} / ${visible.length}</span><button id="readerNext">다음 질문</button></div></div>`;
bindAnswerEditor();
$('cardNote').value=typeof r.note==='string'?r.note:'';$('cardNote').oninput=e=>{record(current.id).note=e.target.value;persist();};$('hideAnswer').onclick=()=>{hidden=!hidden;$('answerBody').hidden=hidden;$('hiddenAnswer').hidden=!hidden;$('hideAnswer').textContent=hidden?'답변 보기':'답변 가리기';$('hideAnswer').setAttribute('aria-pressed',String(hidden));};$('favoriteCard').onclick=()=>{r.favorite=!r.favorite;persist();renderNav();renderList();const b=$('favoriteCard');b.classList.toggle('is-on',r.favorite);b.setAttribute('aria-pressed',String(r.favorite));b.textContent=r.favorite?'즐겨찾기 해제':'즐겨찾기';};$('doneCard').onclick=()=>{r.done=!r.done;persist();renderList();const b=$('doneCard');b.classList.toggle('is-on',r.done);b.setAttribute('aria-pressed',String(r.done));b.textContent=(r.done?'연습 완료':'완료 표시');};$('listenAnswer').onclick=()=>{settings.mode='dialogue';$('readMode').value='dialogue';persist();startSpeech();};$('readerPrev').onclick=()=>navigate(-1);$('readerNext').onclick=()=>navigate(1);$('timerDuration').onchange=e=>{stopTimer();timerRemaining=Number(e.target.value);updateTimer();};$('timerStart').onclick=toggleTimer;$('timerReset').onclick=()=>{stopTimer();timerRemaining=Number($('timerDuration').value);updateTimer();};$('readerPrev').disabled=visible.findIndex(c=>c.id===current.id)<=0;$('readerNext').disabled=visible.findIndex(c=>c.id===current.id)>=visible.length-1;if(!playlistActive){$('audioTitle').textContent=questionEnglish(current);updateAudio('이 질문의 영어 답변과 후속 질답을 들어보세요.');}}

function textParagraphs(text){return text.split(/\n\s*\n/).map(p=>`<p>${escapeHTML(p).replace(/\n/g,'<br>')}</p>`).join('');}
function bilingualHTML(card){
 const base=modelAnswers[card.id],pair=answerFor(base,record(card.id));
 return `<section class="bilingual-panel answer-card" aria-label="답변 카드"><div class="pair-heading"><div><h3>${card.kind==='candidate-question'?'상대 답변 후 이어갈 말':'답변'}</h3></div><button class="secondary-button" id="editAnswers" aria-expanded="false">답안 수정</button></div><div class="pair-grid"><section class="answer-column lang-ko" lang="ko"><div class="language-heading"><h4>한국어</h4><button class="plain-listen" id="listenKorean">한국어 듣기</button></div><div class="pair-display prose" id="koDisplay">${textParagraphs(pair.ko)}</div><label class="pair-editor"><span class="sr-only">한국어 답안 수정</span><textarea id="koreanAnswer" maxlength="10000" spellcheck="false"></textarea></label></section><section class="answer-column lang-en" lang="en"><div class="language-heading"><h4>English</h4><button class="plain-listen" id="listenEnglish">영어 듣기</button></div><div class="pair-display prose" id="enDisplay">${textParagraphs(pair.en)}</div><label class="pair-editor"><span class="sr-only">영문 답안 수정</span><textarea id="englishAnswer" maxlength="10000" spellcheck="true"></textarea></label></section></div><div class="translation-bar"><div class="translation-actions"><button class="secondary-button" id="enableTranslation">${settings.autoTranslate?'자동번역 끄기':'자동번역 켜기'}</button><button class="secondary-button" id="translateNow">반대쪽 답안 갱신</button><button class="text-button" id="restoreAnswer">직전 답안 복원</button><button class="text-button" id="resetAnswer">모범 답안으로</button></div><p id="translationStatus" role="status" aria-live="polite"></p><p class="translation-hint">자동번역은 기기에서 실행됩니다. 번역 방향별 첫 사용 시 모델을 내려받을 수 있습니다. 마지막으로 수정한 언어를 기준으로 반대쪽을 갱신합니다. 자동번역은 초안이므로 용어·수치를 확인하세요. 수정본은 이 기기에 저장되며 공개 저장소에는 올라가지 않습니다.</p></div></section>${followupsHTML(base)}<details class="coaching-details"><summary>근거 · STAR · 확인할 사항</summary>${card.sourceNote?`<p class="source-note">${escapeHTML(card.sourceNote)}</p>`:''}${base.note?`<p class="answer-caution">${escapeHTML(base.note)}</p>`:''}<div class="prose">${sanitize(card.body)}</div></details>`;
}
function followupsHTML(base){const list=base.followups||[];return list.length?`<section class="followups" aria-label="후속 질답 카드"><h3 class="sr-only">후속 질답</h3><ol>${list.map((f,i)=>`<li class="followup-card" aria-label="후속 질답 ${i+1}"><h3>후속 질답 ${i+1}</h3><div class="follow-question"><h4 lang="en">${escapeHTML(f.questionEn)}</h4><p class="lang-ko">${escapeHTML(f.questionKo)}</p></div><div class="follow-answer lang-ko" lang="ko">${textParagraphs(f.ko)}</div><div class="follow-answer lang-en" lang="en">${textParagraphs(f.en)}</div></li>`).join('')}</ol></section>`:'';}
function editedAnswer(language,text){
 const id=current.id,base=modelAnswers[id],r=record(id);
 clearTimeout(translationTimer);translator.cancel();stopSpeech();
 if(language==='ko')editKorean(r,base,text);else editEnglish(r,base,text);
 persist();updatePlaylistSummary();$(language==='ko'?'koDisplay':'enDisplay').innerHTML=textParagraphs(text);updateTranslationStatus();
 if(settings.autoTranslate)translationTimer=setTimeout(()=>translateAnswer(id),1200);
}
function bindAnswerEditor(){
 if(!current||!modelAnswers[current.id])return;
 const base=modelAnswers[current.id],r=record(current.id),pair=answerFor(base,r);
 $('koreanAnswer').value=pair.ko;$('englishAnswer').value=pair.en;
 $('editAnswers').onclick=()=>{const panel=document.querySelector('.bilingual-panel');const editing=panel.classList.toggle('editing');$('editAnswers').textContent=editing?'읽기 화면':'답안 수정';$('editAnswers').setAttribute('aria-expanded',String(editing));if(editing){settings.answerLanguage='both';$('answerLanguage').value='both';document.body.dataset.answerLanguage='both';$('koreanAnswer').focus();}};
 $('koreanAnswer').onfocus=$('englishAnswer').onfocus=()=>rememberAnswer(r,base);
 $('koreanAnswer').oninput=e=>editedAnswer('ko',e.target.value);
 $('englishAnswer').oninput=e=>editedAnswer('en',e.target.value);
 $('enableTranslation').onclick=async()=>{
  settings.autoTranslate=!settings.autoTranslate;persist();updateTranslationStatus();
  if(!settings.autoTranslate){clearTimeout(translationTimer);translator.cancel();engineStatus=translator.ready?'ready':'idle';engineMessage='';updateTranslationStatus();return;}
  try{
   const from=answerFor(base,r).dirtyLanguage||r.lastEditedLanguage||'ko';
   await translator.init(from==='en'?'en-ko':'ko-en');
   if(settings.autoTranslate&&current&&modelAnswers[current.id]&&answerFor(modelAnswers[current.id],record(current.id)).stale)await translateAnswer(current.id);
  }catch(error){if(error.name==='AbortError')return;engineStatus='error';engineMessage=error.message;updateTranslationStatus();}
 };
 $('translateNow').onclick=()=>translateAnswer(current.id);
 $('listenKorean').onclick=()=>{$('readMode').value='korean';settings.mode='korean';persist();startSpeech();};
 $('listenEnglish').onclick=()=>{$('readMode').value='english';settings.mode='english';persist();startSpeech();};
 $('restoreAnswer').onclick=()=>{
  clearTimeout(translationTimer);translator.cancel();engineStatus=translator.ready?'ready':'idle';engineMessage='';stopSpeech();const previous=r.answerHistory?.pop();
  if(!previous){toast('복원할 이전 답안이 없습니다.');return;}
  r.answerKo=previous.ko;r.answerEn=previous.en;r.enSourceKo=previous.source||previous.ko;r.enKind=previous.kind||'manual';r.syncFrom=previous.dirtyLanguage||null;r.editRevision=(r.editRevision||0)+1;r.enEditRevision=(r.enEditRevision||0)+1;persist();renderReader();toast('직전 한·영 답안을 복원했습니다.');
 };
 $('resetAnswer').onclick=()=>{
  clearTimeout(translationTimer);translator.cancel();engineStatus=translator.ready?'ready':'idle';engineMessage='';stopSpeech();rememberAnswer(r,base);
  for(const key of ['answerKo','answerEn','enSourceKo','enKind','translationError','syncFrom','lastEditedLanguage','lastTranslationFrom'])delete r[key];
  r.editRevision=(r.editRevision||0)+1;r.enEditRevision=(r.enEditRevision||0)+1;persist();renderReader();toast('모범 답안으로 돌아왔습니다. 이전 수정본은 복원할 수 있습니다.');
 };
 updateTranslationStatus();
 if(settings.autoTranslate&&pair.stale){clearTimeout(translationTimer);const id=current.id;translationTimer=setTimeout(()=>translateAnswer(id),1200);}
}
function updateTranslationStatus(){
 if(!$('translationStatus')||!current||!modelAnswers[current.id])return;
 const r=record(current.id),pair=answerFor(modelAnswers[current.id],r),status=$('translationStatus');
 document.querySelector('.bilingual-panel').dataset.engine=translator.ready?'ready':engineStatus;
 $('enableTranslation').textContent=settings.autoTranslate?'자동번역 끄기':'자동번역 켜기';
 const from=pair.dirtyLanguage||r.lastEditedLanguage||'ko',target=from==='en'?'한국어':'영어';
 $('translateNow').textContent=`${target} 지금 갱신`;
 const busy=engineStatus==='loading'||(engineStatus==='translating'&&translationCardId===current.id);
 if(busy){status.textContent=engineMessage;status.dataset.state='busy';}
 else if(r.translationError){status.textContent=`갱신 실패: ${r.translationError} 양쪽 수정본은 보존되었습니다.`;status.dataset.state='error';}
 else if(engineStatus==='error'){status.textContent=engineMessage||'번역을 준비하지 못했습니다. 다시 시도하세요.';status.dataset.state='error';}
 else if(pair.stale){status.textContent=`${from==='en'?'영어':'한국어'}가 수정되었습니다. ${settings.autoTranslate?`최신 내용으로 ${target}를 갱신합니다.`:`자동번역을 켜거나 ‘${target} 지금 갱신’을 누르세요.`}`;status.dataset.state='stale';}
 else {status.textContent=r.lastTranslationFrom?`최신 ${r.lastTranslationFrom==='en'?'영어':'한국어'} 반영 · ${r.lastTranslationFrom==='en'?'한국어':'영어'} 자동번역 초안`:settings.autoTranslate?'양방향 자동번역 켜짐 · 어느 언어를 수정하든 반대쪽에 반영됩니다.':'한·영 모범 답안 · 양쪽 모두 수정할 수 있습니다.';status.dataset.state='ready';}
 document.querySelector('.answer-column[lang="en"]').classList.toggle('translation-stale',pair.enStale);
 document.querySelector('.answer-column[lang="ko"]').classList.toggle('translation-stale',pair.koStale);
 $('restoreAnswer').disabled=!r.answerHistory?.length;
}
async function translateAnswer(id){
 if(!modelAnswers[id])return;
 const base=modelAnswers[id],r=record(id),pair=answerFor(base,r),from=pair.dirtyLanguage||r.lastEditedLanguage||'ko',source=pair[from],revision=r.editRevision||0;
 if(!source.trim()){toast(`${from==='en'?'영어':'한국어'} 답안을 먼저 입력하세요.`);return;}
 if(source.length>6000){r.translationError='답안은 6,000자 이내로 나눠주세요.';persist();updateTranslationStatus();return;}
 if(!pair.stale&&source===base[from]){toast('현재 모범 답안은 한·영이 이미 일치합니다.');return;}
 translationCardId=id;delete r.translationError;
 try{
  const target=from==='en'?'ko':'en';
  const result=source===base[from]?base[target]:await translator.translate(source,from==='en'?'en-ko':'ko-en');
  if(applyPairedTranslation(r,base,{from,source,text:result,revision})){
   persist();updatePlaylistSummary();if(current?.id===id){$(target==='ko'?'koreanAnswer':'englishAnswer').value=result;$(target==='ko'?'koDisplay':'enDisplay').innerHTML=textParagraphs(result);}
  }
  engineStatus=translator.ready?'ready':'idle';engineMessage='';updateTranslationStatus();
 }catch(error){if(error.name==='AbortError')return;r.translationError=error.message;persist();engineStatus='error';engineMessage=error.message;updateTranslationStatus();}
}

function updateProgress(){const done=cards.filter(c=>records[c.id]?.done).length;$('progressText').textContent=`${done}개 연습 완료`;$('progressDetail').textContent=`전체 ${cards.length}개 자료`;$('networkBadge').textContent=navigator.onLine?'기기에 자동 저장':'오프라인';}
function setMobile(reader){$('questionPicker').open=!reader;}
function closeMenu(){document.querySelector('main').inert=false;document.querySelector('.audio-dock').inert=false;document.body.classList.remove('categories-open');$('categoryShade').hidden=true;$('openCategories').setAttribute('aria-expanded','false');}
function openCategories(){document.querySelector('main').inert=true;document.querySelector('.audio-dock').inert=true;document.body.classList.add('categories-open');$('categoryShade').hidden=false;$('openCategories').setAttribute('aria-expanded','true');$('closeCategories').focus();}
function navigate(delta){if(!visible.length)return;const i=visible.findIndex(c=>c.id===current?.id);const n=Math.max(0,Math.min(visible.length-1,i+delta));if(visible[n])selectCard(visible[n].id,true);}
function random(){const pool=visible.filter(c=>c.id!==current?.id);if(!pool.length){toast('다른 질문이 없습니다. 다른 자료를 선택해보세요.');return;}selectCard(pool[Math.floor(Math.random()*pool.length)].id,true);}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;timerRunning=false;if($('timerStart'))$('timerStart').textContent='시작';}
function updateTimer(){if($('timerDisplay'))$('timerDisplay').textContent=`${String(Math.floor(timerRemaining/60)).padStart(2,'0')}:${String(timerRemaining%60).padStart(2,'0')}`;}
function toggleTimer(){if(timerRunning){timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));stopTimer();updateTimer();return;}if(timerRemaining<=0)timerRemaining=Number($('timerDuration').value);timerRunning=true;timerEnd=Date.now()+timerRemaining*1000;$('timerStart').textContent='일시정지';timerInterval=setInterval(()=>{timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));updateTimer();if(!timerRemaining){stopTimer();toast('시간이 끝났습니다. 핵심을 한 문장으로 마무리해보세요.');}},250);}
function updateAudio(message){if(message)$('audioStatus').textContent=message;$('playButton').textContent=speechState==='speaking'?'일시정지':'재생';$('playButton').setAttribute('aria-label',speechState==='speaking'?'음성 일시정지':speechState==='paused'?'음성 이어 재생':'음성 재생');}
function stopSpeech(){playlistActive=false;speechSession++;if('speechSynthesis'in window)window.speechSynthesis.cancel();neuralVoice.stop();speechState='idle';utteranceRef=null;updateAudio('재생할 범위와 음성을 선택하세요.');}
function language(text){const ko=(text.match(/[가-힣]/g)||[]).length;const en=(text.match(/[A-Za-z]/g)||[]).length;return ko>en*.2?'ko-KR':'en-US';}
function getSpeechItems(){if(!current)return[];const root=document.createElement('div');root.innerHTML=sanitize($('readMode').value==='english'?current.body.split('**큐카드:**')[0]:current.body);root.querySelectorAll('pre,table').forEach(n=>n.remove());let paragraphs=[];const mode=$('readMode').value;
const base=modelAnswers[current.id];if(base&&mode==='dialogue'){const items=englishDialogue(current,base,record(current.id));if(!items.length)toast('영어 답변을 먼저 갱신하세요.');return speechChunks(items);}
if(base&&['english','korean','all'].includes(mode)){const pair=answerFor(base,record(current.id));if(mode==='english'&&pair.enStale){toast('한국어가 수정되어 영문 갱신이 필요합니다. 자동번역 또는 직접 수정을 완료하세요.');return[];}if(mode==='korean'&&pair.koStale){toast('영어가 수정되어 한국어 갱신이 필요합니다. 번역을 완료하세요.');return[];}paragraphs=mode==='english'?[pair.en]:mode==='korean'?[pair.ko]:[current.title,...(pair.koStale?[]:[pair.ko]),...(pair.enStale?[]:[pair.en])];}
else if(mode==='question')paragraphs=[current.title];
else if(mode==='english'){const quotes=[...root.querySelectorAll('blockquote p')].map(n=>n.textContent.trim()).filter(t=>/[a-zA-Z]/.test(t)&&language(t)==='en-US');paragraphs=quotes;if(!paragraphs.length&&current.group==='cue')paragraphs=[...root.querySelectorAll('p,li')].map(n=>n.textContent.trim()).filter(t=>language(t)==='en-US'&&/[a-z]/i.test(t));}
else if(mode==='cue'){const text=current.body;const cue=text.includes('**큐카드:**')?text.split('**큐카드:**')[1]:current.group==='cue'?text:'';if(cue){const d=document.createElement('div');d.innerHTML=sanitize(cue);paragraphs=[...d.querySelectorAll('p,li')].map(n=>n.textContent.trim()).filter(Boolean);}else{toast('이 자료에는 큐카드가 없습니다. 큐카드 메뉴에서 선택하세요.');return[];}}
else paragraphs=[current.title,...[...root.querySelectorAll('p,li,h2,h3')].filter(n=>!n.parentElement?.closest('li')).map(n=>n.textContent.trim()).filter(Boolean)];
const chunks=[];for(const text of paragraphs){const lang=language(text);let buffer='';const sentences=text.match(/[^.!?。！？]+[.!?。！？]*(?:\s|$)|.+$/g)||[text];for(let sentence of sentences){const words=sentence.trim().split(/\s+/);for(const word of words){if(buffer.length+word.length>190&&buffer){chunks.push({text:buffer.trim(),lang});buffer='';}buffer+=word+' ';}}if(buffer.trim())chunks.push({text:buffer.trim(),lang});}return chunks;}
function startPlaylist(scope){
 stopSpeech();settings.mode='dialogue';$('readMode').value='dialogue';persist();const result=englishPlaylist(scope==='deck'?visible:cards,modelAnswers,records);if(!result.items.length){toast('재생할 최신 영문 문답이 없습니다. 영어를 갱신하거나 다른 라운드를 선택하세요.');return;}
 speechItems=speechChunks(result.items);speechIndex=0;playlistActive=true;playlistCount=result.count;speechState='speaking';
 if(settings.englishEngine!=='browser')neuralVoice.unlock().catch(e=>toast(e.message));
 if(result.skipped)toast(`영문 갱신 대기 ${result.skipped}개를 제외하고 ${result.count}개 문답을 재생합니다.`);speakChunk(speechSession);
}
function startSpeech(){if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){toast('이 브라우저는 음성 읽기를 지원하지 않습니다. Safari 또는 Chrome에서 열어주세요.');return;}stopSpeech();speechItems=getSpeechItems();if(!speechItems.length){if($('readMode').value!=='cue')toast('읽을 영문 답변이 없습니다. 질문만 또는 전체 내용 읽기를 선택하세요.');return;}speechIndex=0;const session=speechSession;speechState='speaking';if(settings.englishEngine!=='browser'&&speechItems.some(x=>x.lang.startsWith('en')))neuralVoice.unlock().catch(e=>toast(e.message));window.speechSynthesis.resume();speakChunk(session);}
function speakChunk(session){
 if(session!==speechSession)return;
 if(speechIndex>=speechItems.length){
  speechState='idle';updateAudio('읽기 완료 · 이제 소리 내어 답해보세요.');
  if(playlistActive){playlistActive=false;updateAudio(`영어 ${playlistCount}개 문답 듣기 완료`);return;}
  if(settings.repeat){speechIndex=0;speechState='speaking';speakChunk(session);}
  else if(settings.continuous){const i=visible.findIndex(c=>c.id===current?.id);if(i>=0&&i+1<visible.length){selectCard(visible[i+1].id,false);startSpeech();}}
  return;
 }
 const item=speechItems[speechIndex];if(playlistActive)$('audioTitle').textContent=item.title;
 const started=()=>{if(session!==speechSession)return;speechState='speaking';updateAudio(`${activeSpeechEngine==='kokoro'?'Kokoro 신경망 음성':'브라우저 음성'} · ${playlistActive?`문답 ${item.cardNumber}/${playlistCount}`:`구간 ${speechIndex+1}/${speechItems.length}`} · ${item.kind|| (item.lang.startsWith('ko')?'한국어':'English')}`);};
 const ended=()=>{if(session===speechSession){speechIndex++;speakChunk(session);}};
 if(item.lang.startsWith('en')&&settings.englishEngine!=='browser'){
  activeSpeechEngine='kokoro';updateAudio('Kokoro 신경망 음성 준비 중…');
  neuralVoice.speak(item.text,{voice:settings.kokoroVoice||'af_heart',speed:Math.min(1.35,Math.max(.65,Number(settings.rate)||1)),onstart:started,onend:ended}).catch(error=>{if(session!==speechSession||error.name==='AbortError')return;speechState='idle';updateAudio('Kokoro 재생 실패 · 음성 설정에서 다시 시도하거나 브라우저 음성을 선택하세요.');toast(error.message);});
  return;
 }
 activeSpeechEngine='browser';const utterance=new SpeechSynthesisUtterance(item.text);utteranceRef=utterance;utterance.lang=item.lang;utterance.rate=Math.min(1.35,Math.max(.65,Number(settings.rate)||1));
 utterance.voice=chooseBrowserVoice(voices,item.lang,item.lang.startsWith('ko')?settings.koVoice:settings.enVoice);utterance.onstart=started;utterance.onend=ended;
 utterance.onerror=e=>{if(session!==speechSession)return;speechState='idle';updateAudio('음성 재생이 중단되었습니다.');if(!['canceled','interrupted'].includes(e.error))toast(`음성을 재생할 수 없습니다 (${e.error}). 설정을 확인하세요.`);};
 window.speechSynthesis.speak(utterance);updateAudio(`브라우저 음성 준비 · ${speechIndex+1}/${speechItems.length}`);
}
function toggleSpeech(){
 if(speechState==='speaking'){if(activeSpeechEngine==='kokoro')neuralVoice.pause();else window.speechSynthesis.pause();speechState='paused';updateAudio('일시정지 · 재생 버튼으로 이어 들으세요.');}
 else if(speechState==='paused'){if(activeSpeechEngine==='kokoro')neuralVoice.resume();else window.speechSynthesis.resume();speechState='speaking';updateAudio(`이어 읽는 중 · ${speechIndex+1}/${speechItems.length}`);}
 else startSpeech();
}
function updateEngineControls(){
 $('englishEngine').value=settings.englishEngine==='browser'?'browser':'kokoro';
 $('kokoroVoiceField').hidden=settings.englishEngine==='browser';$('browserVoiceField').hidden=settings.englishEngine!=='browser';
 $('kokoroVoice').value=settings.kokoroVoice||'af_heart';
}
function bindSpeechSettings(){
 $('kokoroVoice').innerHTML=KOKORO_VOICES.map(v=>`<option value="${v.id}">${escapeHTML(v.name)}</option>`).join('');updateEngineControls();
 $('englishEngine').onchange=e=>{stopSpeech();settings.englishEngine=e.target.value;persist();updateEngineControls();};
 $('kokoroVoice').onchange=e=>{stopSpeech();settings.kokoroVoice=e.target.value;persist();};
 $('testEnglishVoice').onclick=()=>{
  stopSpeech();speechItems=[{text:'Thank you for inviting me. I look forward to discussing how I can contribute to your engineering team.',lang:'en-US'}];speechIndex=0;speechState='speaking';const session=speechSession;
  if(settings.englishEngine!=='browser')neuralVoice.unlock().catch(e=>toast(e.message));speakChunk(session);
 };
}

function loadVoices(){voices='speechSynthesis'in window?window.speechSynthesis.getVoices():[];for(const [id,lang,key]of[['englishVoice','en','enVoice'],['koreanVoice','ko','koVoice']]){const list=voices.filter(v=>v.lang.toLowerCase().startsWith(lang));$(id).innerHTML='<option value="">기기 기본 음성</option>'+list.map(v=>`<option value="${escapeHTML(v.voiceURI)}">${escapeHTML(v.name)} · ${escapeHTML(v.lang)}${v.localService?' (기기)':''}</option>`).join('');$(id).value=settings[key];if(!$(id).value)$(id).value='';}}
function applySettings(){$('readMode').value=['dialogue','english','korean','question','cue','all'].includes(settings.mode)?settings.mode:'english';$('rateRange').value=settings.rate;$('rateValue').textContent=Number(settings.rate).toFixed(2).replace(/0$/,'')+'×';$('rateButton').textContent=Number(settings.rate).toFixed(2).replace(/\.?0+$/,'')+'×';$('repeatToggle').checked=!!settings.repeat;$('continuousToggle').checked=!!settings.continuous;}
function initEvents(){bindSpeechSettings();$('openCategories').onclick=openCategories;$('closeCategories').onclick=()=>{closeMenu();$('openCategories').focus();};$('categoryShade').onclick=()=>{closeMenu();$('openCategories').focus();};matchMedia('(max-width:800px)').addEventListener('change',e=>{if(!e.matches)closeMenu();});$('deckSelect').onchange=e=>setDeck(e.target.value);$('answerLanguage').value=settings.answerLanguage||'both';document.body.dataset.answerLanguage=$('answerLanguage').value;$('answerLanguage').onchange=e=>{settings.answerLanguage=e.target.value;document.body.dataset.answerLanguage=e.target.value;persist();};$('listenAllEnglish').onclick=()=>startPlaylist('all');$('listenDeckEnglish').onclick=()=>startPlaylist('deck');$('search').oninput=e=>{query=e.target.value.trim().toLowerCase();renderList();};$('statusFilter').onchange=e=>{filter=e.target.value;renderList();};$('randomButton').onclick=random;$('previousButton').onclick=()=>navigate(-1);$('nextButton').onclick=()=>navigate(1);$('playButton').onclick=toggleSpeech;$('stopButton').onclick=()=>stopSpeech();$('readMode').onchange=e=>{settings.mode=e.target.value;stopSpeech();persist();};$('settingsButton').onclick=()=>{loadVoices();$('settingsDialog').showModal();};$('helpButton').onclick=()=>$('helpDialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());for(const[id,key]of[['englishVoice','enVoice'],['koreanVoice','koVoice']])$(id).onchange=e=>{settings[key]=e.target.value;persist();stopSpeech();};$('rateRange').oninput=e=>{settings.rate=Number(e.target.value);applySettings();persist();};$('rateRange').onchange=()=>{if(speechState!=='idle'){stopSpeech();toast('속도를 바꿨습니다. 재생 버튼을 눌러 다시 들어보세요.');}};$('rateButton').onclick=()=>{const rates=[.75,.9,1,1.1,1.25];const n=rates.find(x=>x>settings.rate+.01);settings.rate=n||rates[0];applySettings();persist();stopSpeech();};$('repeatToggle').onchange=e=>{settings.repeat=e.target.checked;if(settings.repeat)settings.continuous=false;applySettings();persist();};$('continuousToggle').onchange=e=>{settings.continuous=e.target.checked;if(settings.continuous)settings.repeat=false;applySettings();persist();};$('exportButton').onclick=()=>{const blob=new Blob([JSON.stringify({app:'ben-practice',version:2,records,settings},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ben-practice-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error();const data=JSON.parse(await file.text());if(data.app!=='ben-practice'||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error();for(const c of cards){const r=data.records[c.id];if(r&&typeof r==='object')records[c.id]=cleanRecord(r);}clearTimeout(translationTimer);translator.cancel();engineStatus=translator.ready?'ready':'idle';engineMessage='';stopSpeech();stopTimer();persist();renderNav();renderList();renderReader();toast('메모와 한·영 답안을 가져왔습니다.');}catch{toast('올바른 BEN Practice 백업 파일을 선택하세요.');}e.target.value='';};window.addEventListener('online',updateProgress);window.addEventListener('offline',updateProgress);window.addEventListener('pagehide',()=>{stopSpeech();persist();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('categories-open')){closeMenu();$('openCategories').focus();}if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('questionPicker').open=true;$('search').focus();}});}
async function init(){initEvents();applySettings();loadVoices();if('speechSynthesis'in window)window.speechSynthesis.addEventListener('voiceschanged',loadVoices);try{const [response,answerResponse]=await Promise.all([fetch('./content.json',{cache:'no-cache'}),fetch('./answers.json',{cache:'no-cache'})]);if(!response.ok||!answerResponse.ok)throw Error('content');const data=await response.json();const answerData=await answerResponse.json();modelAnswers=answerData.answers;cards=data.cards;renderNav();renderList();const id=decodeURIComponent(location.hash.slice(1))||saved.last;const initial=cards.some(c=>c.id===id)?id:'HR1';const initialCard=cards.find(c=>c.id===initial);deck=initialCard.group==='stage'?`stage-${initialCard.stage}`:initialCard.group;renderNav();renderList();selectCard(initial,false);setMobile(true);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=20261124-1').catch(()=>{});}catch(error){$('questionList').innerHTML='<div class="empty-state">자료를 불러오지 못했습니다.<br>연결을 확인하고 새로고침하세요.</div>';console.error(error);}}
init();
