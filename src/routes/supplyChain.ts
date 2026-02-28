import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { db, Timestamp } from '../lib/firebase';
import { analyzeWhatsAppProduct, ProductAnalysis } from '../lib/productAnalyzer';
import { logger } from '../utils/logger';

const router = Router();

// ── Interfaces ────────────────────────────────────────────────

interface AddProductRequest {
  /** Base64-encoded image of the product */
  imageBase64: string;
  /** MIME type of the image (e.g. "image/jpeg") */
  mimeType: string;
  /** Caption / text from the farmer (e.g. "20kg 2000 rupees") */
  captionText: string;
  /** Farmer's phone number (from WhatsApp) */
  farmerPhone: string;
  /** Farmer's name (from WhatsApp contact profile) */
  farmerName?: string;
}

interface AddProductResponse {
  success: boolean;
  message: string;
  product?: {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    rate: number;
    totalPrice: number;
  };
  analysis?: ProductAnalysis;
}

// ── POST /supply-chain/product ─────────────────────────────
// Receives an image + text from WhatsApp, analyzes it,
// and adds the product directly to Firestore.

router.post('/product', async (req: Request, res: Response) => {
  const requestId = Date.now().toString(36);
  const separator = '═'.repeat(60);

  console.log(`\n${separator}`);
  console.log(`🚀 SUPPLY CHAIN PRODUCT UPLOAD - Request ID: ${requestId}`);
  console.log(`🚀 Time: ${new Date().toISOString()}`);
  console.log(separator);
  process.stdout.write(`\n[SUPPLY-CHAIN] ══════ NEW REQUEST ${requestId} ══════\n`);
  logger.info(`[${requestId}] Supply-chain product upload request`);

  try {
    const {
      imageBase64,
      mimeType,
      captionText,
      farmerPhone,
      farmerName,
    } = req.body as AddProductRequest;

    console.log(`[${requestId}] STEP 0: REQUEST VALIDATION`);
    console.log(`[${requestId}]   imageBase64: ${imageBase64 ? `${imageBase64.length} chars` : 'MISSING'}`);
    console.log(`[${requestId}]   mimeType: ${mimeType || 'not provided (default: image/jpeg)'}`);
    console.log(`[${requestId}]   captionText: "${captionText}"`);
    console.log(`[${requestId}]   farmerPhone: ${farmerPhone}`);
    console.log(`[${requestId}]   farmerName: ${farmerName || '(not provided)'}`);
    process.stdout.write(`[SUPPLY-CHAIN] Farmer: ${farmerPhone}, Caption: "${captionText}"\n`);

    // Validate required fields
    if (!imageBase64) {
      console.log(`[${requestId}] ❌ REJECTED: imageBase64 is missing`);
      return res.status(400).json({ success: false, message: 'imageBase64 is required' });
    }
    if (!captionText) {
      console.log(`[${requestId}] ❌ REJECTED: captionText is missing`);
      return res.status(400).json({ success: false, message: 'captionText is required (include quantity and price)' });
    }
    if (!farmerPhone) {
      console.log(`[${requestId}] ❌ REJECTED: farmerPhone is missing`);
      return res.status(400).json({ success: false, message: 'farmerPhone is required' });
    }

    console.log(`[${requestId}] ✅ Validation passed`);
    console.log(`\n[${requestId}] STEP 1: AI IMAGE ANALYSIS (Gemini Vision)`);
    process.stdout.write(`[SUPPLY-CHAIN] STEP 1: Analyzing image with AI...\n`);
    logger.info(`[${requestId}] Analyzing product image from ${farmerPhone}...`);

    // Step 1: Analyze image + text with Gemini
    const analysisStart = Date.now();
    const analysis = await analyzeWhatsAppProduct(
      imageBase64,
      mimeType || 'image/jpeg',
      captionText
    );
    const analysisTime = Date.now() - analysisStart;

    console.log(`[${requestId}] ✅ AI Analysis completed in ${analysisTime}ms`);
    console.log(`[${requestId}] Analysis result: ${JSON.stringify(analysis, null, 2)}`);
    process.stdout.write(`[SUPPLY-CHAIN] ✅ AI analysis done in ${analysisTime}ms: ${analysis.productName || 'NOT A PRODUCT'}\n`);
    logger.info(`[${requestId}] Analysis result: ${JSON.stringify(analysis)}`);

    if (!analysis.isProduct) {
      console.log(`[${requestId}] ❌ NOT a product: ${analysis.reason}`);
      process.stdout.write(`[SUPPLY-CHAIN] ❌ Rejected: Not a valid product\n`);
      return res.status(200).json({
        success: false,
        message: analysis.reason || 'The image does not appear to be a food/agricultural product, or quantity/price info is missing.',
        analysis,
      } as AddProductResponse);
    }

    if (analysis.quantity <= 0 || analysis.totalPrice <= 0) {
      console.log(`[${requestId}] ❌ Invalid quantity/price: qty=${analysis.quantity}, price=${analysis.totalPrice}`);
      process.stdout.write(`[SUPPLY-CHAIN] ❌ Rejected: Invalid quantity or price\n`);
      return res.status(200).json({
        success: false,
        message: 'Could not extract valid quantity and price from your message. Please include both (e.g., "20kg 2000 rupees").',
        analysis,
      } as AddProductResponse);
    }

    // Step 2: Look up farmer in Firestore by phone number
    console.log(`\n[${requestId}] STEP 2: FARMER LOOKUP IN FIRESTORE`);
    process.stdout.write(`[SUPPLY-CHAIN] STEP 2: Looking up farmer ${farmerPhone} in Firestore...\n`);
    let farmerId = '';
    let resolvedFarmerName = farmerName || 'WhatsApp Farmer';
    let farmerLocation = '';

    try {
      // Search users collection for this phone number
      // The app stores phone as 'phoneNumber' and 'mobileNumber' fields (not 'phone')
      // Phone format in Firestore: "+919836444455" (E.164)
      // Phone from WhatsApp: "919836444455" (no +)
      const normalizedPhone = farmerPhone.startsWith('+')
        ? farmerPhone
        : farmerPhone.startsWith('91')
          ? `+${farmerPhone}`
          : `+91${farmerPhone}`;
      const rawPhone = farmerPhone;

      console.log(`[${requestId}]   Querying 'users' collection for phone: ${rawPhone} / ${normalizedPhone}`);

      // Try multiple phone field names and formats
      const phoneFields = ['phoneNumber', 'mobileNumber', 'phone'];
      const phoneValues = [...new Set([normalizedPhone, rawPhone])]; // deduplicate

      let found = false;

      for (const field of phoneFields) {
        if (found) break;
        for (const phoneVal of phoneValues) {
          if (found) break;
          console.log(`[${requestId}]   Trying: ${field} == "${phoneVal}"`);
          const snap = await db
            .collection('users')
            .where(field, '==', phoneVal)
            .limit(1)
            .get();

          if (!snap.empty) {
            const userDoc = snap.docs[0];
            farmerId = userDoc.id;
            const userData = userDoc.data();
            resolvedFarmerName = userData.displayName || userData.name || resolvedFarmerName;
            farmerLocation = userData.location || userData.address || userData.farmerLocation || '';
            console.log(`[${requestId}]   ✅ Found farmer via ${field}="${phoneVal}": ID=${farmerId}, Name=${resolvedFarmerName}`);
            process.stdout.write(`[SUPPLY-CHAIN] ✅ Found farmer in DB: ${resolvedFarmerName} (${farmerId})\n`);
            logger.info(`[${requestId}] Found farmer in DB: ${farmerId} (${resolvedFarmerName})`);
            found = true;
          }
        }
      }

      if (!found) {
        // Create a reference ID from the phone number
        farmerId = `whatsapp_${farmerPhone.replace(/\D/g, '')}`;
        console.log(`[${requestId}]   ⚠️ Farmer not found in DB with any phone field. Generated ID: ${farmerId}`);
        process.stdout.write(`[SUPPLY-CHAIN] ⚠️ Farmer not in DB, using ID: ${farmerId}\n`);
        logger.info(`[${requestId}] Farmer not found in DB, using generated ID: ${farmerId}`);
      }
    } catch (lookupErr: any) {
      console.error(`[${requestId}]   ❌ Farmer lookup FAILED: ${lookupErr.message}`);
      process.stdout.write(`[SUPPLY-CHAIN] ❌ Farmer lookup failed: ${lookupErr.message}\n`);
      logger.warn(`[${requestId}] Failed to look up farmer, using phone-based ID`, lookupErr);
      farmerId = `whatsapp_${farmerPhone.replace(/\D/g, '')}`;
    }

    // Step 3: Store image as data URL (base64 embedded) since we don't have Firebase Storage on server
    console.log(`\n[${requestId}] STEP 3: PREPARING IMAGE DATA URL`);
    const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
    console.log(`[${requestId}]   Image data URL length: ${imageDataUrl.length} chars`);
    process.stdout.write(`[SUPPLY-CHAIN] STEP 3: Image prepared (${imageDataUrl.length} chars)\n`);

    // Step 4: Add product to Firestore
    console.log(`\n[${requestId}] STEP 4: WRITING PRODUCT TO FIRESTORE`);
    process.stdout.write(`[SUPPLY-CHAIN] STEP 4: Writing to Firestore...\n`);
    const productData = {
      farmerId,
      farmerName: resolvedFarmerName,
      farmerPhone,
      farmerLocation,
      name: analysis.productName,
      image: imageDataUrl,
      rate: analysis.perUnitPrice,
      quantity: analysis.quantity,
      unit: analysis.unit,
      category: analysis.category,
      imageEmbedded: true,
      source: 'whatsapp', // Mark as added via WhatsApp
      createdAt: Timestamp.now(),
    };

    console.log(`[${requestId}]   Product data: ${JSON.stringify({ ...productData, image: `[${imageDataUrl.length} chars]` }, null, 2)}`);
    const writeStart = Date.now();
    const docRef = await db.collection('products').add(productData);
    const writeTime = Date.now() - writeStart;

    console.log(`[${requestId}]   ✅ PRODUCT SAVED TO FIRESTORE!`);
    console.log(`[${requestId}]   Document ID: ${docRef.id}`);
    console.log(`[${requestId}]   Write time: ${writeTime}ms`);
    console.log(`[${requestId}]   Collection: products`);
    process.stdout.write(`[SUPPLY-CHAIN] ✅ Product saved! Doc ID: ${docRef.id} (${writeTime}ms)\n`);
    logger.info(`[${requestId}] Product added to Firestore: ${docRef.id}`);

    const response: AddProductResponse = {
      success: true,
      message: `✅ Your product has been listed!\n\n📦 Product: ${analysis.productName}\n📂 Category: ${analysis.category}\n⚖️ Quantity: ${analysis.quantity} ${analysis.unit}\n💰 Price: ₹${analysis.perUnitPrice}/${analysis.unit}\n💵 Total: ₹${analysis.totalPrice}\n\nBuyers can now see your product in the marketplace!`,
      product: {
        id: docRef.id,
        name: analysis.productName,
        category: analysis.category,
        quantity: analysis.quantity,
        unit: analysis.unit,
        rate: analysis.perUnitPrice,
        totalPrice: analysis.totalPrice,
      },
      analysis,
    };

    console.log(`\n[${requestId}] ✅ ══════ REQUEST COMPLETE ══════`);
    console.log(`[${requestId}] Product: ${analysis.productName} (${analysis.category})`);
    console.log(`[${requestId}] Quantity: ${analysis.quantity} ${analysis.unit}`);
    console.log(`[${requestId}] Price: ₹${analysis.perUnitPrice}/${analysis.unit} (Total: ₹${analysis.totalPrice})`);
    console.log(`[${requestId}] Farmer: ${resolvedFarmerName} (${farmerPhone})`);
    console.log(`[${requestId}] Firebase Doc: ${docRef.id}`);
    console.log(`[${requestId}] ════════════════════════════════\n`);
    process.stdout.write(`[SUPPLY-CHAIN] ✅ COMPLETE: ${analysis.productName} listed for ${resolvedFarmerName}\n\n`);

    return res.status(201).json(response);
  } catch (error: any) {
    console.error(`\n[${requestId}] ❌ ══════ REQUEST FAILED ══════`);
    console.error(`[${requestId}] Error: ${error.message}`);
    console.error(`[${requestId}] Stack: ${error.stack}`);
    console.error(`[${requestId}] ════════════════════════════════\n`);
    process.stdout.write(`[SUPPLY-CHAIN] ❌ FAILED: ${error.message}\n\n`);
    logger.error(`[${requestId}] Supply-chain product upload failed`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process product. Please try again.',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

// ── GET /supply-chain/products/:farmerPhone ─────────────────
// Get all products for a farmer by phone number

router.get('/products/:farmerPhone', async (req: Request, res: Response) => {
  try {
    const { farmerPhone } = req.params;

    const snapshot = await db
      .collection('products')
      .where('farmerPhone', '==', farmerPhone)
      .get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ products });
  } catch (error: any) {
    logger.error('Failed to fetch products', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;
