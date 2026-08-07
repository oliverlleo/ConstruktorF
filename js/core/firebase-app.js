import { firebaseConfig } from '../config.js';

let persistenceConfigured = false;

function getFirebaseGlobal() {
  if (typeof window === 'undefined' || !window.firebase) {
    throw new Error('Firebase SDK não foi carregado na página.');
  }
  return window.firebase;
}

export function ensureFirebaseApp() {
  const firebase = getFirebaseGlobal();
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  return firebase.app();
}

export async function getAuth() {
  const firebase = getFirebaseGlobal();
  ensureFirebaseApp();
  const auth = firebase.auth();

  if (!persistenceConfigured) {
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } finally {
      persistenceConfigured = true;
    }
  }

  return auth;
}

export function getFirestore() {
  const firebase = getFirebaseGlobal();
  ensureFirebaseApp();
  return firebase.firestore();
}

export function getStorage() {
  const firebase = getFirebaseGlobal();
  ensureFirebaseApp();
  return firebase.storage();
}

export function getFunctions() {
  const firebase = getFirebaseGlobal();
  ensureFirebaseApp();
  if (!firebase.functions) {
    throw new Error('Firebase Functions SDK não foi carregado na página.');
  }
  return firebase.functions();
}

export function getFirebaseNamespace() {
  ensureFirebaseApp();
  return getFirebaseGlobal();
}
