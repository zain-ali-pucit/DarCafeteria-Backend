/**
 * Firebase Admin SDK singleton.
 *
 * Initialised lazily the first time a sender helper is called, so the
 * server can boot even when Firebase credentials aren't configured yet
 * (push features will simply throw a helpful error when used). Two
 * credential sources are supported, in order of preference:
 *
 *   1. FIREBASE_SERVICE_ACCOUNT_PATH — absolute path to the JSON the
 *      Firebase Console gives you.
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *      inlined in env. (Convenient for hosted deploys.)
 *
 * The exported helpers wrap the Admin SDK in promises that always resolve
 * to a {successCount, failureCount, invalidTokens} shape, so callers don't
 * have to care which underlying API was used (multicast vs. send-each).
 */

const path = require('path');
const fs = require('fs');
const env = require('../config/env');

let admin = null;
let app = null;

function loadAdmin() {
  if (admin) return admin;
  // Lazy-require so the dependency is optional at boot time.
  // eslint-disable-next-line global-require
  admin = require('firebase-admin');
  return admin;
}

function buildCredential() {
  const fbAdmin = loadAdmin();

  // Path-based credentials win if both forms are provided.
  if (env.firebase.serviceAccountPath) {
    const abs = path.isAbsolute(env.firebase.serviceAccountPath)
      ? env.firebase.serviceAccountPath
      : path.join(process.cwd(), env.firebase.serviceAccountPath);
    if (!fs.existsSync(abs)) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH points at a non-existent file: ${abs}`
      );
    }
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const json = require(abs);
    return {
      credential: fbAdmin.credential.cert(json),
      projectId: json.project_id,
    };
  }

  if (
    env.firebase.projectId &&
    env.firebase.clientEmail &&
    env.firebase.privateKey
  ) {
    return {
      credential: fbAdmin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
      projectId: env.firebase.projectId,
    };
  }

  throw new Error(
    'Firebase Admin SDK is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or ' +
      'FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in your env.'
  );
}

function getApp() {
  if (app) return app;
  const fbAdmin = loadAdmin();
  if (fbAdmin.apps.length > 0) {
    app = fbAdmin.apps[0];
    return app;
  }
  const { credential, projectId } = buildCredential();
  app = fbAdmin.initializeApp({ credential, projectId });
  return app;
}

function isConfigured() {
  return !!(
    env.firebase.serviceAccountPath ||
    (env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey)
  );
}

/** Build the FCM message payload from admin-form fields. */
function buildMessage({ title, body, data }) {
  const message = {
    notification: { title, body },
  };
  if (data && typeof data === 'object') {
    // FCM data values must be strings.
    message.data = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );
  }
  // Per-platform tweaks: high priority, default sound, brand colour.
  message.android = {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'dar_cafeteria_default',
      color: '#E07A45',
    },
  };
  message.apns = {
    payload: { aps: { sound: 'default' } },
  };
  return message;
}

/**
 * Send to a list of FCM tokens, returning a uniform summary plus the list
 * of tokens Firebase explicitly rejected (so the caller can deactivate
 * them in our own DB).
 */
async function sendToTokens(tokens, content) {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }
  const fbAdmin = loadAdmin();
  getApp();

  const messaging = fbAdmin.messaging();
  const message = buildMessage(content);

  // sendEachForMulticast handles batches up to 500 tokens.
  const invalidTokens = [];
  let successCount = 0;
  let failureCount = 0;

  // Chunk to be safe on very large audiences.
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      ...message,
      tokens: chunk,
    });
    successCount += response.successCount;
    failureCount += response.failureCount;
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(chunk[idx]);
        }
      }
    });
  }

  return { successCount, failureCount, invalidTokens };
}

/** Send to a topic. Subscriptions must already be set up on the device side. */
async function sendToTopic(topic, content) {
  const fbAdmin = loadAdmin();
  getApp();
  const messaging = fbAdmin.messaging();
  const message = { ...buildMessage(content), topic };
  await messaging.send(message);
  // Topic sends don't return per-recipient counts; report best-effort 1/0.
  return { successCount: 1, failureCount: 0, invalidTokens: [] };
}

module.exports = {
  isConfigured,
  sendToTokens,
  sendToTopic,
};
