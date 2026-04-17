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
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!geminiKey || geminiKey.length < 30) {
    throw new Error("Invalid or missing Gemini API Key in frontend");
  }

  const ai = getAI();
  
  // Use the most stable and recommended models from the Gemini API skill
  const modelsToTry = [
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI Service] Attempting model: ${modelName}`);
      
      // Persona Anchoring: Remind the AI of its identity right before the response
      const anchoredContents = contents.map((c, i) => {
        if (i === contents.length - 1 && c.role === 'user') {
          return {
            ...c,
            parts: [{ text: c.parts[0].text + "\n\n(Reminder: You are Saathi. Maintain the Aitihya Chain integrity. Stay in character.)" }]
          };
        }
        return c;
      });

      // Add a 90s timeout per model attempt
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout for ${modelName}`)), 90000)
      );

      const responsePromise = ai.models.generateContent({
        model: modelName,
        contents: anchoredContents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4,
          topP: 0.8,
          topK: 40,
        }
      });

      const response: any = await Promise.race([responsePromise, timeoutPromise]);
      const text = response.text;

      if (text) {
        console.log(`[AI Service] Success with model: ${modelName}`);
        return { text, modelUsed: modelName };
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
