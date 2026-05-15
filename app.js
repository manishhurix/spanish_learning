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

const AppState = {
  hasMicPermission: false,
  recognitionSupported: false,
  recognitionMode: "unknown", // unknown | local | browser-managed | unavailable
  spanishVoiceAvailable: false,
  activeTermId: null,
  attempts: {},
  terms: [],
  voices: [],
  selectedSpanishVoice: null,
  activeRecognition: null,
  activeStream: null,
  volumeMonitor: null,
  speechTimeoutId: null
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

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = async () => {
      await loadVoices();
    };
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

    if (availability === "downloadable" || availability === "downloading" || availability === "unavailable" || availability === false) {
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
    const installed = await SpeechRecognitionCtor.install({
      langs: ["es-ES"],
      processLocally: true
    });
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

      <div class="card-actions">
        <button class="btn btn-primary play-btn" type="button" data-term-id="${term.id}" aria-label="Play ${escapeHtml(term.spanish)}">
          Play
        </button>
        <button class="btn btn-secondary try-btn" type="button" data-term-id="${term.id}" ${AppState.recognitionMode === "unavailable" ? "disabled" : ""}>
          Now you try
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
      const term = getTermById(Number(button.dataset.termId));
      speakSpanish(term.spanish, term.id);
    });
  });

  document.querySelectorAll(".try-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const term = getTermById(Number(button.dataset.termId));
      listenAndEvaluate(term);
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

  return `
    <div class="result-heading">
      <span class="status-label ${latestAttempt.status}">${statusText} • ${latestAttempt.score}%</span>
      <span class="attempt-count">Attempts: ${attempts.length}</span>
    </div>
    <div class="score-track" aria-label="Score"><div class="score-fill" style="width: ${latestAttempt.score}%"></div></div>
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

function speakSpanish(text, termId) {
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
  utterance.rate = 0.86;
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

  let stream;
  let volumeMonitor;
  let finalTranscript = "";
  let latestInterimTranscript = "";
  let bestConfidence = 0;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    AppState.activeStream = stream;
    volumeMonitor = await createVolumeMonitor(stream);
    AppState.volumeMonitor = volumeMonitor;

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
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0] ? result[0].transcript : "";
          const confidence = result[0] ? result[0].confidence || 0 : 0;
          bestConfidence = Math.max(bestConfidence, confidence);

          if (result.isFinal) {
            finalTranscript += ` ${transcript}`;
          } else {
            interimTranscript += ` ${transcript}`;
          }
        }

        latestInterimTranscript = interimTranscript.trim() || latestInterimTranscript;
        updateLiveResult(term.id, "Listening...", finalTranscript.trim() || latestInterimTranscript, true);
      };

      recognition.onerror = (event) => {
        resolve({ type: "error", error: event.error });
      };

      recognition.onend = () => {
        resolve({ type: "end" });
      };
    });

    recognition.start();

    AppState.speechTimeoutId = setTimeout(() => {
      try {
        recognition.stop();
      } catch (error) {
        // Recognition may already be stopped. Ignore safely.
      }
    }, 7000);

    const outcome = await recognitionPromise;
    clearTimeout(AppState.speechTimeoutId);

    const monitorStats = volumeMonitor.getStats();
    const cleanTranscript = finalTranscript.trim() || latestInterimTranscript.trim();

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
  if (!AudioContextCtor) {
    return {
      stop() {},
      getStats() {
        return { hasDetectedVoice: true, averageVolume: 0, peakVolume: 0 };
      }
    };
  }

  const audioContext = new AudioContextCtor();
  if (audioContext.state === "suspended" && typeof audioContext.resume === "function") {
    try {
      await audioContext.resume();
    } catch (error) {
      // Some mobile browsers keep AudioContext suspended until the next user gesture.
      // SpeechRecognition remains the primary signal, so volume monitoring can continue best-effort.
    }
  }
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
      message: "No clear speech detected. Please try again."
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
      message: "Excellent. Your pronunciation matched the expected term."
    };
  }

  const targetScores = acceptableTargets.map((target) => scoreAgainstTarget(target, recognizedNormalized));
  const best = targetScores.sort((a, b) => b.score - a.score)[0];
  const score = Math.max(0, Math.min(100, Math.round(best.score)));
  const status = score >= 90 ? "matched" : score >= 70 ? "almost" : "not_matched";

  let message;
  if (status === "matched") {
    message = "Good match. Chrome heard a very close version of the term.";
  } else if (status === "almost") {
    message = "Almost matched. Try again slowly and focus on the highlighted missing or extra words.";
  } else {
    message = "Not matched yet. Listen again, then repeat the Spanish term clearly.";
  }

  return {
    score,
    status,
    expectedNormalized,
    recognizedNormalized,
    missingWords: best.missingWords,
    extraWords: best.extraWords,
    message
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
  }

  return { score, missingWords, extraWords };
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
    const stored = localStorage.getItem("spanishMedicalSpeechAttempts");
    AppState.attempts = stored ? JSON.parse(stored) : {};
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
  document.querySelectorAll(".play-btn, .try-btn").forEach((button) => {
    const termId = Number(button.dataset.termId);
    button.disabled = disabled || (button.classList.contains("try-btn") && AppState.recognitionMode === "unavailable");
    if (termId === activeTermId && button.classList.contains("try-btn")) {
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

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function getTermById(id) {
  return AppState.terms.find((term) => term.id === id);
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
