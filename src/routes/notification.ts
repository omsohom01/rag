import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL; // e.g. https://your-whatsapp-service.onrender.com

// ── Interfaces ────────────────────────────────────────────────

interface DealNotificationRequest {
  /** Farmer's phone number to notify */
  farmerPhone: string;
  /** Buyer's name */
  buyerName: string;
  /** Buyer's phone number */
  buyerPhone: string;
  /** Product name */
  productName: string;
  /** Quantity accepted */
  quantity: number;
  /** Unit (kg, quintal, etc.) */
  unit: string;
  /** Accepted price */
  price: number;
  /** Buyer's location (optional) */
  buyerLocation?: string;
  /** Type of notification */
  type: 'deal_accepted' | 'deal_rejected' | 'new_offer' | 'counter_offer';
}

// ── POST /notify/whatsapp ──────────────────────────────────
// Send a WhatsApp notification to a farmer about a deal update.
// Called by the app when a buyer accepts/rejects/counters a deal.

router.post('/whatsapp', async (req: Request, res: Response) => {
  const requestId = Date.now().toString(36);
  console.log(`\n📲 ══════════════════════════════════════════`);
  console.log(`📲 WHATSAPP NOTIFICATION - Request ID: ${requestId}`);
  console.log(`📲 Time: ${new Date().toISOString()}`);
  console.log(`📲 ══════════════════════════════════════════`);
  console.log(`📲 Body: ${JSON.stringify(req.body, null, 2)}`);
  process.stdout.write(`\n[NOTIFY] ══════ NEW REQUEST ${requestId} ══════\n`);
  logger.info(`[${requestId}] WhatsApp notification request`);

  try {
    const payload = req.body as DealNotificationRequest;

    if (!payload.farmerPhone) {
      console.log(`[${requestId}] ❌ Missing farmerPhone`);
      return res.status(400).json({ success: false, message: 'farmerPhone is required' });
    }
    if (!payload.type) {
      console.log(`[${requestId}] ❌ Missing type`);
      return res.status(400).json({ success: false, message: 'type is required' });
    }

    console.log(`[${requestId}] Type: ${payload.type}`);
    console.log(`[${requestId}] To: ${payload.farmerPhone}`);
    console.log(`[${requestId}] Product: ${payload.productName}`);
    process.stdout.write(`[NOTIFY] Sending ${payload.type} to ${payload.farmerPhone}...\n`);

    // Build the notification message based on type
    let message = '';

    switch (payload.type) {
      case 'deal_accepted':
        message = `🎉 *Deal Accepted!*\n\n` +
          `A buyer has accepted your product listing:\n\n` +
          `📦 *Product:* ${payload.productName}\n` +
          `⚖️ *Quantity:* ${payload.quantity} ${payload.unit}\n` +
          `💰 *Price:* ₹${payload.price}\n\n` +
          `👤 *Buyer:* ${payload.buyerName}\n` +
          `📞 *Contact:* ${payload.buyerPhone}\n` +
          (payload.buyerLocation ? `📍 *Location:* ${payload.buyerLocation}\n` : '') +
          `\nPlease contact the buyer to arrange delivery. 🚛`;
        break;

      case 'deal_rejected':
        message = `❌ *Deal Update*\n\n` +
          `A buyer has declined your product:\n\n` +
          `📦 *Product:* ${payload.productName}\n` +
          `⚖️ *Quantity:* ${payload.quantity} ${payload.unit}\n` +
          `💰 *Price:* ₹${payload.price}\n\n` +
          `Don't worry! Your product is still listed for other buyers.`;
        break;

      case 'new_offer':
        message = `📩 *New Offer Received!*\n\n` +
          `A buyer wants to purchase your product:\n\n` +
          `📦 *Product:* ${payload.productName}\n` +
          `⚖️ *Quantity:* ${payload.quantity} ${payload.unit}\n` +
          `💰 *Offered Price:* ₹${payload.price}\n\n` +
          `👤 *Buyer:* ${payload.buyerName}\n` +
          (payload.buyerLocation ? `📍 *Location:* ${payload.buyerLocation}\n` : '') +
          `\nOpen the app to accept, reject, or counter this offer.`;
        break;

      case 'counter_offer':
        message = `🔄 *Counter Offer Received!*\n\n` +
          `A buyer has made a counter offer:\n\n` +
          `📦 *Product:* ${payload.productName}\n` +
          `⚖️ *Quantity:* ${payload.quantity} ${payload.unit}\n` +
          `💰 *New Price:* ₹${payload.price}\n\n` +
          `👤 *Buyer:* ${payload.buyerName}\n` +
          `\nOpen the app to respond to this offer.`;
        break;

      default:
        return res.status(400).json({ success: false, message: `Unknown notification type: ${payload.type}` });
    }

    // Forward the message to the WhatsApp service
    if (!WHATSAPP_SERVICE_URL) {
      // If WhatsApp service URL is not configured, try direct WhatsApp API
      const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
      const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        logger.warn(`[${requestId}] Neither WHATSAPP_SERVICE_URL nor direct WhatsApp credentials configured`);
        return res.status(200).json({
          success: false,
          message: 'WhatsApp notification service not configured. Notification saved to database only.',
          notificationSaved: true,
        });
      }

      // Send directly via WhatsApp Cloud API with retry
      const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const maxAttempts = 2;
      let lastErr: any;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await axios.post(
            url,
            {
              messaging_product: 'whatsapp',
              to: payload.farmerPhone,
              type: 'text',
              text: { body: message },
            },
            {
              headers: {
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            }
          );

          console.log(`[${requestId}] ✅ WhatsApp message sent directly to ${payload.farmerPhone}`);
          process.stdout.write(`[NOTIFY] ✅ Sent directly to ${payload.farmerPhone}\n`);
          logger.info(`[${requestId}] WhatsApp notification sent directly to ${payload.farmerPhone}`);
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          const status = err.response?.status;
          console.error(`[${requestId}] Direct WhatsApp attempt ${attempt}/${maxAttempts} failed (status=${status}): ${err.message}`);

          if (status === 401) {
            // Token expired – don't retry, log clearly
            console.error(`[${requestId}] ⚠️ WHATSAPP_ACCESS_TOKEN on RAG backend is expired/invalid! Update it in Render env vars.`);
            break;
          }

          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }

      if (lastErr) {
        // Return success anyway – the deal was accepted, notification is non-critical
        console.warn(`[${requestId}] ⚠️ WhatsApp notification failed but deal action succeeded`);
        return res.status(200).json({
          success: false,
          message: 'Deal action succeeded but WhatsApp notification could not be sent. The token may be expired.',
          notificationFailed: true,
          reason: lastErr.response?.status === 401
            ? 'WHATSAPP_ACCESS_TOKEN expired – update it in Render environment variables'
            : lastErr.message,
        });
      }
    } else {
      // Forward to WhatsApp service
      console.log(`[${requestId}] Forwarding to WhatsApp service: ${WHATSAPP_SERVICE_URL}/send-message`);
      await axios.post(
        `${WHATSAPP_SERVICE_URL}/send-message`,
        {
          to: payload.farmerPhone,
          message,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      console.log(`[${requestId}] ✅ Notification forwarded to WhatsApp service`);
      process.stdout.write(`[NOTIFY] ✅ Forwarded to WhatsApp service\n`);
      logger.info(`[${requestId}] WhatsApp notification forwarded to WhatsApp service for ${payload.farmerPhone}`);
    }

    console.log(`[${requestId}] ✅ NOTIFICATION COMPLETE`);
    console.log(`📲 ══════════════════════════════════════════\n`);
    return res.status(200).json({
      success: true,
      message: 'WhatsApp notification sent successfully',
    });
  } catch (error: any) {
    console.error(`[${requestId}] ❌ NOTIFICATION FAILED: ${error.message}`);
    console.error(`[${requestId}] Stack: ${error.stack}`);
    process.stdout.write(`[NOTIFY] ❌ FAILED: ${error.message}\n`);
    logger.error(`[${requestId}] Failed to send WhatsApp notification`, error);
    // Return 200 so the app doesn't treat this as a hard failure
    // The deal action itself already succeeded; notification is best-effort
    return res.status(200).json({
      success: false,
      message: 'WhatsApp notification failed but deal action was not affected.',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

export default router;
