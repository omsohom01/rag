import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

// ── API Key rotation (reuse same pattern as gemini.ts) ───────

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

const MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

let keyIdx = 0;
let modelIdx = 0;

function rotate() {
  modelIdx++;
  if (modelIdx >= MODELS.length) {
    modelIdx = 0;
    keyIdx = (keyIdx + 1) % API_KEYS.length;
  }
}

function isRetryable(err: any): boolean {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('Resource has been exhausted') ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('overloaded')
  );
}

async function callGeminiVision(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  maxRetries = API_KEYS.length * MODELS.length
): Promise<string> {
  let lastErr: any;
  for (let i = 0; i < maxRetries; i++) {
    const apiKey = API_KEYS[keyIdx];
    const model = MODELS[modelIdx];
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const genModel = client.getGenerativeModel({ model });
      const result = await genModel.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        { text: prompt },
      ]);
      return result.response.text();
    } catch (err: any) {
      lastErr = err;
      if (isRetryable(err)) {
        logger.warn(`Gemini vision retry (key=${keyIdx + 1}, model=${model}): ${err.message}`);
        rotate();
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

// ── Public types ──────────────────────────────────────────────

export interface ProductAnalysis {
  isProduct: boolean;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  perUnitPrice: number;
  reason: string;
}

// ── Analyze an image + caption from WhatsApp farmer ──────────

/**
 * Analyze a product image sent via WhatsApp along with its caption text.
 *
 * @param imageBase64 - Base64-encoded image bytes
 * @param mimeType    - MIME type of the image (e.g. "image/jpeg")
 * @param captionText - The text message accompanying the image (e.g. "20kg 2000 rupees")
 * @returns ProductAnalysis object
 */
export async function analyzeWhatsAppProduct(
  imageBase64: string,
  mimeType: string,
  captionText: string
): Promise<ProductAnalysis> {
  if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  const prompt = `You are an AI assistant for an agricultural marketplace. A farmer has sent a photo of their product along with a text message through WhatsApp.

FARMER'S TEXT MESSAGE: "${captionText}"

YOUR TASK:
1. IMAGE ANALYSIS:
   - Determine if the image shows a food/agricultural product (vegetable, fruit, grain, pulse, spice, dairy, etc.)
   - Identify the specific product (e.g., "Potato", "Tomato", "Rice")
   - If NOT a food/agricultural product, set isProduct=false

2. TEXT PARSING:
   - Extract the QUANTITY from the text (look for numbers followed by kg, quintal, ton, pieces, dozen, etc.)
   - Extract the PRICE from the text (look for numbers followed by rupees, rs, ₹, taka, etc.)
   - The farmer may write in ANY language (English, Hindi, Bengali, etc.)
   - Common patterns:
     - "20kg 2000 rupees" → quantity=20, unit=kg, totalPrice=2000
     - "5 quintal 10000" → quantity=5, unit=quintal, totalPrice=10000
     - "२० किलो ₹२०००" → quantity=20, unit=kg, totalPrice=2000
     - "100 pieces 500 taka" → quantity=100, unit=pieces, totalPrice=500
   - If only total price is given, calculate per-unit price = totalPrice / quantity
   - If only per-unit price is given, calculate totalPrice = perUnitPrice * quantity

3. NAME CORRECTION:
   - Convert the product name to proper English, singular form
   - Capitalize first letter (e.g., "Potato", "Tomato", "Red onion")
   - Use the image to determine the product, not the text

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "isProduct": true/false,
  "productName": "Product name in singular English (e.g., 'Potato')",
  "category": "Vegetable/Fruit/Grain/Pulse/Spice/Dairy/Other",
  "quantity": <number>,
  "unit": "kg/quintal/ton/pieces/dozen/liter",
  "totalPrice": <number in local currency>,
  "perUnitPrice": <totalPrice / quantity>,
  "reason": "Brief explanation"
}

If the image is NOT a food product OR the text doesn't contain quantity/price info, return:
{
  "isProduct": false,
  "productName": "",
  "category": "",
  "quantity": 0,
  "unit": "",
  "totalPrice": 0,
  "perUnitPrice": 0,
  "reason": "Explanation of why this is not a valid product listing"
}

Return ONLY the JSON object, nothing else.`;

  const rawText = await callGeminiVision(imageBase64, mimeType, prompt);

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : rawText;
    const parsed = JSON.parse(raw);

    return {
      isProduct: parsed.isProduct === true,
      productName: String(parsed.productName || '').trim(),
      category: String(parsed.category || '').trim(),
      quantity: Number(parsed.quantity) || 0,
      unit: String(parsed.unit || 'kg').trim(),
      totalPrice: Number(parsed.totalPrice) || 0,
      perUnitPrice: Number(parsed.perUnitPrice) || 0,
      reason: String(parsed.reason || '').trim(),
    };
  } catch (parseError) {
    logger.error('Failed to parse Gemini product analysis response', { rawText, parseError });
    return {
      isProduct: false,
      productName: '',
      category: '',
      quantity: 0,
      unit: '',
      totalPrice: 0,
      perUnitPrice: 0,
      reason: 'Failed to analyze the image. Please try again with a clearer photo.',
    };
  }
}

/**
 * Determine if a text-only message (no image) is a product listing intent.
 * Returns false because we require an image for product listing.
 */
export function isProductListingText(text: string): boolean {
  // Simple heuristic: check if text contains quantity + price patterns
  const hasQuantity = /\d+\s*(kg|kilogram|quintal|ton|pieces|pcs|dozen|litre|liter|কেজি|किलो|किग्रा)/i.test(text);
  const hasPrice = /\d+\s*(rupees|rs|₹|taka|টাকা|रुपये|रु)/i.test(text);
  return hasQuantity && hasPrice;
}
