import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

let aiInstance: GoogleGenAI | null = null;

export function getAI() {
  if (!aiInstance) {
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. AI features will be limited.");
    }
    aiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiInstance;
}

export async function generateAIChatResponse(contents: any[], systemInstruction: string) {
  const ai = getAI();
  
  // Use the most stable and recommended models from the Gemini API skill
  const modelsToTry = [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-1.5-flash-latest"
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI Service] Attempting model: ${modelName}`);
      
      // Persona Anchoring: Remind the AI of its identity right before the response
      const anchoredContents = [...contents];
      if (anchoredContents.length > 0) {
        const lastMsg = anchoredContents[anchoredContents.length - 1];
        if (lastMsg.role === 'user') {
          lastMsg.parts[0].text += "\n\n(Reminder: You are Saathi. Stay in character. Respond with wisdom and honesty.)";
        }
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: anchoredContents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4, // Lower temperature for more consistent persona
          topP: 0.8,
          topK: 40,
        }
      });

      if (response.text) {
        console.log(`[AI Service] Success with model: ${modelName}`);
        return { text: response.text, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`[AI Service] Model ${modelName} failed:`, err.message);
      lastError = err;
      
      // If it's an invalid API key, we should probably stop trying Gemini
      if (err.message?.includes("API key not valid") || err.message?.includes("400")) {
        break;
      }
    }
  }

  throw lastError || new Error("All Gemini models failed to respond.");
}
