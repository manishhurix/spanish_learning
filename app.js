/*
  Spanish Medical Speech Activity
  --------------------------------
  Static HTML/CSS/JS activity using only browser APIs.

  SCORM / LTI readiness notes:
  - This can be packaged as SCORM with static assets.
  - An LTI launch can host the same HTML page inside a secure web environment.
  - Microphone access requires HTTPS / secure context. localhost is usually treated as secure by browsers.
  - SCORM offline mode may not guarantee SpeechRecognition availability.
  - Browser speech packs cannot be embedded in SCORM.
  - Browser-managed APIs must handle language pack installation/checking gracefully.
*/

const MEDICAL_TERMS = [
  { id: 1, spanish: "dolor", english: "pain", category: "Symptoms", aliases: ["dolor"] },
  { id: 2, spanish: "fiebre", english: "fever", category: "Symptoms", aliases: ["fiebre"] },
  { id: 3, spanish: "tos", english: "cough", category: "Symptoms", aliases: ["tos"] },
  { id: 4, spanish: "mareo", english: "dizziness", category: "Symptoms", aliases: ["mareo"] },
  { id: 5, spanish: "náusea", english: "nausea", category: "Symptoms", aliases: ["nausea", "náusea"] },
  { id: 6, spanish: "presión arterial", english: "blood pressure", category: "Vitals", aliases: ["presion arterial", "presión arterial"] },
  { id: 7, spanish: "respiración", english: "breathing", category: "Vitals", aliases: ["respiracion", "respiración"] },
  { id: 8, spanish: "medicamento", english: "medicine", category: "Treatment", aliases: ["medicamento"] },
  { id: 9, spanish: "inyección", english: "injection", category: "Treatment", aliases: ["inyeccion", "inyección"] },
  { id: 10, spanish: "emergencia", english: "emergency", category: "Care", aliases: ["emergencia"] }
];

const MEDICAL_SENTENCES = [
  { id: 101, spanish: "Tengo mucho dolor en el pecho", english: "I have a lot of pain in my chest", category: "Symptoms", aliases: ["tengo mucho dolor en el pecho"] },
  { id: 102, spanish: "El paciente tiene fiebre alta", english: "The patient has a high fever", category: "Symptoms", aliases: ["el paciente tiene fiebre alta"] },
  { id: 103, spanish: "La tos no para desde ayer", english: "The cough hasn't stopped since yesterday", category: "Symptoms", aliases: ["la tos no para desde ayer"] },
  { id: 104, spanish: "Siento mucho mareo y náusea", english: "I feel very dizzy and nauseous", category: "Symptoms", aliases: ["siento mucho mareo y nausea", "siento mucho mareo y náusea"] },
  { id: 105, spanish: "Necesito revisar su presión arterial", english: "I need to check your blood pressure", category: "Vitals", aliases: ["necesito revisar su presion arterial", "necesito revisar su presión arterial"] },
  { id: 106, spanish: "Su respiración es muy rápida", english: "Your breathing is very fast", category: "Vitals", aliases: ["su respiracion es muy rapida", "su respiración es muy rápida"] },
  { id: 107, spanish: "Tome el medicamento cada ocho horas", english: "Take the medicine every eight hours", category: "Treatment", aliases: ["tome el medicamento cada ocho horas"] },
  { id: 108, spanish: "Necesita una inyección para el dolor", english: "You need an injection for the pain", category: "Treatment", aliases: ["necesita una inyeccion para el dolor", "necesita una inyección para el dolor"] },
  { id: 109, spanish: "Es una emergencia, llame al doctor", english: "It's an emergency, call the doctor", category: "Care", aliases: ["es una emergencia llame al doctor", "es una emergencia, llame al doctor"] },
  { id: 110, spanish: "Tiene náusea después de comer", english: "You have nausea after eating", category: "Symptoms", aliases: ["tiene nausea despues de comer", "tiene náusea después de comer"] }
];

const AppState = {
  hasMicPermission: false,
  recognitionSupported: false,
  recognitionMode: "unknown", // unknown | local | browser-managed | unavailable
  spanishVoiceAvailable: false,
  activeTermId: null,
  activeTab: "words", // words | sentences
  attempts: {},
  terms: [],
  sentenceTerms: [],
  voices: [],
  selectedSpanishVoice: null,
  activeRecognition: null,
  activeStream: null,
  volumeMonitor: null,
  speechTimeoutId: null,
  activeRecorder: null,
  recordedChunks: [],
  lastRecordings: {}
};

const DOM = {};

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  cacheDom();
  bindEvents();
  loadAttemptsFromStorage();
  updateChromeChip();
  await loadVoices();
  checkBrowserSupport();
}

