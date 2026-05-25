(function (global) {
  "use strict";

  function createInitialState() {
    return {
      started: false,
      completed: false,
      ended: false,
      currentNodeId: global.SimulationData.startNodeId,
      attemptsByNode: {},
      completedNodeIds: [],
      totalAttempts: 0,
      lastEvaluation: null,
      transcriptHistory: [],
      learnerMemory: {
        retryCount: 0,
        fallbackCount: 0,
        missingWordCounts: {},
        pronunciationFocusCounts: {},
        confidenceTrend: []
      }
    };
  }

  const state = createInitialState();

  function getCurrentNode() {
    return global.SimulationData.simulationNodes[state.currentNodeId] || null;
  }

  function getNodePosition(nodeId) {
    const index = global.SimulationData.orderedNodeIds.indexOf(nodeId);
    return index >= 0 ? index + 1 : 1;
  }

  function getProgress() {
    const total = global.SimulationData.orderedNodeIds.length;
    const current = state.completed ? total : getNodePosition(state.currentNodeId);
    return {
      current,
      total,
      percent: Math.round((state.completedNodeIds.length / total) * 100)
    };
  }

  function startSimulation() {
    if (!state.started || state.ended) {
      Object.assign(state, createInitialState(), { started: true });
    } else {
      state.started = true;
    }
    return getSnapshot();
  }

  function loadNode(nodeId) {
    if (global.SimulationData.simulationNodes[nodeId]) {
      state.currentNodeId = nodeId;
      state.completed = false;
      state.ended = false;
    }
    return getSnapshot();
  }

  function markNodeComplete(nodeId) {
    if (!state.completedNodeIds.includes(nodeId)) {
      state.completedNodeIds.push(nodeId);
    }
  }

  function advanceToNode(nextNodeId, completedNodeId) {
    markNodeComplete(completedNodeId);

    if (!nextNodeId) {
      state.completed = true;
      state.currentNodeId = completedNodeId;
      return getSnapshot();
    }

    state.currentNodeId = nextNodeId;
    return getSnapshot();
  }

  function goToNextNode() {
    const node = getCurrentNode();
    if (!node) return getSnapshot();
    return advanceToNode(node.successNode, node.id);
  }

  function updateLearnerMemory(node, detail, confidenceScore, branch) {
    const memory = state.learnerMemory;

    if (branch === "retry" || branch === "clarification") memory.retryCount += 1;
    if (branch === "fallback") memory.fallbackCount += 1;

    (detail.missingWords || []).forEach((word) => {
      memory.missingWordCounts[word] = (memory.missingWordCounts[word] || 0) + 1;
    });

    if (detail.score < 80 && node.pronunciationFocus) {
      memory.pronunciationFocusCounts[node.pronunciationFocus] = (memory.pronunciationFocusCounts[node.pronunciationFocus] || 0) + 1;
    }

    memory.confidenceTrend.push(confidenceScore);
    if (memory.confidenceTrend.length > 6) memory.confidenceTrend.shift();
  }

  function getRepeatedMissingWords() {
    return Object.keys(state.learnerMemory.missingWordCounts)
      .filter((word) => state.learnerMemory.missingWordCounts[word] > 1)
      .slice(0, 3);
  }

  function getRepeatedPronunciationFocus() {
    const entries = Object.entries(state.learnerMemory.pronunciationFocusCounts)
      .sort((a, b) => b[1] - a[1]);
    return entries.length && entries[0][1] > 1 ? entries[0][0] : "";
  }

  function getTrendNote() {
    const trend = state.learnerMemory.confidenceTrend;
    if (trend.length < 3) return "";
    const recent = trend.slice(-3);
    const isImproving = recent[2] >= recent[0] && recent[2] >= 60;
    return isImproving ? "Your recent responses are getting clearer." : "";
  }

  function buildAdaptiveFeedback(node, detail, branch, attempts) {
    const repeatedMissingWords = getRepeatedMissingWords();
    const repeatedFocus = getRepeatedPronunciationFocus();
    const trendNote = getTrendNote();
    const missing = detail.missingWords && detail.missingWords.length
      ? ` Missing part: ${detail.missingWords.join(", ")}.`
      : "";
    const repeatedMissing = repeatedMissingWords.length
      ? ` You have missed ${repeatedMissingWords.join(", ")} more than once, so slow those words down.`
      : "";
    const focusReminder = repeatedFocus
      ? ` Remember this repeated pronunciation focus: ${repeatedFocus}`
      : "";
    const trend = trendNote ? ` ${trendNote}` : "";

    if (branch === "success") {
      return `${node.successFeedback}${trend}`;
    }

    if (branch === "clarification") {
      return `${node.partialFeedback}${missing} ${node.coachingTip}${focusReminder}`.trim();
    }

    if (branch === "fallback") {
      return `${node.failureFeedback} We'll continue so the conversation keeps moving, but practice this phrase: ${node.botTextSpanish}.${repeatedMissing}`.trim();
    }

    return `${node.failureFeedback} ${node.remediationPrompt}${missing} ${node.coachingTip}${attempts > 1 ? repeatedMissing : ""}`.trim();
  }

  function evaluateResponse(transcript, confidence) {
    const node = getCurrentNode();
    if (!node) return null;

    const attempts = (state.attemptsByNode[node.id] || 0) + 1;
    state.attemptsByNode[node.id] = attempts;
    state.totalAttempts += 1;

    const detail = global.SimulationUtils.evaluateTranscript(
      node.expectedResponses,
      node.acceptedVariants,
      transcript
    );

    const score = detail.score;
    const confidenceScore = confidence ? Math.round(confidence * 100) : score;
    let branch = "retry";
    let status = "not_matched";
    let advanced = false;
    let nextNodeId = node.retryNode;

    if (score >= 80) {
      branch = "success";
      status = "matched";
      nextNodeId = node.successNode;
      advanceToNode(nextNodeId, node.id);
      advanced = true;
    } else if (score >= 60) {
      branch = attempts >= node.maxAttempts ? "fallback" : "clarification";
      status = "almost";
      nextNodeId = attempts >= node.maxAttempts ? node.fallbackNode : node.clarificationNode;
      if (attempts >= node.maxAttempts) {
        advanceToNode(nextNodeId, node.id);
        advanced = true;
      }
    } else if (attempts >= node.maxAttempts) {
      branch = "fallback";
      status = "not_matched";
      nextNodeId = node.fallbackNode;
      advanceToNode(nextNodeId, node.id);
      advanced = true;
    }

    updateLearnerMemory(node, detail, confidenceScore, branch);

    state.lastEvaluation = {
      nodeId: node.id,
      sceneTitle: node.sceneTitle,
      transcript,
      expected: node.expectedResponses[0],
      score,
      confidenceScore,
      status,
      branch,
      attempts,
      maxAttempts: node.maxAttempts,
      missingWords: detail.missingWords,
      extraWords: detail.extraWords,
      message: buildAdaptiveFeedback(node, detail, branch, attempts),
      targetPhrase: node.botTextSpanish,
      remediationPrompt: node.remediationPrompt,
      coachingTip: node.coachingTip,
      pronunciationFocus: node.pronunciationFocus,
      advanced,
      completed: state.completed
    };

    state.transcriptHistory.push(state.lastEvaluation);
    if (state.transcriptHistory.length > 10) state.transcriptHistory.shift();

    return state.lastEvaluation;
  }

  function restartSimulation() {
    Object.assign(state, createInitialState(), { started: true });
    return getSnapshot();
  }

  function endSimulation() {
    state.ended = true;
    return getSnapshot();
  }

  function getSnapshot() {
    return {
      state,
      currentNode: getCurrentNode(),
      progress: getProgress()
    };
  }

  global.SimulationEngine = {
    startSimulation,
    loadNode,
    evaluateResponse,
    goToNextNode,
    restartSimulation,
    endSimulation,
    getSnapshot
  };
})(window);
