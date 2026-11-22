import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {MarianTokenizer} from '../vendor/transformers.min.js';
const json=file=>JSON.parse(readFileSync(new URL(file,import.meta.url)));
test('English encoder token IDs match the original SentencePiece source model, including EOS',()=>{
 const tokenizer=new MarianTokenizer(json('../vendor/en-ko-tokenizer.json'),json('../vendor/en-ko-tokenizer-config.json'));
 for(const fixture of json('./en-ko-tokenizer-fixtures.json'))assert.deepEqual(tokenizer.encode(fixture.text),fixture.ids,fixture.text);
});