function cacheDom() {
  DOM.permissionScreen = document.getElementById("permissionScreen");
  DOM.learningScreen = document.getElementById("learningScreen");
  DOM.enableMicBtn = document.getElementById("enableMicBtn");
  DOM.permissionStatus = document.getElementById("permissionStatus");
  DOM.chromeChip = document.getElementById("chromeChip");
  DOM.micChip = document.getElementById("micChip");
  DOM.recognitionChip = document.getElementById("recognitionChip");
  DOM.globalMessage = document.getElementById("globalMessage");
  DOM.installBanner = document.getElementById("installBanner");
  DOM.installPackBtn = document.getElementById("installPackBtn");
  DOM.continueBrowserBtn = document.getElementById("continueBrowserBtn");
  DOM.termsGrid = document.getElementById("termsGrid");
  DOM.wordsTab = document.getElementById("wordsTab");
  DOM.sentencesTab = document.getElementById("sentencesTab");
}

function bindEvents() {
  DOM.enableMicBtn.addEventListener("click", requestMicrophonePermission);
  DOM.installPackBtn.addEventListener("click", installSpanishPack);
  DOM.continueBrowserBtn.addEventListener("click", () => {
    AppState.recognitionMode = "browser-managed";
    DOM.installBanner.classList.add("hidden");
    updateRecognitionChip();
    showGlobalMessage("Continuing with Chrome's available browser-managed speech recognition mode.", "warning");
  });

  // Tab switching
  DOM.wordsTab.addEventListener("click", () => switchTab("words"));
  DOM.sentencesTab.addEventListener("click", () => switchTab("sentences"));

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = async () => {
      await loadVoices();
    };
  }
}

function switchTab(tab) {
  if (AppState.activeTab === tab) return;
  stopActiveRecognition();
  AppState.activeTab = tab;

  // Toggle active class on tab buttons
  DOM.wordsTab.classList.toggle("active", tab === "words");
  DOM.sentencesTab.classList.toggle("active", tab === "sentences");

  // Re-render the grid based on active tab
  if (tab === "words") {
    renderTerms(AppState.terms);
  } else {
    renderTerms(AppState.sentenceTerms);
  }
}

async function requestMicrophonePermission() {
  clearStatus(DOM.permissionStatus);
  DOM.enableMicBtn.disabled = true;
  DOM.enableMicBtn.textContent = "Requesting permission...";
  setStatus(DOM.permissionStatus, "Requesting microphone access...", "");

  if (!window.isSecureContext) {
    setStatus(
      DOM.permissionStatus,
      "Microphone access requires HTTPS or localhost. Please run this activity from a secure context.",
      "error"
    );
    DOM.enableMicBtn.disabled = false;
    DOM.enableMicBtn.textContent = "Retry Microphone Permission";
    return;
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    setStatus(DOM.permissionStatus, "This browser does not support microphone access through getUserMedia.", "error");
    DOM.enableMicBtn.disabled = false;
    DOM.enableMicBtn.textContent = "Retry Microphone Permission";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    AppState.hasMicPermission = true;
    setStatus(DOM.permissionStatus, "Microphone ready. Loading activity...", "success");
    await enterLearningPage();
  } catch (error) {
    const friendly = getMicPermissionMessage(error);
    setStatus(DOM.permissionStatus, friendly, "error");
    DOM.enableMicBtn.disabled = false;
    DOM.enableMicBtn.textContent = "Retry Microphone Permission";
  }
}

function getMicPermissionMessage(error) {
  if (!error) return "Microphone permission failed. Please try again.";
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Microphone permission was denied. Please allow microphone access in Chrome settings and try again.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No microphone was found. Please connect or enable a microphone and try again.";
  }
  if (error.name === "NotReadableError") {
    return "The microphone is already in use by another app or tab. Close it and try again.";
  }
  return `Microphone access failed: ${error.message || error.name}`;
}

async function enterLearningPage() {
  DOM.permissionScreen.classList.add("hidden");
  DOM.learningScreen.classList.remove("hidden");
  DOM.micChip.textContent = "Microphone: ready";
  DOM.micChip.className = "chip chip-success";

  checkBrowserSupport();
  await checkAndInstallSpanishSpeechPack();
  AppState.terms = await loadTerms();
  AppState.sentenceTerms = await loadSentences();
  renderTerms(AppState.terms);
}

function checkBrowserSupport() {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  AppState.recognitionSupported = Boolean(SpeechRecognitionCtor);

  if (!AppState.recognitionSupported) {
    AppState.recognitionMode = "unavailable";
    showGlobalMessage(
      "Speech recognition is not supported in this browser. Play audio can still work if text-to-speech is available, but speaking checks are disabled.",
      "error"
    );
  }

  updateRecognitionChip();
}

function updateChromeChip() {
  const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent);
  DOM.chromeChip.textContent = isChrome ? "Chrome: detected" : "Chrome: not detected";
  DOM.chromeChip.className = isChrome ? "chip chip-success" : "chip chip-warning";
}

function updateRecognitionChip() {
  const chip = DOM.recognitionChip;
  if (!AppState.recognitionSupported || AppState.recognitionMode === "unavailable") {
    chip.textContent = "Spanish recognition: unavailable";
    chip.className = "chip chip-danger";
    return;
  }

  if (AppState.recognitionMode === "local") {
    chip.textContent = "Spanish recognition: local";
    chip.className = "chip chip-success";
    return;
  }

  if (AppState.recognitionMode === "browser-managed") {
    chip.textContent = "Spanish recognition: browser-managed";
    chip.className = "chip chip-warning";
    return;
  }

  chip.textContent = "Spanish recognition: checking";
  chip.className = "chip";
}

