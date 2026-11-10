import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import type { Language } from "../types";
import { parseProgress, type Progress } from "./progress";
const configured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
);
const app = configured
  ? initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })
  : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export async function googleLogin(): Promise<User> {
  if (!auth)
    throw new Error(
      "GoogleログインにはFirebaseの設定が必要です。今はゲストで冒険を始められます。",
    );
  const provider = new GoogleAuthProvider();
  if (auth.currentUser?.isAnonymous) {
    try {
      return (await linkWithPopup(auth.currentUser, provider)).user;
    } catch (e: any) {
      if (e.code !== "auth/credential-already-in-use") throw e;
    }
  }
  return (await signInWithPopup(auth, provider)).user;
}
export async function guestLogin() {
  if (auth) {
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
  }
}
export async function logout() {
  if (auth) await signOut(auth);
}
export async function readCloudProgress(
  uid: string,
  language: Language,
): Promise<Progress | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "pleaseUsers", uid, "progress", language));
  return snap.exists() ? parseProgress(snap.data()) : null;
}
export async function writeCloudProgress(
  uid: string,
  language: Language,
  progress: Progress,
) {
  if (db) await setDoc(doc(db, "pleaseUsers", uid, "progress", language), progress);
}
