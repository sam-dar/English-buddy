import { DifficultyTier, FlaggedWord } from '../types';

/**
 * Clean word: strips punctuation, lowercase
 */
export function cleanWord(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9']/g, '').trim();
}

/**
 * Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Phonetic / sound-alike heuristics for young kids (e.g., 'w' for 'r', 'th' for 'f'/'s')
 */
function phoneticEquivalence(target: string, said: string): boolean {
  if (target === said) return true;

  // Common toddler/kid speech substitutions
  const soundAlikes: [RegExp, string][] = [
    [/th/g, 'f'],
    [/r/g, 'w'],
    [/ck/g, 'k'],
    [/ph/g, 'f'],
    [/qu/g, 'kw'],
    [/s$/g, 'z'],
    [/ed$/g, 'd'],
    [/ing$/g, 'in'],
  ];

  let simTarget = target;
  let simSaid = said;

  soundAlikes.forEach(([regex, rep]) => {
    simTarget = simTarget.replace(regex, rep);
    simSaid = simSaid.replace(regex, rep);
  });

  return simTarget === simSaid || levenshteinDistance(simTarget, simSaid) <= 1;
}

/**
 * Lenient word matcher tuned per age tier
 */
export function isWordMatch(target: string, said: string, tier: DifficultyTier): boolean {
  const cTarget = cleanWord(target);
  const cSaid = cleanWord(said);

  if (!cTarget || !cSaid) return false;
  if (cTarget === cSaid) return true;

  // Leniency thresholds
  if (tier === 'Basic') {
    // Basic (age ~6): very forgiving
    // Ignore minor articles if missed
    if (['a', 'an', 'the'].includes(cTarget)) return true;
    if (phoneticEquivalence(cTarget, cSaid)) return true;
    const maxDist = cTarget.length <= 4 ? 1 : 2;
    return levenshteinDistance(cTarget, cSaid) <= maxDist;
  } else if (tier === 'Intermediate') {
    // Intermediate (age ~10)
    if (phoneticEquivalence(cTarget, cSaid)) return true;
    const maxDist = cTarget.length <= 5 ? 1 : 2;
    return levenshteinDistance(cTarget, cSaid) <= maxDist;
  } else {
    // Advanced (age 12+)
    return levenshteinDistance(cTarget, cSaid) <= 1;
  }
}

/**
 * Align spoken transcript with the passage words to find flagged words
 */
export function alignReadingTranscript(
  passageText: string,
  transcript: string,
  tier: DifficultyTier
): {
  accuracyPercentage: number;
  flaggedWords: FlaggedWord[];
  wordsSpokenCount: number;
} {
  const originalWords = passageText.split(/\s+/).filter(Boolean);
  const spokenWords = transcript.split(/\s+/).map(cleanWord).filter(Boolean);

  const flagged: FlaggedWord[] = [];
  let spokenIndex = 0;
  let matchedCount = 0;

  for (let i = 0; i < originalWords.length; i++) {
    const orig = originalWords[i];
    const cleanedOrig = cleanWord(orig);

    if (!cleanedOrig) continue;

    // Look ahead window of up to 4 spoken words
    let matched = false;
    const windowEnd = Math.min(spokenIndex + 4, spokenWords.length);

    for (let s = spokenIndex; s < windowEnd; s++) {
      if (isWordMatch(cleanedOrig, spokenWords[s], tier)) {
        matched = true;
        spokenIndex = s + 1;
        matchedCount++;
        break;
      }
    }

    if (!matched) {
      // Check if child tried to say something here (substituted) or skipped
      const candidateSaid = spokenWords[spokenIndex] || '';
      const isSubstituted = candidateSaid.length > 0 && levenshteinDistance(cleanedOrig, candidateSaid) <= 3;

      // Only flag significant words (avoid nagging over "a", "the", "and" in Basic)
      const isMinorWord = tier === 'Basic' && ['a', 'the', 'in', 'on', 'is', 'it'].includes(cleanedOrig);

      if (!isMinorWord) {
        flagged.push({
          word: orig.replace(/[^a-zA-Z]/g, ''),
          index: i,
          reason: isSubstituted ? 'mispronounced' : 'skipped',
          childSaid: candidateSaid || undefined,
          mastered: false,
        });
      }
    }
  }

  // Cap flagged words so the child is never overwhelmed (max 4 words to practice)
  const cappedFlagged = flagged.slice(0, 4);

  const rawAcc = originalWords.length > 0 ? (matchedCount / originalWords.length) * 100 : 100;
  // Lenient boost for kids so they feel celebrated
  const boostedAcc = Math.min(100, Math.max(70, Math.round(rawAcc + 15)));

  return {
    accuracyPercentage: boostedAcc,
    flaggedWords: cappedFlagged,
    wordsSpokenCount: spokenWords.length,
  };
}
