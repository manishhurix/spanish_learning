(function (global) {
  "use strict";

  const simulationNodes = {
    sim_1: {
      id: "sim_1",
      type: "repeat-after-me",
      category: "Symptoms",
      botTextEnglish: "The Spanish word for pain is Dolor. Please repeat it.",
      botTextSpanish: "Dolor",
      learnerCue: "Say: dolor",
      expectedResponses: ["dolor"],
      acceptedVariants: ["dolo"],
      pronunciationHints: ["Open with a clear DO sound and try the final R."],
      successNode: "sim_2",
      maxAttempts: 3
    },
    sim_2: {
      id: "sim_2",
      type: "question",
      category: "Symptoms",
      botTextEnglish: "Now the patient has a fever. How do you say fever in Spanish?",
      botTextSpanish: "Fiebre",
      learnerCue: "Say: fiebre",
      expectedResponses: ["fiebre"],
      acceptedVariants: ["fiebre alta"],
      pronunciationHints: ["Keep the first syllable soft: FIE-bre."],
      successNode: "sim_3",
      maxAttempts: 3
    },
    sim_3: {
      id: "sim_3",
      type: "guided-phrase",
      category: "Symptoms",
      botTextEnglish: "The patient says, my head hurts. Practice the short phrase.",
      botTextSpanish: "Me duele la cabeza",
      learnerCue: "Say: me duele la cabeza",
      expectedResponses: ["me duele la cabeza"],
      acceptedVariants: ["duele la cabeza", "me duele cabeza"],
      pronunciationHints: ["Say cabeza as ca-BE-za, with the stress in the middle."],
      successNode: "sim_4",
      maxAttempts: 3
    },
    sim_4: {
      id: "sim_4",
      type: "guided-phrase",
      category: "Care",
      botTextEnglish: "The patient needs medical help. Say, I need a doctor.",
      botTextSpanish: "Necesito un médico",
      learnerCue: "Say: necesito un médico",
      expectedResponses: ["necesito un medico"],
      acceptedVariants: ["necesito un médico", "necesito medico", "necesito médico"],
      pronunciationHints: ["The accent in médico is accepted even if Chrome transcribes it without the accent."],
      successNode: "sim_5",
      maxAttempts: 3
    },
    sim_5: {
      id: "sim_5",
      type: "guided-phrase",
      category: "Care",
      botTextEnglish: "Next, tell someone you are going to the hospital.",
      botTextSpanish: "Voy al hospital",
      learnerCue: "Say: voy al hospital",
      expectedResponses: ["voy al hospital"],
      acceptedVariants: ["voy hospital", "ir al hospital"],
      pronunciationHints: ["Make hospital sound like os-pi-TAL in Spanish."],
      successNode: "sim_6",
      maxAttempts: 3
    },
    sim_6: {
      id: "sim_6",
      type: "guided-phrase",
      category: "Care",
      botTextEnglish: "The patient asks for help. Say, I need help.",
      botTextSpanish: "Necesito ayuda",
      learnerCue: "Say: necesito ayuda",
      expectedResponses: ["necesito ayuda"],
      acceptedVariants: ["necesita ayuda", "ayuda"],
      pronunciationHints: ["Ayuda begins with an ah sound: ah-YU-da."],
      successNode: "sim_7",
      maxAttempts: 3
    },
    sim_7: {
      id: "sim_7",
      type: "urgent-phrase",
      category: "Emergency",
      botTextEnglish: "The patient is having trouble breathing. Say, I cannot breathe.",
      botTextSpanish: "No puedo respirar",
      learnerCue: "Say: no puedo respirar",
      expectedResponses: ["no puedo respirar"],
      acceptedVariants: ["no puedo respirar bien", "no puedo"],
      pronunciationHints: ["Respirar ends with an R sound: res-pi-RAR."],
      successNode: "sim_8",
      maxAttempts: 3
    },
    sim_8: {
      id: "sim_8",
      type: "urgent-phrase",
      category: "Emergency",
      botTextEnglish: "Now identify the situation. Say, it is an emergency.",
      botTextSpanish: "Es una emergencia",
      learnerCue: "Say: es una emergencia",
      expectedResponses: ["es una emergencia"],
      acceptedVariants: ["una emergencia", "emergencia"],
      pronunciationHints: ["Emergencia has four clear syllables: e-mer-GEN-cia."],
      successNode: "sim_9",
      maxAttempts: 3
    },
    sim_9: {
      id: "sim_9",
      type: "patient-response",
      category: "Symptoms",
      botTextEnglish: "The patient feels dizzy. Practice saying, I am dizzy.",
      botTextSpanish: "Estoy mareado",
      learnerCue: "Say: estoy mareado",
      expectedResponses: ["estoy mareado"],
      acceptedVariants: ["me siento mareado", "estoy mareada", "mareado"],
      pronunciationHints: ["Mareado has four beats: ma-re-A-do."],
      successNode: "sim_10",
      maxAttempts: 3
    },
    sim_10: {
      id: "sim_10",
      type: "patient-response",
      category: "Care",
      botTextEnglish: "Finish by asking for water. Say, I need water.",
      botTextSpanish: "Necesito agua",
      learnerCue: "Say: necesito agua",
      expectedResponses: ["necesito agua"],
      acceptedVariants: ["quiero agua", "agua por favor"],
      pronunciationHints: ["Agua starts with a strong AH sound."],
      successNode: null,
      maxAttempts: 3
    }
  };

  Object.keys(simulationNodes).forEach((nodeId) => {
    const node = simulationNodes[nodeId];
    node.retryNode = node.id;
    node.clarificationNode = node.id;
    node.fallbackNode = node.successNode;
  });

  global.SimulationData = {
    startNodeId: "sim_1",
    orderedNodeIds: Object.keys(simulationNodes),
    simulationNodes
  };
})(window);
