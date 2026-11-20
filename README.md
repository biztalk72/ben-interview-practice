# BEN Interview Practice

A responsive Korean/English interview practice app for desktop and mobile. Independent preparation material, not an official BEN product. The five-stage sequence is a preparation simulation inferred from a supplied job description.

## Features

- First interview: November 23, 2026, HR Director. Dedicated culture-fit, size, technology, motivation and logistics deck; stage-by-stage preparation roadmap.
- 30 stage questions, 20 ELM/technical questions, 10 pressure drills, 8 STAR stories, 20 cue cards, and preparation guides.
- 82 substantive Korean/English model-answer pairs shown before coaching notes.
- Editable paired answers, debounced Korean-to-English regeneration, stale-English detection, manual English edits, and bounded undo history.
- Search, favorites, practiced markers, answer hiding, 60/90/120-second timer, and personal notes.
- Browser TTS: English answers, questions, cue cards, or full content; voice/rate selection, pause/stop, repeat, continuous playback.
- Device-local progress and both edited languages with JSON backup/import; no account, analytics, or server-side storage.
- Installable manifest and service-worker offline reading after initial online load.
- Static study/TTS features have no CDN dependency. Optional local translation downloads a pinned model and runtime; no API key is required.

## Run locally

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. Use HTTPS or localhost for service workers. A direct `file://` open cannot load the JSON/module reliably.

## Publish

GitHub Pages: deploy `main` branch, `/` root. All asset links are relative and work under `/ben-interview-practice/`.

## TTS and storage limits

Voices depend on OS/browser installation. Some voices may use the OS vendor's network service; the app has no paid TTS API and does not upload notes. Mobile playback requires a user gesture and may pause on screen lock or app switching. Offline reading is separate from offline voice availability. Device-local records do not sync automatically: export a backup, transfer it, and import on another device. Import merges known card records and replaces values for matching IDs.

## Content

Source preparation material reviewed on 2026-11-20. Examples must be checked against the candidate's actual experience. Company technology claims are distinguished from proposed system designs and unpublished details. Original resumes, portfolio PDFs, contact details, and local attachment paths are not included.

## Third-party license

`vendor/marked.js` — Marked 17.0.5, MIT; see `vendor/MARKED-LICENSE.md`.

## Automatic Korean-to-English updates

Press **자동번역 켜기** once. Supported desktop browsers use their built-in Translator API. Other browsers use a module Web Worker with Transformers.js 3.8.1, ONNX Runtime WASM (one thread), and `Xenova/opus-mt-ko-en` q8, revision `d9fa1ac6008242100fecb4fff9b0a5917a1be81f`. First model/runtime download is roughly 150 MB; the app does not download weights until translation is requested. The model is retrieved from Hugging Face and the WASM binary from jsDelivr. Translation inference runs locally; answer text is not posted to a translation server. Device RAM, browser support and network policy may limit initialization; existing answers are retained on failure. Physical iOS/Android devices have not been verified.

After a 1.2-second typing pause, enabled translation refreshes the English draft. It is machine translation, not interview-coach rewriting, and terms, numbers and pronouns require review. The curated initial pairs are authored separately. Previously generated English is marked outdated until updated. TTS will not silently read outdated English. A response for old Korean input or an English edit made while translation runs cannot overwrite newer work.

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
