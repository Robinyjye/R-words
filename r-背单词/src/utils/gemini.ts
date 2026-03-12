import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function enrichWords(words: string[]): Promise<Record<string, any>[]> {
  if (!words.length) return [];
  
  const prompt = `Please provide the part of speech, root/affix analysis, Chinese meaning, and an English example sentence for the following English words:\n${words.join(', ')}`;
  
  try {
    const response = await ai.models.generateContent({
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
              root: { type: Type.STRING, description: 'Root and affix analysis (e.g., a- (not) + bandon (control)). Leave empty if none.' },
              meaning: { type: Type.STRING, description: 'Chinese meaning' },
              example_sentence: { type: Type.STRING, description: 'An English example sentence using the word' }
            },
            required: ['word', 'part_of_speech', 'root', 'meaning', 'example_sentence']
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
