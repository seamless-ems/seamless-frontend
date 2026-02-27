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
  

  if (!user) {
    
    clearTokenAndNotify();
    return false;
  }

  let idToken: string | null = null;
  try {
    idToken = await user.getIdToken();
    
  } catch (e) {
    
  }

  if (!idToken) {
    clearTokenAndNotify();
    return false;
  }

  try {
    
    const backendToken = await exchangeFirebaseToken(idToken);
    
    // support various backend shapes: access_token, accessToken, token
    const tokenFromBackend = backendToken && ((backendToken as any).access_token || (backendToken as any).accessToken || (backendToken as any).token || (backendToken as any).accessToken);
    if (tokenFromBackend) {
      try {
        
      } catch (e) {
        // ignore logging length errors
      }
      setTokenAndNotify(tokenFromBackend as string);
      return true;
    }
  } catch (e) {
  }

  // Do not persist Firebase idToken as `auth_token`. Clear any stale token instead.
  clearTokenAndNotify();
  return false;
}

// Listen for token changes and mirror ID token into localStorage
onIdTokenChanged(auth, (user) => {
  
  if (!user) {
    
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
          
          setUserAndNotify(profile);
        } else {
          
          clearUserAndNotify();
        }
      } catch (e) {
      }
    })
    .catch(() => {});
});

export async function signIn(email: string, password: string) {
  
  const cred = await signInWithEmailAndPassword(auth, email, password);
  
  return cred;
}

export async function signUp(email: string, password: string, displayName?: string) {
  
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  
  if (displayName) {
    try {
      await updateProfile(cred.user, { displayName });
      
    } catch (e) {
    }
  }
  return cred;
}

export async function signOut() {
  await fbSignOut(auth);
  clearTokenAndNotify();
  
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
