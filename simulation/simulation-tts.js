(function (global) {
  "use strict";

  let voices = [];
  let speechRunId = 0;
  const ENGLISH_RATE_MULTIPLIER = 1.0;
  const SPANISH_RATE_MULTIPLIER = 0.72;
  const DEFAULT_PAUSE_MS = 260;

  function refreshVoices() {
    if (!("speechSynthesis" in global)) return [];
    voices = global.speechSynthesis.getVoices();
    return voices;
  }

  function chooseVoice(languageCodes) {
    const availableVoices = voices.length ? voices : refreshVoices();
    return availableVoices.find((voice) => {
      const voiceLang = String(voice.lang || "").toLowerCase();
      return languageCodes.some((languageCode) => voiceLang.startsWith(languageCode.toLowerCase()));
    }) || null;
  }

  function getRequestedRate(options, fallbackRate) {
    return options && typeof options.rate === "number" ? options.rate : fallbackRate;
  }

  function calibrateRate(rate, multiplier) {
    return Math.max(0.1, Math.min(2, rate * multiplier));
  }

  function pause(ms, runId) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(runId === speechRunId), ms);
    });
  }

  function speakText(text, languageCodes, rate, runId) {
    return new Promise((resolve) => {
      if (runId !== speechRunId) {
        resolve(false);
        return;
      }

      if (!("speechSynthesis" in global) || typeof global.SpeechSynthesisUtterance === "undefined" || !text) {
        resolve(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCodes[0];
      utterance.rate = rate;
      utterance.pitch = 1;

      const voice = chooseVoice(languageCodes);
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve(runId === speechRunId);
      utterance.onerror = () => resolve(false);
      global.speechSynthesis.speak(utterance);
    });
  }

  function stopSpeaking() {
    speechRunId += 1;
    if ("speechSynthesis" in global) {
      global.speechSynthesis.cancel();
    }
  }

  async function speakEnglish(text, options) {
    const runId = options && options.runId ? options.runId : speechRunId;
    const rate = calibrateRate(getRequestedRate(options, 0.96), ENGLISH_RATE_MULTIPLIER);
    return speakText(text, ["en-US", "en"], rate, runId);
  }

  async function speakSpanish(text, options) {
    const runId = options && options.runId ? options.runId : speechRunId;
    const fallbackRate = options && options.slow ? 0.68 : 0.86;
    const rate = calibrateRate(getRequestedRate(options, fallbackRate), SPANISH_RATE_MULTIPLIER);
    return speakText(text, ["es-ES", "es-MX", "es"], rate, runId);
  }

  async function speakMultilingualSequence(sequence, options) {
    stopSpeaking();
    const runId = speechRunId;
    const settings = Object.assign({}, options, { runId });

    for (let i = 0; i < sequence.length; i += 1) {
      const item = sequence[i];
      let shouldContinue = true;

      if (item.pause) {
        shouldContinue = await pause(item.pause, runId);
      } else if (item.lang === "es") {
        shouldContinue = await speakSpanish(item.text, settings);
      } else {
        shouldContinue = await speakEnglish(item.text, settings);
      }

      if (!shouldContinue || runId !== speechRunId) break;
    }
  }

  function buildNodeSequence(node) {
    const sequence = [
      { lang: "en", text: node.botTextEnglish },
      { pause: DEFAULT_PAUSE_MS }
    ];

    if (node.patientLineSpanish) {
      sequence.push(
        { lang: "en", text: "The patient says:" },
        { pause: 180 },
        { lang: "es", text: node.patientLineSpanish },
        { pause: 360 }
      );
    }

    sequence.push(
      { lang: "en", text: node.learnerInstruction },
      { pause: DEFAULT_PAUSE_MS },
      { lang: "es", text: node.botTextSpanish }
    );

    return sequence;
  }

  async function speakNode(node, options) {
    await speakMultilingualSequence(buildNodeSequence(node), options);
  }

  if ("speechSynthesis" in global) {
    refreshVoices();
    if (typeof global.speechSynthesis.addEventListener === "function") {
      global.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    }
  }

  global.SimulationTTS = {
    speakEnglish,
    speakSpanish,
    speakNode,
    speakMultilingualSequence,
    stopSpeaking,
    refreshVoices
  };
})(window);
