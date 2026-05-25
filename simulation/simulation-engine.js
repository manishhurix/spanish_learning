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
      lastEvaluation: null
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

  function goToNextNode() {
    const node = getCurrentNode();
    if (!node) return getSnapshot();

    markNodeComplete(node.id);

    if (!node.successNode) {
      state.completed = true;
      state.currentNodeId = node.id;
      return getSnapshot();
    }

    state.currentNodeId = node.successNode;
    return getSnapshot();
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
    let message = "Let's try again slowly.";
    let advanced = false;

    if (score >= 80) {
      branch = "success";
      status = "matched";
      message = `Excellent pronunciation. Great job saying "${node.botTextSpanish}".`;
      goToNextNode();
      advanced = true;
    } else if (score >= 60) {
      branch = attempts >= node.maxAttempts ? "fallback" : "clarification";
      status = "almost";
      message = attempts >= node.maxAttempts
        ? `Almost correct. We'll keep moving, but remember: ${node.pronunciationHints[0]}`
        : `Almost correct. ${node.pronunciationHints[0]}`;
      if (attempts >= node.maxAttempts) {
        goToNextNode();
        advanced = true;
      }
    } else if (attempts >= node.maxAttempts) {
      branch = "fallback";
      status = "not_matched";
      message = `We'll move on after this attempt. Listen again later and practice: ${node.botTextSpanish}.`;
      goToNextNode();
      advanced = true;
    } else {
      branch = "retry";
      status = "not_matched";
      message = `Let's try again slowly. ${node.pronunciationHints[0]}`;
    }

    state.lastEvaluation = {
      nodeId: node.id,
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
      message,
      advanced,
      completed: state.completed
    };

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
