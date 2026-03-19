import { GoogleGenAI, Type } from '@google/genai';

let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. AI features will not work.");
      // Return a dummy object or throw a handled error later
    }
    ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });
  }
  return ai;
}

export async function enrichWords(words: string[]): Promise<Record<string, any>[]> {
  if (!words.length) return [];
  
  const prompt = `Please provide an authoritative etymological analysis for the following English words: ${words.join(', ')}.
For each word, break it down into its prefix, root (core), and suffix.
Also include the part of speech, phonetic transcription (IPA), Chinese meaning, a common phrase, and an English example sentence.

Important:
- prefix: The prefix part (e.g., 'pre-', 'un-'). Leave empty if none.
- prefix_meaning: The Chinese meaning of the prefix (e.g., '在...之前').
- root_core: The core root of the word (e.g., 'dict' in 'predict').
- root_meaning: The Chinese meaning of the root (e.g., '说').
- suffix: The suffix part (e.g., '-ion', '-ly'). Leave empty if none.
- suffix_meaning: The Chinese meaning of the suffix (e.g., '名词后缀').`;
  
  try {
    const aiInstance = getAI();
    if (process.env.GEMINI_API_KEY === undefined || process.env.GEMINI_API_KEY === '') {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    const response = await aiInstance.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: 'The English word' },
              part_of_speech: { type: Type.STRING, description: 'Part of speech (e.g., n., v., adj.)' },
              phonetic: { type: Type.STRING, description: 'International Phonetic Alphabet (IPA) transcription' },
              prefix: { type: Type.STRING, description: 'The prefix part' },
              prefix_meaning: { type: Type.STRING, description: 'Chinese meaning of the prefix' },
              root_core: { type: Type.STRING, description: 'The core root' },
              root_meaning: { type: Type.STRING, description: 'Chinese meaning of the root' },
              suffix: { type: Type.STRING, description: 'The suffix part' },
              suffix_meaning: { type: Type.STRING, description: 'Chinese meaning of the suffix' },
              meaning: { type: Type.STRING, description: 'Chinese meaning' },
              phrase: { type: Type.STRING, description: 'A common phrase' },
              example_sentence: { type: Type.STRING, description: 'An English example sentence' }
            },
            required: ['word', 'part_of_speech', 'phonetic', 'prefix', 'prefix_meaning', 'root_core', 'root_meaning', 'suffix', 'suffix_meaning', 'meaning', 'phrase', 'example_sentence']
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error enriching words:", error);
    throw new Error("Failed to fetch word details from AI.");
  }
}