async function checkAndInstallSpanishSpeechPack() {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();

  if (!SpeechRecognitionCtor) {
    AppState.recognitionMode = "unavailable";
    updateRecognitionChip();
    return;
  }

  const hasAvailable = typeof SpeechRecognitionCtor.available === "function";
  const hasInstall = typeof SpeechRecognitionCtor.install === "function";

  if (!hasAvailable || !hasInstall) {
    AppState.recognitionMode = "browser-managed";
    updateRecognitionChip();
    showGlobalMessage(
      "Local Spanish speech pack check is not available in this Chrome version. The app will use Chrome’s available speech recognition mode.",
      "warning"
    );
    return;
  }

  try {
    const availability = await SpeechRecognitionCtor.available({
      langs: ["es-ES"],
      processLocally: true
    });

    if (availability === true || availability === "available") {
      AppState.recognitionMode = "local";
      updateRecognitionChip();
      showGlobalMessage("Spanish local recognition appears to be available.", "success");
      return;
    }

    if (availability === "downloadable" || availability === "unavailable" || availability === false) {
      AppState.recognitionMode = "browser-managed";
      updateRecognitionChip();
      DOM.installBanner.classList.remove("hidden");
      return;
    }

    AppState.recognitionMode = "browser-managed";
    updateRecognitionChip();
    showGlobalMessage("Spanish recognition availability is unclear, so the activity will continue with browser-managed recognition.", "warning");
  } catch (error) {
    AppState.recognitionMode = "browser-managed";
    updateRecognitionChip();
    showGlobalMessage(
      "Local Spanish speech pack check failed. The app will continue with Chrome’s available speech recognition mode.",
      "warning"
    );
  }
}

async function installSpanishPack() {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  if (!SpeechRecognitionCtor || typeof SpeechRecognitionCtor.install !== "function") {
    showGlobalMessage("Spanish pack installation is not supported in this Chrome version.", "warning");
    return;
  }

  DOM.installPackBtn.disabled = true;
  DOM.installPackBtn.textContent = "Installing...";

  try {
    const installed = await SpeechRecognitionCtor.install({ langs: ["es-ES"] });
    if (installed === true || installed === "installed" || installed === "available") {
      showGlobalMessage("Spanish pack installed. Reloading the page so Chrome can apply the change...", "success");
      setTimeout(() => location.reload(), 1500);
    } else {
      AppState.recognitionMode = "browser-managed";
      updateRecognitionChip();
      DOM.installBanner.classList.add("hidden");
      showGlobalMessage("Spanish pack was not installed. Continuing with browser-managed recognition.", "warning");
    }
  } catch (error) {
    AppState.recognitionMode = "browser-managed";
    updateRecognitionChip();
    DOM.installBanner.classList.add("hidden");
    showGlobalMessage("Spanish pack installation failed or was cancelled. Continuing with browser-managed recognition.", "warning");
  } finally {
    DOM.installPackBtn.disabled = false;
    DOM.installPackBtn.textContent = "Install Spanish Pack";
  }
}

async function loadTerms() {
  // Future Excel/CSV integration point:
  // Replace this function with CSV, XLSX, JSON, or LMS asset loading logic.
  // Keep returned objects in the same shape: { id, spanish, english, category, aliases }.
  return MEDICAL_TERMS;
}

async function loadSentences() {
  return MEDICAL_SENTENCES;
}

