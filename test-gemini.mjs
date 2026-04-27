import { GoogleGenAI } from "@google/genai";
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'fake' });
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "test",
    });
    console.log("Success:", res.text);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
