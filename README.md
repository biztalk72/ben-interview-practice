# BEN Interview Practice

A responsive Korean/English interview practice app for desktop and mobile. Independent preparation material, not an official BEN product. The five-stage sequence is a preparation simulation inferred from a supplied job description.

## Features

The original HR, five-stage, technical, STAR, pressure, cue-card and guide categories are available in a desktop sidebar and a mobile category drawer. The content is a separate question card, answer card and 1–3 follow-up Q&A cards. A folded question list remains available within each category. Language display can be Korean, English, or both. Timer, notes, STAR and evidence are folded away. **전체 영어 질답 듣기** plays all 108 paired cards and their 115 follow-up pairs; **현재 라운드 듣기** plays the current filtered selection. Guides and cue cards are outside the full dialogue playlist. Device-local English edits are used; outdated English is explicitly counted and excluded until regenerated. Pause/stop controls stay visible at the bottom.

- First interview: November 23, 2026, HR Director. Dedicated culture-fit, size, technology, motivation and logistics deck; stage-by-stage preparation roadmap.
- 23 early-round questions integrated from the supplied Interview Complete PDF, with 11 candidate questions and 3 closing scripts; existing five-stage, ELM, pressure, STAR, cue-card and preparation materials remain accessible.
- 108 substantive Korean/English model-answer pairs shown before coaching notes.
- Editable paired answers with debounced bidirectional Korean/English translation, last-edit-wins protection, stale-target detection, and bounded undo history.
- Search, favorites, practiced markers, answer hiding, 60/90/120-second timer, and personal notes.
- English neural TTS with Kokoro (default), six US/UK voices, and optional browser voices. Korean uses browser TTS. Voice/rate selection, pause/resume/stop, repeat, continuous playback.
- Device-local progress and both edited languages with JSON backup/import; no account, analytics, or server-side storage.
- Installable manifest and service-worker offline reading after initial online load.
- Static study and browser TTS have no CDN dependency. Neural TTS and optional local translation download model/runtime assets; no API key is required.

## Run locally

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. Use HTTPS or localhost for service workers. A direct `file://` open cannot load the JSON/module reliably.

## Publish

GitHub Pages: deploy `main` branch, `/` root. All asset links are relative and work under `/ben-interview-practice/`.

## TTS and storage limits

English defaults to Kokoro-82M v1.0 q8 via kokoro-js 1.2.1 in a Web Worker. First use downloads roughly 100 MB from Hugging Face plus the ONNX runtime (Transformers.js 3.5.1) from jsDelivr. Inference runs locally; answer text is not sent to a TTS server. Settings offer Heart, Bella, Michael, Fenrir, Emma and George, with a preview button. Browser TTS remains selectable and Korean uses browser TTS. Browser voices depend on OS/browser installation; some may use the OS vendor's network service. Mobile playback requires a user gesture and may pause on screen lock or app switching. Offline reading is separate from offline voice availability. Device-local records do not sync automatically: export a backup, transfer it, and import on another device. Import merges known card records and replaces values for matching IDs.

## Content

Source preparation material reviewed on 2026-11-20. Examples must be checked against the candidate's actual experience. Company technology claims are distinguished from proposed system designs and unpublished details. Original resumes, portfolio PDFs, contact details, and local attachment paths are not included.

## Third-party license

`vendor/marked.js` — Marked 17.0.5, MIT; see `vendor/MARKED-LICENSE.md`.

## Automatic bidirectional updates

Press **자동번역 켜기** once. Supported desktop browsers use their built-in Translator API. Other browsers use a module Web Worker with Transformers.js 3.8.1, ONNX Runtime WASM (one thread), and `Xenova/opus-mt-ko-en` q8, revision `d9fa1ac6008242100fecb4fff9b0a5917a1be81f`. First model/runtime download is roughly 150 MB; the app does not download weights until translation is requested. The model is retrieved from Hugging Face and the WASM binary from jsDelivr. Translation inference runs locally; answer text is not posted to a translation server. Device RAM, browser support and network policy may limit initialization; existing answers are retained on failure. Physical iOS/Android devices have not been verified.

For English-to-Korean fallback, the app uses `noticemkjung/opus-mt-tc-big-en-ko-ONNX` q8 at `aea67600956847d47609f96b364f33a734007d50`. That conversion omits tokenizer assets. Local tokenizer JSON preserves the original English SentencePiece source IDs and scores, appends EOS, and decodes using the separate Korean target vocabulary. Using one shared ID map produced invalid repetition in browser QA; source IDs are regression-tested against the original SentencePiece model. See `vendor/EN-KO-TOKENIZER-NOTICE.md`. Only one translation direction's WASM pipeline is retained at a time to reduce memory use. Model downloads can be several hundred MB for the reverse direction.

After a 1.2-second typing pause, enabled translation refreshes the opposite language from whichever language was last edited. It is machine translation, not interview-coach rewriting, and terms, numbers and pronouns require review. The curated initial pairs are authored separately. The target language is marked outdated until updated and its TTS is blocked until synchronized. Every manual edit advances a revision, so old translation responses cannot overwrite later edits in either language. Generated results do not trigger reverse translation, avoiding feedback loops.

Edits remain private to local browser storage; they are not pushed to the public GitHub repo. Export/import backs up both languages and history. Returning to the model answer or restoring the previous revision is supported.

### Tests

```sh
npm test
npm run check
```

Tests cover paired-answer coverage, stale-response rejection, concurrent manual edits, history, backup compatibility and model-context chunking. Browser QA also exercises actual native and WASM translation and responsive editing.

### Translation references

- https://developer.chrome.com/docs/ai/translator-api
- https://huggingface.co/docs/transformers.js
- https://huggingface.co/Xenova/opus-mt-ko-en
- `vendor/transformers.min.js`: Transformers.js 3.8.1, Apache-2.0; see `vendor/TRANSFORMERS-LICENSE`.

### Neural TTS references and license

- https://github.com/hexgrad/kokoro/tree/main/kokoro.js
- https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- `vendor/kokoro.web.js`: kokoro-js 1.2.1, Apache-2.0; see `vendor/KOKORO-LICENSE`. Bundled dependencies retain their embedded license notices.
- English-to-Korean base model: https://huggingface.co/Helsinki-NLP/opus-mt-tc-big-en-ko (CC-BY-4.0).

### Source integration (2026-11-23)

The supplied 17-page Interview Complete PDF contributes 23 mapped early-round answers, their bilingual follow-ups, 11 candidate questions with candidate follow-through (not invented interviewer responses), and 3 closing statements. Existing card IDs are reused where questions overlap so personal records survive the update. Metrics keep their original definitions: the roughly 200-person organization includes DT/data/IT; processing success is not model accuracy; design completion is not full production rollout. Career-transition and personnel examples remain drafts to verify before use. The original PDF and local attachment paths are not published.

Browser QA verifies native translation in both directions, the separate-tokenizer WASM English→Korean path, real Kokoro audio output, responsive layouts, voice selection persistence and playlist sequencing. Physical mobile-device performance and uninterrupted playback while the screen is locked are not established.

The sidebar opens with all 23 PDF early-round questions as numbered direct links. Selecting one opens its question/answer/follow-up cards immediately. English is the initial display language (a one-time preference migration), and English comes before Korean in bilingual answers and follow-ups. The other categories remain available below the PDF question list.