function renderTerms(terms) {
  DOM.termsGrid.innerHTML = "";

  terms.forEach((term) => {
    const latestAttempt = getLatestAttempt(term.id);
    const card = document.createElement("article");
    card.className = "term-card";
    card.id = `term-${term.id}`;
    card.innerHTML = `
      <div class="term-top">
        <div>
          <h2 class="term-word">${escapeHtml(term.spanish)}</h2>
          <p class="term-meaning">${escapeHtml(term.english)}</p>
        </div>
        <span class="category-pill">${escapeHtml(term.category)}</span>
      </div>

      <div class="card-actions ${AppState.activeTab === 'sentences' ? 'has-speed' : ''}">
        <div class="play-group">
          <button class="btn btn-primary play-btn w-full" type="button" data-term-id="${term.id}" aria-label="Play ${escapeHtml(term.spanish)}">
            Play
          </button>
          ${AppState.activeTab === 'sentences' ? `
            <div class="speed-controls" aria-label="Playback speed">
              <button class="speed-btn" data-speed="0.5" data-term-id="${term.id}">0.5x</button>
              <button class="speed-btn" data-speed="0.75" data-term-id="${term.id}">0.75x</button>
              <button class="speed-btn active" data-speed="1.0" data-term-id="${term.id}">1.0x</button>
              <button class="speed-btn" data-speed="1.25" data-term-id="${term.id}">1.25x</button>
              <button class="speed-btn" data-speed="1.5" data-term-id="${term.id}">1.5x</button>
            </div>
          ` : ""}
        </div>
        <button class="btn btn-secondary try-btn" type="button" data-term-id="${term.id}" ${AppState.recognitionMode === "unavailable" ? "disabled" : ""}>
          Now you try
        </button>
        <button class="btn btn-ghost playback-btn" type="button" data-term-id="${term.id}" ${AppState.lastRecordings[term.id] ? "" : "disabled"}>
          Play my voice
        </button>
      </div>

      <div class="result-area" id="result-${term.id}" aria-live="polite">
        ${renderResultHtml(term.id, latestAttempt)}
      </div>
    `;

    DOM.termsGrid.appendChild(card);
  });

  document.querySelectorAll(".play-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const termId = Number(button.dataset.termId);
      const term = getTermById(termId);

      let speed = 0.86; // Default for words
      if (AppState.activeTab === "sentences") {
        const activeSpeedBtn = document.querySelector(`.speed-btn.active[data-term-id="${termId}"]`);
        speed = activeSpeedBtn ? parseFloat(activeSpeedBtn.dataset.speed) : 1.0;
      }

      speakSpanish(term.spanish, termId, speed);
    });
  });

  document.querySelectorAll(".speed-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const termId = Number(button.dataset.termId);
      // Remove active class from all speed buttons in this card
      document.querySelectorAll(`.speed-btn[data-term-id="${termId}"]`).forEach(btn => btn.classList.remove("active"));
      // Add active to the clicked one
      button.classList.add("active");
    });
  });

  document.querySelectorAll(".try-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const term = getTermById(Number(button.dataset.termId));
      listenAndEvaluate(term);
    });
  });

  document.querySelectorAll(".playback-btn").forEach((button) => {
    button.addEventListener("click", () => {
      playLastRecording(Number(button.dataset.termId));
    });
  });
}

function renderResultHtml(termId, latestAttempt) {
  const attempts = AppState.attempts[termId] || [];
  if (!latestAttempt) {
    return `
      <div class="result-heading">
        <span class="status-label">Ready</span>
        <span class="attempt-count">Attempts: ${attempts.length}</span>
      </div>
      <div class="score-track" aria-label="Score"><div class="score-fill" style="width: 0%"></div></div>
      <p class="feedback-message">Tap “Now you try” and speak the term clearly.</p>
      <p class="transcript">Recognized speech: —</p>
      <p class="hints">Missing words: —</p>
    `;
  }

  const statusText = latestAttempt.status === "matched" ? "Matched" : latestAttempt.status === "almost" ? "Almost matched" : "Not matched";
  const missing = latestAttempt.missingWords && latestAttempt.missingWords.length ? latestAttempt.missingWords.join(", ") : "—";
  const extra = latestAttempt.extraWords && latestAttempt.extraWords.length ? latestAttempt.extraWords.join(", ") : "—";

  const isSentence = AppState.activeTab === "sentences";
  const rubricsHtml = latestAttempt.rubrics ? `
    <div class="rubrics-container">
      <div class="rubric-row">
        <div class="rubric-header">
          <span class="rubric-label">Pronunciation</span>
          <span class="rubric-value">${latestAttempt.rubrics.pronunciation}%</span>
        </div>
        <div class="rubric-track"><div class="rubric-fill" style="width: ${latestAttempt.rubrics.pronunciation}%"></div></div>
      </div>
      <div class="rubric-row">
        <div class="rubric-header">
          <span class="rubric-label">Clarity</span>
          <span class="rubric-value">${latestAttempt.rubrics.clarity}%</span>
        </div>
        <div class="rubric-track"><div class="rubric-fill" style="width: ${latestAttempt.rubrics.clarity}%"></div></div>
      </div>
      <div class="rubric-row">
        <div class="rubric-header">
          <span class="rubric-label">${isSentence ? "Completeness" : "Word Purity"}</span>
          <span class="rubric-value">${isSentence ? latestAttempt.rubrics.completeness : latestAttempt.rubrics.purity}%</span>
        </div>
        <div class="rubric-track"><div class="rubric-fill" style="width: ${isSentence ? latestAttempt.rubrics.completeness : latestAttempt.rubrics.purity}%"></div></div>
      </div>
    </div>
  ` : '';

  return `
    <div class="result-heading">
      <span class="status-label ${latestAttempt.status}">${statusText} • ${latestAttempt.score}%</span>
      <span class="attempt-count">Attempts: ${attempts.length}</span>
    </div>
    <div class="score-track" aria-label="Score"><div class="score-fill" style="width: ${latestAttempt.score}%"></div></div>
    ${rubricsHtml}
    <p class="feedback-message">${escapeHtml(latestAttempt.message)}</p>
    <p class="transcript">Recognized speech: <strong>${escapeHtml(latestAttempt.recognizedText || "—")}</strong></p>
    <p class="hints">Missing words: ${escapeHtml(missing)} | Extra words: ${escapeHtml(extra)}</p>
  `;
}

