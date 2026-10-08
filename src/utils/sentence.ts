import { WordState } from './word';

// Fallback high quality sentence dictionary and contextual generator
const COMMON_WORD_EXAMPLES: Record<string, { sentence: string; phrase: string }> = {
  locus: {
    sentence: "The laboratory became the locus of groundbreaking genetic research.",
    phrase: "locus of control"
  },
  wince: {
    sentence: "She couldn't help but wince as the doctor examined the painful bruise.",
    phrase: "wince in pain"
  },
  denizen: {
    sentence: "Polar bears are the famous denizens of the frozen Arctic.",
    phrase: "denizens of the deep"
  },
  perish: {
    sentence: "Many rare animal species may perish if their habitats are destroyed.",
    phrase: "perish from hunger"
  },
  perishable: {
    sentence: "Please store perishable items like milk and vegetables in the refrigerator.",
    phrase: "perishable goods"
  },
  predict: {
    sentence: "Meteorologists use satellite data to predict extreme weather events.",
    phrase: "predict the future"
  },
  dictate: {
    sentence: "Market supply and demand dictate the price of consumer goods.",
    phrase: "dictate terms"
  },
  contradict: {
    sentence: "The witness's new statement seemed to contradict his earlier testimony.",
    phrase: "contradict oneself"
  }
};

export function getFallbackSentence(word: string, partOfSpeech?: string, meaning?: string): { sentence: string; phrase: string } {
  const lower = word.toLowerCase().trim();
  if (COMMON_WORD_EXAMPLES[lower]) {
    return COMMON_WORD_EXAMPLES[lower];
  }

  const pos = (partOfSpeech || '').toLowerCase().trim();

  if (pos.includes('v') || pos.includes('动')) {
    return {
      sentence: `It is essential to understand how to ${lower} effectively in real situations.`,
      phrase: `${lower} carefully`
    };
  }

  if (pos.includes('adj') || pos.includes('形')) {
    return {
      sentence: `The project was successful thanks to their ${lower} approach.`,
      phrase: `highly ${lower}`
    };
  }

  if (pos.includes('adv') || pos.includes('副')) {
    return {
      sentence: `She handled the complex situation ${lower} and calmly.`,
      phrase: `${lower} done`
    };
  }

  // Default noun
  return {
    sentence: `The professor highlighted the significance of the ${lower} in modern study.`,
    phrase: `key ${lower}`
  };
}

export async function generateExampleSentenceForWord(
  word: string,
  meaning?: string,
  partOfSpeech?: string
): Promise<{ example_sentence: string; phrase: string }> {
  const lower = word.toLowerCase().trim();

  // Check built-in common dictionary first for instant zero-latency response
  if (COMMON_WORD_EXAMPLES[lower]) {
    return {
      example_sentence: COMMON_WORD_EXAMPLES[lower].sentence,
      phrase: COMMON_WORD_EXAMPLES[lower].phrase
    };
  }

  // Try calling server-side API
  try {
    const res = await fetch('/api/generate-sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word,
        meaning,
        part_of_speech: partOfSpeech
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.example_sentence) {
        return {
          example_sentence: data.example_sentence,
          phrase: data.phrase || `${word} phrase`
        };
      }
    }
  } catch (e) {
    console.warn('Server-side example generation error:', e);
  }

  // Fallback to intelligent generator
  const fallback = getFallbackSentence(word, partOfSpeech, meaning);
  return {
    example_sentence: fallback.sentence,
    phrase: fallback.phrase
  };
}
