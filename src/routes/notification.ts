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
  logger.info(`[${requestId}] WhatsApp notification request`);

  try {
    const payload = req.body as DealNotificationRequest;

    if (!payload.farmerPhone) {
      return res.status(400).json({ success: false, message: 'farmerPhone is required' });
    }
    if (!payload.type) {
      return res.status(400).json({ success: false, message: 'type is required' });
    }

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

      // Send directly via WhatsApp Cloud API
      const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
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

      logger.info(`[${requestId}] WhatsApp notification sent directly to ${payload.farmerPhone}`);
    } else {
      // Forward to WhatsApp service
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

      logger.info(`[${requestId}] WhatsApp notification forwarded to WhatsApp service for ${payload.farmerPhone}`);
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp notification sent successfully',
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Failed to send WhatsApp notification`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send WhatsApp notification',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

export default router;