async function loadVoices() {
  if (!("speechSynthesis" in window)) return [];

  const voices = await new Promise((resolve) => {
    const existingVoices = window.speechSynthesis.getVoices();
    if (existingVoices.length) {
      resolve(existingVoices);
      return;
    }

    const timeoutId = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 700);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeoutId);
      resolve(window.speechSynthesis.getVoices());
    };
  });

  AppState.voices = voices;
  AppState.selectedSpanishVoice = chooseSpanishVoice(voices);
  AppState.spanishVoiceAvailable = Boolean(AppState.selectedSpanishVoice);
  return voices;
}

function chooseSpanishVoice(voices) {
  const spanishVoices = voices.filter((voice) => voice.lang && voice.lang.toLowerCase().startsWith("es"));
  if (!spanishVoices.length) return null;

  const preferred = spanishVoices.find((voice) => {
    const name = voice.name.toLowerCase();
    return name.includes("spanish") || name.includes("españa") || name.includes("mexico") || name.includes("méxico") || name.includes("google español");
  });

  return preferred || spanishVoices[0];
}

function speakSpanish(text, termId, speed = 0.86) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    showGlobalMessage("Text-to-speech is not supported in this browser.", "error");
    return;
  }

  if (!AppState.spanishVoiceAvailable) {
    showGlobalMessage("No Spanish voice was found. The app will still request es-ES pronunciation from the browser.", "warning");
  }

  window.speechSynthesis.cancel();

  const button = document.querySelector(`.play-btn[data-term-id="${termId}"]`);
  const originalText = button ? button.textContent : "Play";
  if (button) {
    button.disabled = true;
    button.textContent = "Speaking...";
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = speed;
  utterance.pitch = 1;
  if (AppState.selectedSpanishVoice) utterance.voice = AppState.selectedSpanishVoice;

  utterance.onend = utterance.onerror = () => {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  window.speechSynthesis.speak(utterance);
}

async function listenAndEvaluate(term) {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  if (!SpeechRecognitionCtor) {
    updateResultUI(term.id, {
      recognizedText: "",
      score: 0,
      status: "not_matched",
      expectedNormalized: normalizeSpanish(term.spanish),
      recognizedNormalized: "",
      missingWords: normalizeSpanish(term.spanish).split(" "),
      extraWords: [],
      message: "Speech recognition is not supported in this browser."
    }, false);
    return;
  }

  stopActiveRecognition();
  setTermButtonsDisabled(true, term.id);
  AppState.activeTermId = term.id;

  const userAgent = navigator.userAgent;
  const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isWindows = /Win/.test(userAgent);

  let stream;
  let volumeMonitor;
  let finalTranscript = "";
  let interimTranscriptCache = "";
  let bestTranscript = "";
  let bestConfidence = 0;
  let smartSilenceTimer = null;

  try {
    // Android Chrome blocks SpeechRecognition if getUserMedia holds the microphone.
    if (!isAndroid) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      AppState.activeStream = stream;
      volumeMonitor = await createVolumeMonitor(stream);
      AppState.volumeMonitor = volumeMonitor;
      startAttemptRecording(stream, term.id);
    } else {
      volumeMonitor = await createVolumeMonitor(null);
    }

    const recognition = new SpeechRecognitionCtor();
    AppState.activeRecognition = recognition;
    recognition.lang = "es-ES";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    if ("processLocally" in recognition && AppState.recognitionMode === "local") {
      recognition.processLocally = true;
    }

    updateLiveResult(term.id, "Listening... speak now", "", true);

    const recognitionPromise = new Promise((resolve) => {
      recognition.onresult = (event) => {
        if (isAppleDevice) {
          // Apple (Mac/iOS): Needs manual force-stop timer
          if (smartSilenceTimer) clearTimeout(smartSilenceTimer);
          smartSilenceTimer = setTimeout(() => {
            try { recognition.stop(); } catch (e) { }
          }, 2000);
        } else if (isAndroid) {
          // Android: Let it use native default auto-stop
        } else if (isWindows) {
          // Windows: Let it use native default auto-stop
        }

        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0] ? result[0].transcript : "";
          const confidence = result[0] ? result[0].confidence || 0 : 0;

          // Android Chrome sometimes emits useful interim text but ends before marking it final.
          // Keep the best/latest transcript as a fallback so speech is not discarded.
          if (transcript && (confidence >= bestConfidence || !bestTranscript)) {
            bestTranscript = transcript.trim();
            bestConfidence = confidence;
          }

          if (result.isFinal) {
            finalTranscript += ` ${transcript}`;
          } else {
            interimTranscript += ` ${transcript}`;
          }
        }

        interimTranscriptCache = interimTranscript.trim() || interimTranscriptCache;
        updateLiveResult(term.id, "Listening...", finalTranscript || interimTranscriptCache || bestTranscript, true);
      };

      recognition.onerror = (event) => {
        if (smartSilenceTimer) clearTimeout(smartSilenceTimer);
        if (isAppleDevice && smartSilenceTimer) clearTimeout(smartSilenceTimer);
        resolve({ type: "error", error: event.error });
      };

      recognition.onend = () => {
        if (isAppleDevice && smartSilenceTimer) clearTimeout(smartSilenceTimer);
        resolve({ type: "end" });
      };
    });

    recognition.start();

    const listenTimeout = AppState.activeTab === "sentences" ? 18000 : 7000;
    AppState.speechTimeoutId = setTimeout(() => {
      try {
        recognition.stop();
      } catch (error) {
        // Recognition may already be stopped. Ignore safely.
      }
    }, listenTimeout);

    const outcome = await recognitionPromise;
    clearTimeout(AppState.speechTimeoutId);
    if (isAppleDevice && smartSilenceTimer) clearTimeout(smartSilenceTimer);

    await stopAttemptRecording(term.id);
    const monitorStats = volumeMonitor.getStats();
    const cleanTranscript = (finalTranscript || bestTranscript || interimTranscriptCache).trim();

    if (!monitorStats.hasDetectedVoice && !cleanTranscript) {
      const noSpeechResult = createNoSpeechResult(term, "No clear speech detected. Please try again and speak closer to the microphone.");
      updateResultUI(term.id, noSpeechResult, true);
      return;
    }

    if (outcome.type === "error" && !cleanTranscript) {
      const message = getRecognitionErrorMessage(outcome.error);
      const errorResult = createNoSpeechResult(term, message);
      updateResultUI(term.id, errorResult, true);
      return;
    }

    if (!cleanTranscript) {
      const noTextResult = createNoSpeechResult(term, "Speech was detected, but Chrome did not return a clear Spanish transcript. Please try again.");
      updateResultUI(term.id, noTextResult, true);
      return;
    }

    const evaluation = evaluateSpeech(term.spanish, term.aliases, cleanTranscript);
    evaluation.confidence = bestConfidence;
    evaluation.rubrics.clarity = Math.round(bestConfidence * 100);
    updateResultUI(term.id, evaluation, true);
  } catch (error) {
    const result = createNoSpeechResult(term, getMicPermissionMessage(error));
    updateResultUI(term.id, result, true);
  } finally {
    cleanupListeningResources();
    setTermButtonsDisabled(false, term.id);
    AppState.activeTermId = null;
  }
}

