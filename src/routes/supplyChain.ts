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
  logger.info(`[${requestId}] Supply-chain product upload request`);

  try {
    const {
      imageBase64,
      mimeType,
      captionText,
      farmerPhone,
      farmerName,
    } = req.body as AddProductRequest;

    // Validate required fields
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'imageBase64 is required' });
    }
    if (!captionText) {
      return res.status(400).json({ success: false, message: 'captionText is required (include quantity and price)' });
    }
    if (!farmerPhone) {
      return res.status(400).json({ success: false, message: 'farmerPhone is required' });
    }

    logger.info(`[${requestId}] Analyzing product image from ${farmerPhone}...`);

    // Step 1: Analyze image + text with Gemini
    const analysis = await analyzeWhatsAppProduct(
      imageBase64,
      mimeType || 'image/jpeg',
      captionText
    );

    logger.info(`[${requestId}] Analysis result: ${JSON.stringify(analysis)}`);

    if (!analysis.isProduct) {
      return res.status(200).json({
        success: false,
        message: analysis.reason || 'The image does not appear to be a food/agricultural product, or quantity/price info is missing.',
        analysis,
      } as AddProductResponse);
    }

    if (analysis.quantity <= 0 || analysis.totalPrice <= 0) {
      return res.status(200).json({
        success: false,
        message: 'Could not extract valid quantity and price from your message. Please include both (e.g., "20kg 2000 rupees").',
        analysis,
      } as AddProductResponse);
    }

    // Step 2: Look up farmer in Firestore by phone number
    // Try to find existing farmer profile
    let farmerId = '';
    let resolvedFarmerName = farmerName || 'WhatsApp Farmer';
    let farmerLocation = '';

    try {
      // Search users collection for this phone number
      const usersSnap = await db
        .collection('users')
        .where('phone', '==', farmerPhone)
        .limit(1)
        .get();

      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        farmerId = userDoc.id;
        const userData = userDoc.data();
        resolvedFarmerName = userData.displayName || userData.name || resolvedFarmerName;
        farmerLocation = userData.location || userData.address || '';
        logger.info(`[${requestId}] Found farmer in DB: ${farmerId} (${resolvedFarmerName})`);
      } else {
        // Try with normalized phone (add +91 if not present)
        const normalizedPhone = farmerPhone.startsWith('+')
          ? farmerPhone
          : farmerPhone.startsWith('91')
            ? `+${farmerPhone}`
            : `+91${farmerPhone}`;

        const normalizedSnap = await db
          .collection('users')
          .where('phone', '==', normalizedPhone)
          .limit(1)
          .get();

        if (!normalizedSnap.empty) {
          const userDoc = normalizedSnap.docs[0];
          farmerId = userDoc.id;
          const userData = userDoc.data();
          resolvedFarmerName = userData.displayName || userData.name || resolvedFarmerName;
          farmerLocation = userData.location || userData.address || '';
          logger.info(`[${requestId}] Found farmer with normalized phone: ${farmerId}`);
        } else {
          // Create a reference ID from the phone number
          farmerId = `whatsapp_${farmerPhone.replace(/\D/g, '')}`;
          logger.info(`[${requestId}] Farmer not found in DB, using generated ID: ${farmerId}`);
        }
      }
    } catch (lookupErr) {
      logger.warn(`[${requestId}] Failed to look up farmer, using phone-based ID`, lookupErr);
      farmerId = `whatsapp_${farmerPhone.replace(/\D/g, '')}`;
    }

    // Step 3: Store image as data URL (base64 embedded) since we don't have Firebase Storage on server
    const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    // Step 4: Add product to Firestore
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

    const docRef = await db.collection('products').add(productData);

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

    return res.status(201).json(response);
  } catch (error: any) {
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
