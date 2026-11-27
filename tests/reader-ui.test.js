import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerParagraphs,paragraphAccordions} from '../reader-ui.js';
const answers=JSON.parse(readFileSync(new URL('../answers.json',import.meta.url))).answers;
const normalize=text=>text.replace(/\s+/gu,' ').trim();
test('accordion paragraph presentation preserves every word of all bilingual model answers',()=>{
 for(const [id,a] of Object.entries(answers))for(const language of ['en','ko']){
  const chunks=answerParagraphs(a[language],language==='ko'?220:360);
  assert.equal(normalize(chunks.join(' ')),normalize(a[language]),`${id} ${language}`);
 }
});
test('financial decimals, versions and original paragraph boundaries survive disclosure',()=>{
 const source='Dr. Lee reviewed USD 7.45 million at 1,342.41 KRW per dollar. Version v1.2.3 was deployed.\n\nThis is a separate paragraph.';
 const chunks=answerParagraphs(source);assert.equal(chunks.length,2);assert.equal(chunks[0],source.split('\n\n')[0]);assert.equal(chunks[1],'This is a separate paragraph.');
 assert.equal(answerParagraphs('').length,0);
});
test('editable text is escaped and only the first answer section initially opens',()=>{
 const markup=paragraphAccordions('First paragraph <script>alert(1)</script>.\n\nSecond paragraph.','en');
 assert.ok(!markup.includes('<script>'));assert.ok(markup.includes('&lt;script&gt;'));
 assert.equal((markup.match(/class="paragraph-accordion" open/g)||[]).length,1);
 assert.equal((markup.match(/<details /g)||[]).length,2);
 assert.match(markup,/Part 2/);
});
