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
  console.log('\n🔥 ══════════════════════════════════════════');
  console.log('🔥 FIREBASE ADMIN SDK INITIALIZATION');
  console.log('🔥 ══════════════════════════════════════════');
  process.stdout.write('[FIREBASE] Starting initialization...\n');

  if (getApps().length > 0) {
    console.log('🔥 Firebase app already initialized, reusing existing instance');
    app = getApps()[0];
    db = getFirestore(app);
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  console.log(`🔥 FIREBASE_SERVICE_ACCOUNT_JSON present: ${!!serviceAccountJson}`);
  console.log(`🔥 FIREBASE_SERVICE_ACCOUNT_JSON length: ${serviceAccountJson?.length ?? 0}`);

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      console.log(`🔥 Parsed service account - project_id: ${serviceAccount.project_id}`);
      console.log(`🔥 Client email: ${serviceAccount.client_email}`);
      process.stdout.write(`[FIREBASE] Initializing with project: ${serviceAccount.project_id}\n`);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized SUCCESSFULLY with service account JSON');
      process.stdout.write('[FIREBASE] ✅ Initialization complete\n');
      logger.info('Firebase Admin initialized with service account JSON');
    } catch (err) {
      console.error('❌ FIREBASE INIT FAILED - Could not parse FIREBASE_SERVICE_ACCOUNT_JSON');
      console.error('❌ Error:', err);
      process.stdout.write('[FIREBASE] ❌ FAILED to parse service account JSON\n');
      logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', err);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log(`🔥 Individual creds - projectId: ${projectId ? 'SET' : 'NOT SET'}`);
    console.log(`🔥 Individual creds - clientEmail: ${clientEmail ? 'SET' : 'NOT SET'}`);
    console.log(`🔥 Individual creds - privateKey: ${privateKey ? 'SET' : 'NOT SET'}`);

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ FIREBASE INIT FAILED - Missing credentials');
      process.stdout.write('[FIREBASE] ❌ FAILED - Missing credentials\n');
      logger.warn(
        'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).'
      );
      throw new Error('Firebase Admin credentials not configured');
    }

    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    console.log('✅ Firebase Admin initialized SUCCESSFULLY with individual credentials');
    logger.info('Firebase Admin initialized with individual credentials');
  }

  db = getFirestore(app);
  console.log('🔥 Firestore instance created');
  console.log('🔥 ══════════════════════════════════════════\n');
}

// Initialize on import
initFirebase();

export { db, Timestamp, FieldValue };
