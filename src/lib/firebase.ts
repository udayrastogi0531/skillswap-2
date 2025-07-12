// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth }           from "firebase/auth";
import { getFirestore }      from "firebase/firestore";
import { getStorage }        from "firebase/storage";

// Your web app’s Firebase configuration pulled from environment vars
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Initialize Firebase only once
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Export auth, firestore, storage instances
export const auth    = getAuth();
export const db      = getFirestore();
export const storage = getStorage();
