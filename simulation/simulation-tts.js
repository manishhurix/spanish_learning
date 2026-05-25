(function (global) {
  "use strict";

  let voices = [];
  const ENGLISH_RATE_MULTIPLIER = 1.05;
  const SPANISH_RATE_MULTIPLIER = 0.82;

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

  function speakText(text, languageCodes, rate) {
    return new Promise((resolve) => {
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

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      global.speechSynthesis.speak(utterance);
    });
  }

  function getRequestedRate(options, fallbackRate) {
    return options && typeof options.rate === "number" ? options.rate : fallbackRate;
  }

  function calibrateRate(rate, multiplier) {
    return Math.max(0.1, Math.min(2, rate * multiplier));
  }

  function stopSpeaking() {
    if ("speechSynthesis" in global) {
      global.speechSynthesis.cancel();
    }
  }

  async function speakEnglish(text, options) {
    const rate = calibrateRate(getRequestedRate(options, 0.96), ENGLISH_RATE_MULTIPLIER);
    return speakText(text, ["en-US", "en"], rate);
  }

  async function speakSpanish(text, options) {
    const fallbackRate = options && options.slow ? 0.68 : 0.86;
    const rate = calibrateRate(getRequestedRate(options, fallbackRate), SPANISH_RATE_MULTIPLIER);
    return speakText(text, ["es-ES", "es-MX", "es"], rate);
  }

  async function speakNode(node, options) {
    stopSpeaking();
    await speakEnglish(node.botTextEnglish, options);
    if (node.botTextSpanish) {
      await speakSpanish(node.botTextSpanish, options);
    }
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
    stopSpeaking,
    refreshVoices
  };
})(window);
