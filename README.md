# BEN Interview Practice

A responsive Korean/English interview practice app for desktop and mobile. Independent preparation material, not an official BEN product. The five-stage sequence is a preparation simulation inferred from a supplied job description.

## Features

- First interview: November 23, 2026, HR Director. Dedicated culture-fit, size, technology, motivation and logistics deck; stage-by-stage preparation roadmap.
- 30 stage questions, 20 ELM/technical questions, 10 pressure drills, 8 STAR stories, 20 cue cards, and preparation guides.
- Search, favorites, practiced markers, answer hiding, 60/90/120-second timer, and personal notes.
- Browser TTS: English answers, questions, cue cards, or full content; voice/rate selection, pause/stop, repeat, continuous playback.
- Device-local progress with JSON backup/import; no account, analytics, or server-side storage.
- Installable manifest and service-worker offline reading after initial online load.
- Vendored MIT-licensed Marked parser; no runtime CDN dependency.

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