async function createVolumeMonitor(stream) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor || !stream) {
    return {
      stop() { },
      getStats() {
        return { hasDetectedVoice: true, averageVolume: 0, peakVolume: 0 };
      }
    };
  }

  const audioContext = new AudioContextCtor();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.fftSize);
  let running = true;
  let sampleCount = 0;
  let totalVolume = 0;
  let peakVolume = 0;
  let hasDetectedVoice = false;
  const threshold = 0.018;

  function tick() {
    if (!running) return;
    analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i += 1) {
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / dataArray.length);
    totalVolume += rms;
    sampleCount += 1;
    peakVolume = Math.max(peakVolume, rms);
    if (rms > threshold) hasDetectedVoice = true;

    requestAnimationFrame(tick);
  }

  tick();

  return {
    stop() {
      running = false;
      try {
        source.disconnect();
        analyser.disconnect();
      } catch (error) {
        // Safe cleanup best effort.
      }
      if (audioContext.state !== "closed") audioContext.close();
    },
    getStats() {
      return {
        hasDetectedVoice,
        averageVolume: sampleCount ? totalVolume / sampleCount : 0,
        peakVolume
      };
    }
  };
}

function normalizeSpanish(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[¡!¿?.,;:\"'`´()[\]{}<>/\\|@#$%^&*_+=~]/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateSpeech(expectedTerm, aliases, recognizedText) {
  const expectedNormalized = normalizeSpanish(expectedTerm);
  const recognizedNormalized = normalizeSpanish(recognizedText);
  const normalizedAliases = (aliases || []).map(normalizeSpanish).filter(Boolean);
  const acceptableTargets = Array.from(new Set([expectedNormalized, ...normalizedAliases]));

  if (!recognizedNormalized) {
    return {
      score: 0,
      status: "not_matched",
      expectedNormalized,
      recognizedNormalized,
      missingWords: expectedNormalized.split(" ").filter(Boolean),
      extraWords: [],
      message: "No clear speech detected. Please try again.",
      rubrics: { pronunciation: 0, completeness: 0, purity: 0 }
    };
  }

  if (acceptableTargets.includes(recognizedNormalized)) {
    return {
      score: 100,
      status: "matched",
      expectedNormalized,
      recognizedNormalized,
      missingWords: [],
      extraWords: [],
      message: "Excellent. Your pronunciation matched the expected term.",
      rubrics: { pronunciation: 100, completeness: 100, purity: 100 }
    };
  }

  const targetScores = acceptableTargets.map((target) => scoreAgainstTarget(target, recognizedNormalized));
  const best = targetScores.sort((a, b) => b.score - a.score)[0];
  const score = Math.max(0, Math.min(100, Math.round(best.score)));
  const isSentence = AppState.activeTab === "sentences";
  const status = isSentence
    ? (score >= 80 ? "matched" : score >= 55 ? "almost" : "not_matched")
    : (score >= 90 ? "matched" : score >= 70 ? "almost" : "not_matched");

  let message;
  if (status === "matched") {
    message = isSentence
      ? "Great job! Your sentence pronunciation was clearly understood."
      : "Good match. Chrome heard a very close version of the term.";
  } else if (status === "almost") {
    message = isSentence
      ? "Almost there! Focus on the missing words and try the full sentence again."
      : "Almost matched. Try again slowly and focus on the highlighted missing or extra words.";
  } else {
    message = isSentence
      ? "Not matched yet. Listen to the sentence again, then repeat it slowly and clearly."
      : "Not matched yet. Listen again, then repeat the Spanish term clearly.";
  }

  return {
    score,
    status,
    expectedNormalized,
    recognizedNormalized,
    missingWords: best.missingWords,
    extraWords: best.extraWords,
    message,
    rubrics: {
      pronunciation: Math.round(best.similarityScore || score),
      completeness: Math.round(best.overlapScore || 100),
      purity: Math.max(0, 100 - (best.extraWords.length * 25))
    }
  };
}

function scoreAgainstTarget(target, recognized) {
  const targetWords = target.split(" ").filter(Boolean);
  const recognizedWords = recognized.split(" ").filter(Boolean);
  const targetSet = new Set(targetWords);
  const recognizedSet = new Set(recognizedWords);

  const matchedWords = targetWords.filter((word) => recognizedSet.has(word));
  const missingWords = targetWords.filter((word) => !recognizedSet.has(word));
  const extraWords = recognizedWords.filter((word) => !targetSet.has(word));

  const overlapScore = targetWords.length ? (matchedWords.length / targetWords.length) * 100 : 0;
  const maxLength = Math.max(target.length, recognized.length, 1);
  const distance = levenshteinDistance(target, recognized);
  const similarityScore = (1 - distance / maxLength) * 100;

  let score;
  if (targetWords.length > 1) {
    score = overlapScore * 0.58 + similarityScore * 0.42;
    score -= Math.min(extraWords.length * 8, 18);
  } else {
    score = similarityScore;
    score -= extraWords.length * 20;
    if (similarityScore < 40) score = 0;
  }

  return { score, missingWords, extraWords, similarityScore, overlapScore };
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function updateLiveResult(termId, message, transcript, recording) {
  const resultArea = document.getElementById(`result-${termId}`);
  const attempts = AppState.attempts[termId] || [];
  resultArea.innerHTML = `
    <div class="result-heading">
      <span class="status-label ${recording ? "recording-pulse" : ""}">${escapeHtml(message)}</span>
      <span class="attempt-count">Attempts: ${attempts.length}</span>
    </div>
    <div class="score-track"><div class="score-fill" style="width: 0%"></div></div>
    <p class="feedback-message">Listening for Spanish speech...</p>
    <p class="transcript live-transcript">Live transcript: <strong>${escapeHtml(transcript || "—")}</strong></p>
    <p class="hints">Tip: speak one term clearly, then pause.</p>
  `;
}

function updateResultUI(termId, result, shouldSave) {
  if (shouldSave) {
    if (!AppState.attempts[termId]) AppState.attempts[termId] = [];
    AppState.attempts[termId].push({
      recognizedText: result.recognizedText || result.recognizedNormalized || "",
      score: result.score,
      status: result.status,
      expectedNormalized: result.expectedNormalized,
      recognizedNormalized: result.recognizedNormalized,
      missingWords: result.missingWords || [],
      extraWords: result.extraWords || [],
      message: result.message,
      rubrics: result.rubrics || null,
      timestamp: new Date().toISOString()
    });
    saveAttempts();
  }

  const latestAttempt = getLatestAttempt(termId) || result;
  const resultArea = document.getElementById(`result-${termId}`);
  resultArea.innerHTML = renderResultHtml(termId, latestAttempt);
}

function saveAttempts() {
  try {
    localStorage.setItem("spanishMedicalSpeechAttempts", JSON.stringify(AppState.attempts));
  } catch (error) {
    // localStorage may be blocked. Attempts will remain in memory.
  }
}

function loadAttemptsFromStorage() {
  try {
    localStorage.removeItem("spanishMedicalSpeechAttempts");
    AppState.attempts = {};
  } catch (error) {
    AppState.attempts = {};
  }
}

function getLatestAttempt(termId) {
  const attempts = AppState.attempts[termId] || [];
  return attempts.length ? attempts[attempts.length - 1] : null;
}

function createNoSpeechResult(term, message) {
  return {
    recognizedText: "",
    score: 0,
    status: "not_matched",
    expectedNormalized: normalizeSpanish(term.spanish),
    recognizedNormalized: "",
    missingWords: normalizeSpanish(term.spanish).split(" ").filter(Boolean),
    extraWords: [],
    message
  };
}

function getRecognitionErrorMessage(errorCode) {
  const messages = {
    "no-speech": "No clear speech detected. Please try again and speak clearly.",
    "audio-capture": "Chrome could not capture microphone audio. Check your microphone and try again.",
    "not-allowed": "Microphone access is blocked. Please allow microphone permission in Chrome settings.",
    network: "Chrome speech recognition reported a network error. Try again or continue later.",
    "language-not-supported": "Spanish speech recognition is not supported by this Chrome setup.",
    aborted: "Speech recognition was stopped. Please try again."
  };

  return messages[errorCode] || "Speech recognition failed. Please try again.";
}

function setTermButtonsDisabled(disabled, activeTermId) {
  document.querySelectorAll(".play-btn, .try-btn, .playback-btn").forEach((button) => {
    const termId = Number(button.dataset.termId);
    const isTry = button.classList.contains("try-btn");
    const isPlayback = button.classList.contains("playback-btn");
    button.disabled = disabled || (isTry && AppState.recognitionMode === "unavailable") || (isPlayback && !AppState.lastRecordings[termId]);
    if (termId === activeTermId && isTry) {
      button.textContent = disabled ? "Listening..." : "Now you try";
    }
  });
}

function stopActiveRecognition() {
  if (AppState.activeRecognition) {
    try {
      AppState.activeRecognition.stop();
    } catch (error) {
      // Already stopped. Ignore safely.
    }
  }
  cleanupListeningResources();
}

function cleanupListeningResources() {
  if (AppState.speechTimeoutId) {
    clearTimeout(AppState.speechTimeoutId);
    AppState.speechTimeoutId = null;
  }

  if (AppState.activeRecorder && AppState.activeRecorder.state !== "inactive") {
    try {
      AppState.activeRecorder.stop();
    } catch (error) {
      // Recorder may already be stopped. Ignore safely.
    }
  }

  if (AppState.volumeMonitor) {
    AppState.volumeMonitor.stop();
    AppState.volumeMonitor = null;
  }

  if (AppState.activeStream) {
    AppState.activeStream.getTracks().forEach((track) => track.stop());
    AppState.activeStream = null;
  }

  AppState.activeRecognition = null;
}

function startAttemptRecording(stream, termId) {
  if (typeof MediaRecorder === "undefined") return;

  try {
    AppState.recordedChunks = [];
    const recorder = new MediaRecorder(stream);
    AppState.activeRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        AppState.recordedChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (!AppState.recordedChunks.length) return;
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(AppState.recordedChunks, { type: mimeType });

      if (AppState.lastRecordings[termId]) {
        URL.revokeObjectURL(AppState.lastRecordings[termId].url);
      }

      AppState.lastRecordings[termId] = {
        blob,
        url: URL.createObjectURL(blob),
        createdAt: new Date().toISOString()
      };

      const playbackBtn = document.querySelector(`.playback-btn[data-term-id="${termId}"]`);
      if (playbackBtn) playbackBtn.disabled = false;
    };

    recorder.start();
  } catch (error) {
    // Recording playback is a helper feature. SpeechRecognition can continue without it.
    AppState.activeRecorder = null;
    AppState.recordedChunks = [];
  }
}

function stopAttemptRecording(termId) {
  return new Promise((resolve) => {
    const recorder = AppState.activeRecorder;
    if (!recorder || recorder.state === "inactive") {
      resolve();
      return;
    }

    const previousOnStop = recorder.onstop;
    recorder.onstop = (event) => {
      if (typeof previousOnStop === "function") previousOnStop(event);
      AppState.activeRecorder = null;
      resolve();
    };

    try {
      recorder.stop();
    } catch (error) {
      AppState.activeRecorder = null;
      resolve();
    }

    setTimeout(resolve, 800);
  });
}

function playLastRecording(termId) {
  const recording = AppState.lastRecordings[termId];
  if (!recording) {
    showGlobalMessage("No recording is available for this term yet. Tap “Now you try” first.", "warning");
    return;
  }

  window.speechSynthesis?.cancel?.();
  const button = document.querySelector(`.playback-btn[data-term-id="${termId}"]`);
  const originalText = button ? button.textContent : "Play my voice";
  const audio = new Audio(recording.url);

  if (button) {
    button.disabled = true;
    button.textContent = "Playing...";
  }

  audio.onended = audio.onerror = () => {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  audio.play().catch(() => {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
    showGlobalMessage("Chrome could not play the latest recording. Please try recording again.", "warning");
  });
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function getTermById(id) {
  return AppState.terms.find((term) => term.id === id) || AppState.sentenceTerms.find((term) => term.id === id);
}

function showGlobalMessage(message, type) {
  DOM.globalMessage.textContent = message;
  DOM.globalMessage.className = `global-message ${type || ""}`.trim();
  DOM.globalMessage.classList.remove("hidden");
}

function setStatus(element, message, type) {
  element.textContent = message;
  element.className = `status-box ${type || ""}`.trim();
}

function clearStatus(element) {
  element.textContent = "";
  element.className = "status-box";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
