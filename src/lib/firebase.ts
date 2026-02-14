import { initializeApp } from "firebase/app";
import { getAuth, onIdTokenChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut, GoogleAuthProvider, OAuthProvider, signInWithPopup, updateProfile, type UserCredential } from "firebase/auth";
import { setTokenAndNotify, clearTokenAndNotify, setUserAndNotify, clearUserAndNotify } from "./session";
import { exchangeFirebaseToken } from "./api";

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

// Centralized token handling function
async function handleAuthToken(user: { getIdToken: () => Promise<string> } | null): Promise<boolean> {
  console.log("[firebase] handleAuthToken: entered; user=", !!user);

  if (!user) {
    console.log("[firebase] handleAuthToken: no user, clearing token");
    clearTokenAndNotify();
    return false;
  }

  let idToken: string | null = null;
  try {
    idToken = await user.getIdToken();
    console.log("[firebase] handleAuthToken: got idToken (len=", idToken?.length, ")");
  } catch (e) {
    console.error("[firebase] handleAuthToken: failed to getIdToken:", e);
  }

  if (!idToken) {
    console.warn("[firebase] handleAuthToken: no idToken available, aborting");
    clearTokenAndNotify();
    return false;
  }

  try {
    console.log("[firebase] handleAuthToken: attempting backend exchange");
    const backendToken = await exchangeFirebaseToken(idToken);
    console.log("[firebase] handleAuthToken: backend exchange result:", backendToken);
    // support various backend shapes: access_token, accessToken, token
    const tokenFromBackend = backendToken && ((backendToken as any).access_token || (backendToken as any).accessToken || (backendToken as any).token || (backendToken as any).accessToken);
    if (tokenFromBackend) {
      try {
        console.log("[firebase] handleAuthToken: storing backend access token (len=", tokenFromBackend.length, ")");
      } catch (e) {
        // ignore logging length errors
      }
      setTokenAndNotify(tokenFromBackend as string);
      return true;
    }
    console.warn('[firebase] handleAuthToken: backend exchange returned no access token');
  } catch (e) {
    console.warn('[firebase] handleAuthToken: Token exchange failed', e);
  }

  // Do not persist Firebase idToken as `auth_token`. Clear any stale token instead.
  clearTokenAndNotify();
  return false;
}

// Listen for token changes and mirror ID token into localStorage
onIdTokenChanged(auth, (user) => {
  console.log("[firebase] onIdTokenChanged fired; user=", !!user);
  if (!user) {
    console.log('[firebase] onIdTokenChanged: no user - clearing token and user');
    clearTokenAndNotify();
    clearUserAndNotify();
    return;
  }

  handleAuthToken(user)
    .then((success) => {
      try {
        const profile = {
          id: (user as any).uid,
          email: (user as any).email || '',
          name: (user as any).displayName || undefined,
          avatar: (user as any).photoURL || undefined,
        };
        if (success) {
          console.log('[firebase] onIdTokenChanged: token exchange succeeded, setting user profile', profile);
          setUserAndNotify(profile);
        } else {
          console.log('[firebase] onIdTokenChanged: token exchange failed/no backend token; clearing user');
          clearUserAndNotify();
        }
      } catch (e) {
        console.warn('[firebase] onIdTokenChanged: failed to handle user profile', e);
      }
    })
    .catch((e) => console.error("[firebase] Error handling auth token:", e));
});

export async function signIn(email: string, password: string) {
  console.log("[firebase] signIn: starting for", email);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log("[firebase] signIn: success", !!cred);
  return cred;
}

export async function signUp(email: string, password: string, displayName?: string) {
  console.log("[firebase] signUp: starting for", email, "displayName=", displayName);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  console.log("[firebase] signUp: created user", !!cred);
  if (displayName) {
    try {
      await updateProfile(cred.user, { displayName });
      console.log("[firebase] signUp: updated profile displayName=", displayName);
    } catch (e) {
      console.warn("[firebase] Failed to update profile:", e);
    }
  }
  return cred;
}

export async function signOut() {
  console.log("[firebase] signOut: starting");
  await fbSignOut(auth);
  clearTokenAndNotify();
  console.log("[firebase] signOut: completed and token cleared");
}

export async function signInWithGooglePopup() {
  console.log("[firebase] signInWithGooglePopup: starting");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  console.log("[firebase] signInWithGooglePopup: popup result user=", !!result?.user);
  return result;
}

export async function signInWithMicrosoftPopup() {
  console.log("[firebase] signInWithMicrosoftPopup: starting");
  const provider = new OAuthProvider("microsoft.com");
  const result = await signInWithPopup(auth, provider);
  console.log("[firebase] signInWithMicrosoftPopup: popup result user=", !!result?.user);
  return result;
}
