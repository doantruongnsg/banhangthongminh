import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { SmartInputResult } from '../types';

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

export async function parseSmartInput(
  text: string,
  apiKey: string,
  selectedModel?: string
): Promise<SmartInputResult> {
  const prompt = `Bạn là một hệ thống phân tích dữ liệu khách hàng thông minh. Hãy phân tích đoạn văn bản sau và trích xuất thông tin khách hàng cùng các giao dịch.

Văn bản: "${text}"

Hãy trả về KẾT QUẢ DUY NHẤT ở dạng JSON theo format sau (KHÔNG thêm markdown, KHÔNG thêm giải thích, CHỈ trả về JSON thuần):
{
  "customer": {
    "name": "tên khách hàng (nếu có)",
    "phone": "số điện thoại (nếu có)",
    "email": "email (nếu có)",
    "address": "địa chỉ (nếu có)",
    "notes": "ghi chú thêm (nếu có)"
  },
  "transactions": [
    {
      "type": "purchase hoặc payment hoặc debt",
      "amount": số tiền (number, đơn vị VND),
      "description": "mô tả giao dịch"
    }
  ]
}

Quy tắc:
- "purchase" = mua hàng, đặt hàng, mua
- "payment" = thanh toán, trả tiền, trả trước, đã trả, chuyển khoản
- "debt" = nợ, còn nợ, thiếu, chưa trả
- Nếu text nói "mua X đồng, trả Y đồng" thì tạo 1 purchase (amount=X), 1 payment (amount=Y), và 1 debt (amount=X-Y) nếu X>Y
- Chuyển đổi: "triệu" = 1000000, "tr" = 1000000, "k" = 1000, "nghìn" = 1000, "lít" giữ nguyên
- Nếu thông tin không có trong văn bản, đặt giá trị là chuỗi rỗng "" hoặc mảng rỗng []
- Luôn trả về JSON hợp lệ`;

  const response = await callGeminiAI(prompt, apiKey, selectedModel);

  if (!response) {
    throw { message: 'Không nhận được phản hồi từ AI', code: 'NO_RESPONSE', raw: 'Empty response' };
  }

  try {
    // Clean response - remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned) as SmartInputResult;
    return parsed;
  } catch {
    throw { message: 'Không thể phân tích phản hồi AI', code: 'PARSE_ERROR', raw: response };
  }
}
