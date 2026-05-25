(function (global) {
  "use strict";

  function normalizeSpanish(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[¡!¿?.,;:"'`´()[\]{}<>/\\|@#$%^&*_+=~]/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
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

  function calculateSimilarity(expected, actual) {
    const expectedNormalized = normalizeSpanish(expected);
    const actualNormalized = normalizeSpanish(actual);

    if (!expectedNormalized || !actualNormalized) return 0;
    if (expectedNormalized === actualNormalized) return 100;

    const maxLength = Math.max(expectedNormalized.length, actualNormalized.length, 1);
    const distance = levenshteinDistance(expectedNormalized, actualNormalized);
    return Math.max(0, Math.round((1 - distance / maxLength) * 100));
  }

  function compareWordSets(expected, actual) {
    const expectedWords = normalizeSpanish(expected).split(" ").filter(Boolean);
    const actualWords = normalizeSpanish(actual).split(" ").filter(Boolean);
    const expectedSet = new Set(expectedWords);
    const actualSet = new Set(actualWords);

    return {
      missingWords: expectedWords.filter((word) => !actualSet.has(word)),
      extraWords: actualWords.filter((word) => !expectedSet.has(word)),
      overlapScore: expectedWords.length
        ? Math.round((expectedWords.filter((word) => actualSet.has(word)).length / expectedWords.length) * 100)
        : 0
    };
  }

  function evaluateTranscript(expectedResponses, acceptedVariants, transcript) {
    const targets = Array.from(new Set([...(expectedResponses || []), ...(acceptedVariants || [])].map(normalizeSpanish).filter(Boolean)));
    const normalizedTranscript = normalizeSpanish(transcript);

    if (!normalizedTranscript || !targets.length) {
      return {
        score: 0,
        target: targets[0] || "",
        normalizedTranscript,
        missingWords: targets[0] ? targets[0].split(" ") : [],
        extraWords: [],
        overlapScore: 0
      };
    }

    const results = targets.map((target) => {
      const similarityScore = calculateSimilarity(target, normalizedTranscript);
      const wordComparison = compareWordSets(target, normalizedTranscript);
      const isPhrase = target.split(" ").filter(Boolean).length > 1;
      const score = isPhrase
        ? Math.round(wordComparison.overlapScore * 0.58 + similarityScore * 0.42)
        : similarityScore;

      return {
        score: Math.max(0, Math.min(100, score - Math.min(wordComparison.extraWords.length * 8, 18))),
        target,
        normalizedTranscript,
        similarityScore,
        missingWords: wordComparison.missingWords,
        extraWords: wordComparison.extraWords,
        overlapScore: wordComparison.overlapScore
      };
    });

    return results.sort((a, b) => b.score - a.score)[0];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  global.SimulationUtils = {
    normalizeSpanish,
    levenshteinDistance,
    calculateSimilarity,
    evaluateTranscript,
    escapeHtml
  };
})(window);
