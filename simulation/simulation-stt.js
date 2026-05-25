(function (global) {
  "use strict";

  let activeRecognition = null;
  let activeTimeoutId = null;

  function getSpeechRecognitionCtor() {
    return global.SpeechRecognition || global.webkitSpeechRecognition;
  }

  function stopListening() {
    if (activeTimeoutId) {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = null;
    }

    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch (error) {
        // Recognition may already be stopped by the browser.
      }
    }
  }

  function getFriendlyError(errorCode) {
    const messages = {
      "no-speech": "No clear speech was detected. Try speaking a little closer to the microphone.",
      "audio-capture": "Chrome could not capture microphone audio. Check your microphone and try again.",
      "not-allowed": "Microphone access is blocked. Allow microphone permission in your browser settings.",
      network: "Speech recognition reported a network error. Try again when the browser is ready.",
      "language-not-supported": "Spanish speech recognition is not supported by this browser setup.",
      aborted: "Listening stopped before a clear answer was captured."
    };

    return messages[errorCode] || "Speech recognition failed. Please try again.";
  }

  function startListening(options) {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    const settings = options || {};

    return new Promise((resolve) => {
      if (!SpeechRecognitionCtor) {
        resolve({
          transcript: "",
          confidence: 0,
          error: "unsupported",
          message: "Speech recognition is not supported in this browser."
        });
        return;
      }

      stopListening();

      const recognition = new SpeechRecognitionCtor();
      activeRecognition = recognition;
      let finalTranscript = "";
      let bestTranscript = "";
      let bestConfidence = 0;
      let settled = false;

      function finish(payload) {
        if (settled) return;
        settled = true;
        if (activeTimeoutId) {
          clearTimeout(activeTimeoutId);
          activeTimeoutId = null;
        }
        activeRecognition = null;
        resolve(payload);
      }

      recognition.lang = settings.lang || "es-ES";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 3;

      if ("processLocally" in recognition && settings.processLocally) {
        recognition.processLocally = true;
      }

      recognition.onresult = (event) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const alternative = result[0];
          const transcript = alternative ? alternative.transcript.trim() : "";
          const confidence = alternative ? alternative.confidence || 0 : 0;

          if (transcript && (confidence >= bestConfidence || !bestTranscript)) {
            bestTranscript = transcript;
            bestConfidence = confidence;
          }

          if (result.isFinal) {
            finalTranscript += ` ${transcript}`;
          } else {
            interimTranscript += ` ${transcript}`;
          }
        }

        if (typeof settings.onInterim === "function") {
          settings.onInterim((finalTranscript || interimTranscript || bestTranscript).trim());
        }
      };

      recognition.onerror = (event) => {
        const transcript = (finalTranscript || bestTranscript).trim();
        finish({
          transcript,
          confidence: bestConfidence,
          error: event.error,
          message: transcript ? "" : getFriendlyError(event.error)
        });
      };

      recognition.onend = () => {
        finish({
          transcript: (finalTranscript || bestTranscript).trim(),
          confidence: bestConfidence,
          error: "",
          message: ""
        });
      };

      try {
        recognition.start();
      } catch (error) {
        finish({
          transcript: "",
          confidence: 0,
          error: "start-failed",
          message: "Speech recognition could not start. Please try again."
        });
        return;
      }

      activeTimeoutId = setTimeout(() => {
        try {
          recognition.stop();
        } catch (error) {
          finish({
            transcript: "",
            confidence: 0,
            error: "timeout",
            message: "Listening timed out. Please try again."
          });
        }
      }, settings.timeoutMs || 9000);
    });
  }

  global.SimulationSTT = {
    startListening,
    stopListening,
    getSpeechRecognitionCtor
  };
})(window);
