import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface InterpretationResult {
  summary: string;
  originalLanguage: string;
  dialectDetected?: string;
  sentiment: 'distress' | 'urgency' | 'anger' | 'fear' | 'confusion' | 'neutral' | 'calm';
  urgencyScore: number; // 1-10
  keyEntities: string[];
  suggestedAction: string;
  verificationQuestion: string; // The question AI asks to verify understanding
}

export async function interpretCitizenSpeech(text: string, context: string = ""): Promise<InterpretationResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Context: This is for the 1092 Helpline in Karnataka. 
      Citizen Input: "${text}"
      Current Call Context: ${context}
      
      Analyze the input for the 1092 Helpline. 
      1. Detect the language and any specific Kannada/Hindi/English dialect or regional variations.
      2. Summarize the core issue precisely.
      3. Identify the emotional sentiment and urgency.
      4. Extract key entities (location, department, names).
      5. Formulate a simple verification question in the citizen's detected language to confirm understanding.
      
      Response must be in JSON.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          originalLanguage: { type: Type.STRING },
          dialectDetected: { type: Type.STRING },
          sentiment: { 
            type: Type.STRING, 
            enum: ['distress', 'urgency', 'anger', 'fear', 'confusion', 'neutral', 'calm'] 
          },
          urgencyScore: { type: Type.NUMBER },
          keyEntities: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          suggestedAction: { type: Type.STRING },
          verificationQuestion: { type: Type.STRING }
        },
        required: ['summary', 'originalLanguage', 'sentiment', 'urgencyScore', 'verificationQuestion']
      }
    }
  });

  return JSON.parse(response.text);
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text to ${targetLanguage}. Keep the tone professional but empathetic for a helpline context: "${text}"`,
  });
  return response.text || text;
}
