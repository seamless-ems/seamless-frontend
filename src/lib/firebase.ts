import { initializeApp } from "firebase/app";
import { getAuth, onIdTokenChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut, GoogleAuthProvider, OAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { setToken, clearToken } from "./auth";
import tryExchangeWithRetry from "./tokenExchange";

// NOTE: You must set these env vars in your .env (Vite) or replace with your config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig as Record<string, any>);
export const auth = getAuth(app);

// Listen for token changes and mirror ID token into localStorage via setToken
onIdTokenChanged(auth, async (user) => {
  try {
    if (!user) {
      clearToken();
      return;
    }
    const idToken = await user.getIdToken();
    // Try to exchange the Firebase ID token for a backend token so backend can link user records.
    try {
      const backendToken = await tryExchangeWithRetry(idToken);
      if (backendToken && backendToken.accessToken) {
        setToken(backendToken.accessToken);
        return;
      }
    } catch (e) {
      // If exchange fails, fallback to using the Firebase ID token directly.
      // eslint-disable-next-line no-console
      console.warn("exchangeFirebaseToken failed, falling back to raw Firebase ID token:", e);
    }

    setToken(idToken);
  } catch (e) {
    console.error("Error getting ID token from Firebase user", e);
  }
});

export async function signIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential;
}

export async function signUp(email: string, password: string, displayName?: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    try {
      await updateProfile(userCredential.user, { displayName });
    } catch (e) {
      // ignore updateProfile errors
      // eslint-disable-next-line no-console
      console.warn("updateProfile failed:", e);
    }
  }
  return userCredential;
}

export async function signOut() {
  await fbSignOut(auth);
  clearToken();
}

export async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result;
}

export async function signInWithMicrosoftPopup() {
  const provider = new OAuthProvider("microsoft.com");
  const result = await signInWithPopup(auth, provider);
  return result;
}
