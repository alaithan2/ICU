/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ⬇️ PASTE YOUR FIREBASE CONFIG HERE ⬇️
// Firebase console → Project settings (gear icon) → General →
//   "Your apps" → Web app → "SDK setup and configuration" → Config.
// These values are NOT secret — Firebase web config is public by design;
// access is controlled by Firestore security rules, so it's fine to commit.
const firebaseConfig = {
  apiKey: 'AIzaSyA-2VjjrDq2fejIDV4Zb2-2WjfuoadvEz8',
  authDomain: 'icu-oncall.firebaseapp.com',
  databaseURL: 'https://icu-oncall-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'icu-oncall',
  storageBucket: 'icu-oncall.firebasestorage.app',
  messagingSenderId: '132203854388',
  appId: '1:132203854388:web:f3eefd50b54950aa50e861',
  measurementId: 'G-Z0FGSYHHMS'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
