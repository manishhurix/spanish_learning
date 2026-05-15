# Spanish Medical Speech Learning Activity

A production-ready, browser-based Spanish medical terminology speaking activity built with only static assets:

- HTML
- CSS
- Vanilla JavaScript
- Browser Web Speech APIs
- Browser MediaRecorder / Web Audio APIs where useful
- No backend
- No third-party speech API
- No paid API key

## What it does

Learners can:

1. Open the page.
2. Grant microphone permission.
3. See Spanish medical terms.
4. Click **Play** to hear a Spanish term through browser text-to-speech.
5. Click **Now you try** to speak the term.
6. Let Chrome SpeechRecognition convert their speech to text.
7. See matched / almost matched / not matched feedback, score, recognized text, mismatch hints, and attempt count.

## Files

```txt
spanish-medical-speech-activity/
  index.html
  styles.css
  app.js
  README.md
```

## How to run locally

Open the project folder in a terminal and run one of these commands.

### Option 1: Node local server

```bash
npx serve .
```

### Option 2: Python local server

```bash
python3 -m http.server 8080
```

Then open the shown local URL in Google Chrome.

## Why `file://` may not work

Microphone access usually requires a secure context. Opening `index.html` directly through `file://` may block microphone permission and speech features.

For desktop testing, `localhost` is usually treated as secure by Chrome.

For actual mobile Chrome microphone testing, host the page on HTTPS or use a secure local tunnel.

## Browser requirements

Recommended browser:

- Google Chrome

Required browser capabilities:

- Microphone permission through `navigator.mediaDevices.getUserMedia`
- Speech recognition through `SpeechRecognition` or `webkitSpeechRecognition`
- Text-to-speech through `window.speechSynthesis`
- Secure context for microphone access

## Experimental Spanish speech-pack support

The app tries to detect Chrome's experimental local speech recognition APIs where available:

- `SpeechRecognition.available()`
- `SpeechRecognition.install()`
- `recognition.processLocally`

These APIs may not exist in all Chrome versions. If unsupported, the activity continues with normal Chrome browser-managed speech recognition using `lang = "es-ES"`.

The app does **not** claim to embed Chrome Spanish speech packs. Browser speech packs are browser-managed only.

## No external APIs

The application code does not call:

- OpenAI
- Google Cloud Speech
- Azure Speech
- AWS Transcribe
- ElevenLabs
- Whisper API
- Any third-party speech API

It only uses browser-provided APIs.

## Matching approach

This activity does not compare speech audio with speech audio.

It uses browser speech recognition to convert learner speech into text, then compares:

```txt
expected Spanish text vs recognized Spanish text
```

The matching logic includes:

- Lowercase normalization
- Punctuation removal
- Spanish accent normalization using Unicode NFD
- Extra whitespace collapse
- Alias support
- Word overlap for multi-word terms
- Levenshtein distance for closeness scoring

Examples:

- `presión arterial` and `presion arterial` score as a full match.
- `náusea` and `nausea` score as a full match.
- `inyección` and `infeccion` should score lower depending on recognition closeness.

## Future Excel / CSV readiness

The first version uses a local JavaScript array in `app.js`.

The loading path is isolated in:

```js
async function loadTerms() {
  return MEDICAL_TERMS;
}
```

Later, this can be replaced with loading from:

- CSV
- XLSX
- JSON
- LMS asset file

No core UI logic needs to change as long as the returned objects follow this shape:

```js
{
  id: 1,
  spanish: "dolor",
  english: "pain",
  category: "Symptoms",
  aliases: ["dolor"]
}
```

## SCORM / LTI readiness notes

This can be packaged as SCORM with static assets.

An LTI launch can host the same HTML page.

Important constraints:

- Microphone requires HTTPS / secure context.
- SCORM offline mode may not guarantee SpeechRecognition availability.
- Browser speech packs cannot be embedded in SCORM.
- Browser-managed APIs must handle language pack checking and installation gracefully.

## Android Chrome troubleshooting

If speech is detected but no transcript appears on Android Chrome, this usually means Chrome captured microphone audio but did not return a final Spanish `SpeechRecognition` transcript. This build keeps the best interim transcript as a fallback and also records the learner's latest attempt locally in memory.

Each term card includes **Play my voice** after the first attempt. This helps confirm whether the microphone actually captured the learner's voice. The recording is not uploaded anywhere and is overwritten by the next attempt for that term. It is not persisted after a page refresh.
