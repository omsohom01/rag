import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '../utils/logger';

let app: App;
let db: Firestore;

/**
 * Initialize Firebase Admin SDK.
 *
 * Supports two modes:
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON env var (full JSON string)
 * 2. Individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
function initFirebase(): void {
  if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
      logger.info('Firebase Admin initialized with service account JSON');
    } catch (err) {
      logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', err);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      logger.warn(
        'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).'
      );
      throw new Error('Firebase Admin credentials not configured');
    }

    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    logger.info('Firebase Admin initialized with individual credentials');
  }

  db = getFirestore(app);
}

// Initialize on import
initFirebase();

export { db, Timestamp, FieldValue };
