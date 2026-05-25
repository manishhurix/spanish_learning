(function (global) {
  "use strict";

  let container = null;
  let isListening = false;
  let selectedSpeechRate = 1.0;

  function init(target) {
    container = target;
    stopActiveActivities();
    global.SimulationEngine.restartSimulation();
    render();
    autoSpeakCurrentNode();
  }

  function stopActiveActivities() {
    isListening = false;
    global.SimulationTTS.stopSpeaking();
    global.SimulationSTT.stopListening();
  }

  function render() {
    if (!container) return;

    const snapshot = global.SimulationEngine.getSnapshot();
    const utils = global.SimulationUtils;

    if (snapshot.state.ended) {
      container.innerHTML = renderEnded();
      bindEvents();
      return;
    }

    if (snapshot.state.completed) {
      container.innerHTML = renderCompleted(snapshot);
      bindEvents();
      return;
    }

    const node = snapshot.currentNode;
    const lastEvaluation = snapshot.state.lastEvaluation;
    const attempts = snapshot.state.attemptsByNode[node.id] || 0;
    const feedbackHtml = lastEvaluation ? renderFeedback(lastEvaluation) : renderReadyFeedback(node);

    container.innerHTML = `
      <section class="simulation-shell" aria-labelledby="simulationTitle">
        <article class="simulation-card">
          <div class="simulation-header">
            <div>
              <p class="eyebrow">Guided Simulation</p>
              <h2 id="simulationTitle">${utils.escapeHtml(node.sceneTitle || "Patient Symptoms Conversation")}</h2>
              <p class="simulation-subtitle">${utils.escapeHtml(node.sceneContext || "Listen, respond, and keep the patient conversation moving.")}</p>
            </div>
            <div class="simulation-meta">
              <span class="category-pill">${utils.escapeHtml(node.category)}</span>
              <span class="simulation-tone">${utils.escapeHtml(node.emotionalTone || "guided")}</span>
            </div>
          </div>

          <div class="simulation-progress" aria-label="Simulation progress">
            <div class="result-heading">
              <span class="status-label">Step ${snapshot.progress.current} of ${snapshot.progress.total}</span>
              <span class="attempt-count">Attempts on step: ${attempts}/${node.maxAttempts}</span>
            </div>
            <div class="score-track">
              <div class="score-fill" style="width: ${snapshot.progress.percent}%"></div>
            </div>
          </div>

          <div class="simulation-bot-area">
            <p class="simulation-caption">Conversation</p>
            <div class="simulation-dialogue">
              <div class="simulation-line simulation-line-coach">
                <span class="simulation-speaker">Coach</span>
                <p>${utils.escapeHtml(node.botTextEnglish)}</p>
              </div>
              <div class="simulation-line simulation-line-patient">
                <span class="simulation-speaker">Patient</span>
                <p class="simulation-patient-english">${utils.escapeHtml(node.patientLineEnglish || "")}</p>
                <p class="simulation-patient-spanish">${utils.escapeHtml(node.patientLineSpanish || "")}</p>
              </div>
              <div class="simulation-line simulation-line-learner">
                <span class="simulation-speaker">Your task</span>
                <p>${utils.escapeHtml(node.learnerInstruction || "Respond in Spanish.")}</p>
                <div class="simulation-spanish-phrase">${utils.escapeHtml(node.botTextSpanish)}</div>
              </div>
            </div>
            <p class="hints">Pronunciation focus: ${utils.escapeHtml(node.pronunciationFocus || node.coachingTip || "")}</p>
          </div>

          <div class="simulation-actions">
            <button class="btn btn-primary" id="simulationSpeakBtn" type="button">Listen Again</button>
            <div class="simulation-speed-control">
              <span class="simulation-speed-label">Playback speed</span>
              <div class="speed-controls" aria-label="Simulation bot playback speed">
                ${renderSpeedButtons()}
              </div>
            </div>
            <button class="btn btn-secondary ${isListening ? "recording-pulse" : ""}" id="simulationMicBtn" type="button" ${isListening ? "disabled" : ""}>
              ${isListening ? "Listening..." : "Speak Response"}
            </button>
            <button class="btn btn-ghost" id="simulationRestartBtn" type="button">Restart</button>
          </div>

          <div class="simulation-feedback result-area" id="simulationFeedback" role="status" aria-live="polite">
            ${feedbackHtml}
          </div>
        </article>
      </section>
    `;

    bindEvents();
  }

  function renderReadyFeedback(node) {
    return `
      <div class="result-heading">
        <span class="status-label">Ready</span>
        <span class="attempt-count">Difficulty: ${global.SimulationUtils.escapeHtml(node.difficultyLevel || 1)}</span>
      </div>
      <p class="feedback-message">Listen to the patient context, then respond in Spanish when you are ready.</p>
      <p class="transcript">Expected response: <strong>${global.SimulationUtils.escapeHtml(node.expectedResponses[0])}</strong></p>
      <p class="hints">Coaching tip: ${global.SimulationUtils.escapeHtml(node.coachingTip || "")}</p>
    `;
  }

  function renderSpeedButtons() {
    const speeds = [
      { rate: 0.5, label: "0.5x" },
      { rate: 0.75, label: "0.75x" },
      { rate: 1.0, label: "1.0x" },
      { rate: 1.25, label: "1.25x" },
      { rate: 1.5, label: "1.5x" }
    ];

    return speeds.map((speed) => `
      <button class="speed-btn simulation-speed-btn ${selectedSpeechRate === speed.rate ? "active" : ""}" data-speed="${speed.rate}" type="button">${speed.label}</button>
    `).join("");
  }

  function renderFeedback(evaluation) {
    const missing = evaluation.missingWords && evaluation.missingWords.length ? evaluation.missingWords.join(", ") : "-";
    const extra = evaluation.extraWords && evaluation.extraWords.length ? evaluation.extraWords.join(", ") : "-";
    const branchLabel = {
      success: "success",
      clarification: "clarification",
      retry: "retry",
      fallback: "fallback"
    }[evaluation.branch] || evaluation.branch;
    const advancedText = evaluation.advanced && !evaluation.completed ? "Moving to next patient exchange" : "Current exchange";

    return `
      <div class="result-heading">
        <span class="status-label ${evaluation.status}">${getStatusText(evaluation.status)} - ${evaluation.score}%</span>
        <span class="attempt-count">Branch: ${branchLabel}</span>
      </div>
      <div class="score-track">
        <div class="score-fill" style="width: ${evaluation.score}%"></div>
      </div>
      <div class="rubrics-container">
        <div class="rubric-row">
          <div class="rubric-header">
            <span class="rubric-label">Pronunciation</span>
            <span class="rubric-value">${evaluation.score}%</span>
          </div>
          <div class="rubric-track"><div class="rubric-fill" style="width: ${evaluation.score}%"></div></div>
        </div>
        <div class="rubric-row">
          <div class="rubric-header">
            <span class="rubric-label">Clarity</span>
            <span class="rubric-value">${evaluation.confidenceScore}%</span>
          </div>
          <div class="rubric-track"><div class="rubric-fill" style="width: ${evaluation.confidenceScore}%"></div></div>
        </div>
      </div>
      <p class="feedback-message">${global.SimulationUtils.escapeHtml(evaluation.message)}</p>
      <p class="transcript">Conversation status: <strong>${global.SimulationUtils.escapeHtml(advancedText)}</strong></p>
      <p class="transcript">Recognized speech: <strong>${global.SimulationUtils.escapeHtml(evaluation.transcript || "-")}</strong></p>
      <p class="hints">Missing words: ${global.SimulationUtils.escapeHtml(missing)} | Extra words: ${global.SimulationUtils.escapeHtml(extra)}</p>
      <p class="hints">Focus: ${global.SimulationUtils.escapeHtml(evaluation.pronunciationFocus || evaluation.coachingTip || "")}</p>
    `;
  }

  function renderCompleted(snapshot) {
    return `
      <section class="simulation-shell" aria-labelledby="simulationCompleteTitle">
        <article class="simulation-card simulation-complete">
          <p class="eyebrow">Simulation Complete</p>
          <h2 id="simulationCompleteTitle">Great work with the patient symptoms conversation.</h2>
          <p class="simulation-subtitle">
            You completed ${snapshot.progress.total} guided medical Spanish steps with ${snapshot.state.totalAttempts} total speaking attempts.
          </p>
          <div class="score-track">
            <div class="score-fill" style="width: 100%"></div>
          </div>
          <div class="simulation-actions">
            <button class="btn btn-primary" id="simulationRestartBtn" type="button">Restart Simulation</button>
          </div>
        </article>
      </section>
    `;
  }

  function renderEnded() {
    return `
      <section class="simulation-shell" aria-labelledby="simulationEndedTitle">
        <article class="simulation-card">
          <p class="eyebrow">Simulation Paused</p>
          <h2 id="simulationEndedTitle">The simulation has been stopped.</h2>
          <p class="simulation-subtitle">Restart when you are ready to begin again.</p>
          <div class="simulation-actions">
            <button class="btn btn-primary" id="simulationRestartBtn" type="button">Restart Simulation</button>
          </div>
        </article>
      </section>
    `;
  }

  function getStatusText(status) {
    if (status === "matched") return "Matched";
    if (status === "almost") return "Almost matched";
    return "Not matched";
  }

  function bindEvents() {
    const speakBtn = document.getElementById("simulationSpeakBtn");
    const micBtn = document.getElementById("simulationMicBtn");
    const restartBtn = document.getElementById("simulationRestartBtn");

    if (speakBtn) speakBtn.addEventListener("click", speakCurrentNode);
    document.querySelectorAll(".simulation-speed-btn").forEach((button) => {
      button.addEventListener("click", () => {
        selectedSpeechRate = Number(button.dataset.speed);
        document.querySelectorAll(".simulation-speed-btn").forEach((speedButton) => speedButton.classList.remove("active"));
        button.classList.add("active");
      });
    });
    if (micBtn) micBtn.addEventListener("click", listenForResponse);
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        stopActiveActivities();
        global.SimulationEngine.restartSimulation();
        render();
        autoSpeakCurrentNode();
      });
    }
  }

  function autoSpeakCurrentNode() {
    setTimeout(() => {
      if (!isListening) speakCurrentNode();
    }, 0);
  }

  async function speakCurrentNode() {
    const snapshot = global.SimulationEngine.getSnapshot();
    if (!snapshot.currentNode) return;
    await global.SimulationTTS.speakNode(snapshot.currentNode, { rate: selectedSpeechRate });
  }

  async function speakAfterBranch(evaluation) {
    if (!evaluation) return;

    if (evaluation.branch === "retry") {
      await global.SimulationTTS.speakMultilingualSequence([
        { lang: "en", text: "Try again. You can do better." },
        { pause: 260 },
        { lang: "en", text: "Repeat this response slowly." },
        { pause: 180 },
        { lang: "es", text: evaluation.targetPhrase || evaluation.expected }
      ], { rate: selectedSpeechRate });
      return;
    }

    if (evaluation.branch === "clarification") {
      await global.SimulationTTS.speakMultilingualSequence([
        { lang: "en", text: evaluation.message },
        { pause: 260 },
        { lang: "en", text: "Try the full response again." },
        { pause: 180 },
        { lang: "es", text: evaluation.targetPhrase || evaluation.expected }
      ], { rate: selectedSpeechRate });
      return;
    }

    if (evaluation.branch === "success" && !evaluation.completed) {
      await speakCurrentNode();
    }
  }

  async function listenForResponse() {
    const snapshot = global.SimulationEngine.getSnapshot();
    if (!snapshot.currentNode || isListening) return;

    isListening = true;
    render();

    const feedback = document.getElementById("simulationFeedback");
    if (feedback) {
      feedback.innerHTML = `
        <div class="result-heading">
          <span class="status-label recording-pulse">Listening...</span>
          <span class="attempt-count">Speak clearly in Spanish</span>
        </div>
        <p class="feedback-message">Listening for your Spanish response.</p>
        <p class="transcript live-transcript">Live transcript: <strong>-</strong></p>
        <p class="hints">Pause when you finish speaking.</p>
      `;
    }

    const result = await global.SimulationSTT.startListening({
      lang: "es-ES",
      processLocally: false,
      timeoutMs: 10000,
      onInterim(transcript) {
        const liveTranscript = document.querySelector("#simulationFeedback .live-transcript strong");
        if (liveTranscript) liveTranscript.textContent = transcript || "-";
      }
    });

    isListening = false;

    if (!result.transcript) {
      const currentNode = global.SimulationEngine.getSnapshot().currentNode;
      global.SimulationEngine.evaluateResponse("", 0);
      const latest = global.SimulationEngine.getSnapshot().state.lastEvaluation;
      if (latest) latest.message = result.message || `No clear response detected. Try again: ${currentNode.botTextSpanish}.`;
      render();
      speakAfterBranch(latest);
      return;
    }

    const evaluation = global.SimulationEngine.evaluateResponse(result.transcript, result.confidence);
    render();
    speakAfterBranch(evaluation);
  }

  global.SimulationUI = {
    init,
    render,
    stopActiveActivities
  };
})(window);
