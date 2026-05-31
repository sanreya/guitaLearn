/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserStats } from './types';

// Load config safely
import firebaseConfig from '../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Check if firebase is real or placeholder
export const isPlaceholderConfig = !firebaseConfig || firebaseConfig.apiKey === 'PLACEHOLDER_KEY';

let app: any = null;
let db: any = null;
let auth: any = null;

if (!isPlaceholderConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error('Error initializing Firebase SDK:', error);
  }
}

/**
 * Standard security-hardened error handler required by firebase-integration skill
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || 'simulated-user-id',
      email: auth?.currentUser?.email || 'simulated@example.com',
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error Payload:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Simple types for simulated multi-user environment
export interface SimulatedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

// Local simulation active states if real Firebase isn't populated yet
let simulatedUserListener: ((user: SimulatedUser | null) => void) | null = null;
let activeSimulatedUser: SimulatedUser | null = (() => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem('gq_simulated_user');
  return saved ? JSON.parse(saved) : null;
})();

export function subscribeToAuth(callback: (user: FirebaseUser | SimulatedUser | null) => void) {
  if (!isPlaceholderConfig && auth) {
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  } else {
    simulatedUserListener = callback;
    // trigger immediate state
    callback(activeSimulatedUser);
    return () => {
      simulatedUserListener = null;
    };
  }
}

export async function loginWithGoogle(): Promise<FirebaseUser | SimulatedUser> {
  if (!isPlaceholderConfig && auth) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } else {
    // Simulated Google popup login for development/pre-deployment preview
    const sampleUsers: SimulatedUser[] = [
      { uid: 'sim_shredder_99', email: 'acoustic.shredder@example.com', displayName: 'Acoustic Shredder' },
      { uid: 'sim_wizard_44', email: 'wizard.of.tone@example.com', displayName: 'Guitar Wizard' },
      { uid: 'sim_campfire_88', email: 'campfire.legend@example.com', displayName: 'Campfire Legend' },
    ];
    // Prompt or select randomly to simulate login choice
    const userChoice = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
    activeSimulatedUser = userChoice;
    localStorage.setItem('gq_simulated_user', JSON.stringify(userChoice));
    if (simulatedUserListener) {
      simulatedUserListener(userChoice);
    }
    return userChoice;
  }
}

export async function logoutUser() {
  if (!isPlaceholderConfig && auth) {
    await signOut(auth);
  } else {
    activeSimulatedUser = null;
    localStorage.removeItem('gq_simulated_user');
    if (simulatedUserListener) {
      simulatedUserListener(null);
    }
  }
}

// Syncing User stats to Database (Firestore or Simulated LocalStorage partition)
export async function fetchUserStatsFromDb(userId: string): Promise<UserStats | null> {
  const collectionPath = `users/${userId}`;
  if (!isPlaceholderConfig && db) {
    try {
      const docRef = doc(db, 'users', userId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as UserStats;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  } else {
    // Simulated multi-user LocalStore partition save
    const value = localStorage.getItem(`gq_stats_user_${userId}`);
    return value ? JSON.parse(value) : null;
  }
}

export async function saveUserStatsToDb(userId: string, stats: UserStats): Promise<void> {
  const collectionPath = `users/${userId}`;
  const dataToSave = {
    ...stats,
    uid: userId // ensure UID field always present matching core security guidelines
  };

  if (!isPlaceholderConfig && db) {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionPath);
    }
  } else {
    localStorage.setItem(`gq_stats_user_${userId}`, JSON.stringify(dataToSave));
    // Also update parent default compatibility key
    localStorage.setItem('gq_user_stats', JSON.stringify(dataToSave));
  }
}
