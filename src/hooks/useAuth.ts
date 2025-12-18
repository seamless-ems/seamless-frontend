import { useMutation } from "@tanstack/react-query";
import { signIn, signUp } from "@/lib/firebase";
import { setToken } from "@/lib/auth";
import { exchangeFirebaseToken } from "@/lib/api";
import type { LoginRequest, SignupRequest, TokenSchema } from "@/lib/api";

export function useLogin(options?: {
  onSuccess?: (data: TokenSchema) => void;
  onError?: (err: unknown) => void;
}) {
  return useMutation<TokenSchema, unknown, LoginRequest>({
    mutationFn: async (vars) => {
      // Use Firebase signIn. After signing in, exchange the Firebase ID token
      // for the backend token synchronously so callers can navigate safely.
      const cred = await signIn(vars.email, vars.password);
      const idToken = await cred.user.getIdToken();

      try {
        const backendToken = await exchangeFirebaseToken(idToken);
        if (backendToken && backendToken.access_token) return backendToken as TokenSchema;
      } catch (e) {
        // If exchange fails, fall back to returning the raw Firebase ID token
        // and let the onIdTokenChanged listener attempt exchange in the background.
        // eslint-disable-next-line no-console
        console.warn("exchangeFirebaseToken failed during login mutation, falling back to idToken:", e);
      }

      return { access_token: idToken, token_type: "firebase" } as TokenSchema;
    },
    onSuccess: (data) => {
      try {
        // Ensure the token returned by the mutation is stored locally before any
        // caller navigation happens. This prevents a race where the app navigates
        // to a protected route before localStorage contains the token and then
        // immediately gets redirected back to /login.
        if (data && data.access_token) {
          setToken(data.access_token);
        }
      } catch (e) {
        // ignore setToken errors
      }

      if (options?.onSuccess) {
        options.onSuccess(data);
      } else {
        // No onSuccess handler provided by caller  navigate to dashboard/root
        if (typeof window !== "undefined" && window.location) {
          try {
            window.location.replace("/");
          } catch (e) {
            // ignore navigation errors in non-browser environments
          }
        }
      }
    },
    onError: options?.onError,
  });
}

export function useSignup(options?: {
  onSuccess?: (data: TokenSchema) => void;
  onError?: (err: unknown) => void;
}) {
  return useMutation<TokenSchema, unknown, SignupRequest>({
    mutationFn: async (vars) => {
      const cred = await signUp(vars.email, vars.password);
      const idToken = await cred.user.getIdToken();

      try {
        const backendToken = await exchangeFirebaseToken(idToken);
        if (backendToken && backendToken.access_token) return backendToken as TokenSchema;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("exchangeFirebaseToken failed during signup mutation, falling back to idToken:", e);
      }

      return { access_token: idToken, token_type: "firebase" } as TokenSchema;
    },
    onSuccess: (data) => {
      try {
        if (data && data.access_token) {
          setToken(data.access_token);
        }
      } catch (e) {
        // ignore
      }

      if (options?.onSuccess) {
        options.onSuccess(data);
      } else {
        if (typeof window !== "undefined" && window.location) {
          try {
            window.location.replace("/");
          } catch (e) {
            // ignore navigation errors
          }
        }
      }
    },
    onError: options?.onError,
  });
}
