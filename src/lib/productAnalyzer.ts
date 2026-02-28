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
  console.log(`\n🤖 ── GEMINI VISION CALL ──────────────────`);
  console.log(`🤖 Image size: ${imageBase64.length} base64 chars`);
  console.log(`🤖 MIME type: ${mimeType}`);
  console.log(`🤖 Available API keys: ${API_KEYS.length}`);
  console.log(`🤖 Available models: ${MODELS.join(', ')}`);
  console.log(`🤖 Max retries: ${maxRetries}`);
  process.stdout.write(`[GEMINI-VISION] Starting image analysis...\n`);

  let lastErr: any;
  for (let i = 0; i < maxRetries; i++) {
    const apiKey = API_KEYS[keyIdx];
    const model = MODELS[modelIdx];
    console.log(`🤖 Attempt ${i + 1}/${maxRetries}: key=${keyIdx + 1}, model=${model}`);
    process.stdout.write(`[GEMINI-VISION] Attempt ${i + 1} with ${model}...\n`);
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const genModel = client.getGenerativeModel({ model });
      console.log(`🤖 Sending image to Gemini ${model}...`);
      const startTime = Date.now();
      const result = await genModel.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        { text: prompt },
      ]);
      const elapsed = Date.now() - startTime;
      const responseText = result.response.text();
      console.log(`✅ Gemini responded in ${elapsed}ms (${responseText.length} chars)`);
      console.log(`🤖 Raw response: ${responseText.substring(0, 500)}`);
      process.stdout.write(`[GEMINI-VISION] ✅ Success in ${elapsed}ms\n`);
      return responseText;
    } catch (err: any) {
      lastErr = err;
      console.error(`❌ Gemini attempt ${i + 1} FAILED: ${err.message}`);
      process.stdout.write(`[GEMINI-VISION] ❌ Failed: ${err.message}\n`);
      if (isRetryable(err)) {
        console.log(`🔄 Retryable error, rotating to next model...`);
        logger.warn(`Gemini vision retry (key=${keyIdx + 1}, model=${model}): ${err.message}`);
        rotate();
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.error(`💀 Non-retryable error, throwing immediately`);
        throw err;
      }
    }
  }
  console.error(`💀 All ${maxRetries} attempts exhausted`);
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
  console.log(`\n📦 ══════════════════════════════════════════`);
  console.log(`📦 PRODUCT ANALYSIS STARTED`);
  console.log(`📦 ══════════════════════════════════════════`);
  console.log(`📦 Caption text: "${captionText}"`);
  console.log(`📦 Image size: ${imageBase64.length} base64 chars`);
  console.log(`📦 MIME type: ${mimeType}`);
  console.log(`📦 API keys available: ${API_KEYS.length}`);
  process.stdout.write(`[PRODUCT-ANALYZER] Starting analysis for: "${captionText}"\n`);

  if (API_KEYS.length === 0) {
    console.error('❌ No Gemini API keys configured!');
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

  console.log(`📦 Calling Gemini Vision for product analysis...`);
  process.stdout.write(`[PRODUCT-ANALYZER] Calling Gemini Vision...\n`);
  const rawText = await callGeminiVision(imageBase64, mimeType, prompt);
  console.log(`📦 Gemini raw response received (${rawText.length} chars)`);
  process.stdout.write(`[PRODUCT-ANALYZER] Got Gemini response, parsing JSON...\n`);

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : rawText;
    console.log(`📦 Extracted JSON: ${raw.substring(0, 300)}`);
    const parsed = JSON.parse(raw);

    const result = {
      isProduct: parsed.isProduct === true,
      productName: String(parsed.productName || '').trim(),
      category: String(parsed.category || '').trim(),
      quantity: Number(parsed.quantity) || 0,
      unit: String(parsed.unit || 'kg').trim(),
      totalPrice: Number(parsed.totalPrice) || 0,
      perUnitPrice: Number(parsed.perUnitPrice) || 0,
      reason: String(parsed.reason || '').trim(),
    };

    console.log(`📦 ── ANALYSIS RESULT ──`);
    console.log(`📦 Is Product: ${result.isProduct}`);
    console.log(`📦 Product Name: ${result.productName}`);
    console.log(`📦 Category: ${result.category}`);
    console.log(`📦 Quantity: ${result.quantity} ${result.unit}`);
    console.log(`📦 Total Price: ₹${result.totalPrice}`);
    console.log(`📦 Per Unit Price: ₹${result.perUnitPrice}/${result.unit}`);
    console.log(`📦 Reason: ${result.reason}`);
    console.log(`📦 ══════════════════════════════════════════\n`);
    process.stdout.write(`[PRODUCT-ANALYZER] ✅ Result: ${result.productName} (${result.category}) - ${result.quantity}${result.unit} @ ₹${result.perUnitPrice}\n`);

    return result;
  } catch (parseError) {
    console.error(`❌ Failed to parse Gemini response as JSON!`);
    console.error(`❌ Raw text: ${rawText}`);
    process.stdout.write(`[PRODUCT-ANALYZER] ❌ JSON parse failed\n`);
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
