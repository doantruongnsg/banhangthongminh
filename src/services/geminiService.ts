import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const AI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Nhanh nhất, phù hợp xử lý hàng ngày', badge: 'Default' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Cân bằng tốc độ & chất lượng', badge: null },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Dự phòng ổn định', badge: null },
];

const MODELS = AI_MODELS.map(m => m.id);

export interface AiError {
  message: string;
  code: string;
  raw: string;
}

export async function callGeminiAI(
  prompt: string, 
  apiKey: string, 
  selectedModel?: string,
  modelIndex = 0
): Promise<string | null> {
  if (!apiKey) return null;

  // Use selected model first, then fallback list
  const modelsToTry = selectedModel 
    ? [selectedModel, ...MODELS.filter(m => m !== selectedModel)]
    : MODELS;

  const currentModel = modelsToTry[modelIndex] || MODELS[0];

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: currentModel,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Không có phản hồi từ AI.";
  } catch (error: any) {
    console.error(`Error with model ${currentModel}:`, error);
    
    // Fallback logic: try next model
    if (modelIndex < modelsToTry.length - 1) {
      return callGeminiAI(prompt, apiKey, selectedModel, modelIndex + 1);
    }
    
    // All models failed — throw detailed error
    const errorCode = error?.status || error?.code || 'UNKNOWN';
    const errorMessage = error?.message || error?.statusText || 'Lỗi không xác định';
    const rawError = `${errorCode} ${errorMessage}`;
    
    const aiError: AiError = {
      message: `Tất cả các model AI đều thất bại. Lỗi cuối cùng từ ${currentModel}`,
      code: String(errorCode),
      raw: rawError,
    };
    
    throw aiError;
  }
}
