import { useMutation } from "@tanstack/react-query";
import { signIn, signUp } from "@/lib/firebase";
import type { LoginRequest, SignupRequest, TokenSchema } from "@/lib/api";

export function useLogin(options?: {
  onSuccess?: (data: TokenSchema) => void;
  onError?: (err: unknown) => void;
}) {
  return useMutation<TokenSchema, unknown, LoginRequest>({
    mutationFn: async (vars) => {
      console.log("[useAuth] useLogin.mutationFn: starting for", vars.email);
      try {
        await signIn(vars.email, vars.password);
        console.log("[useAuth] useLogin.mutationFn: signIn succeeded for", vars.email);
      } catch (e) {
        console.error("[useAuth] useLogin.mutationFn: signIn failed", e);
        throw e;
      }

      // Return a placeholder - the real token is set by the auth listener
      return { accessToken: "", tokenType: "firebase" } as TokenSchema;
    },
    onError: (err) => {
      console.error("[useAuth] useLogin.onError:", err);
      if (options?.onError) options.onError(err);
    },
    onSuccess: (data) => {
      console.log("[useAuth] useLogin.onSuccess:", data);
      if (options?.onSuccess) options.onSuccess(data);
    },
  });
}

export function useSignup(options?: {
  onSuccess?: (data: TokenSchema) => void;
  onError?: (err: unknown) => void;
}) {
  return useMutation<TokenSchema, unknown, SignupRequest>({
    mutationFn: async (vars) => {
      console.log("[useAuth] useSignup.mutationFn: starting for", vars.email, "name=", vars.name);
      try {
        await signUp(vars.email, vars.password, vars.name);
        console.log("[useAuth] useSignup.mutationFn: signUp succeeded for", vars.email);
      } catch (e) {
        console.error("[useAuth] useSignup.mutationFn: signUp failed", e);
        throw e;
      }

      // Return a placeholder - the real token is set by the auth listener
      return { accessToken: "", tokenType: "firebase" } as TokenSchema;
    },
    onError: (err) => {
      console.error("[useAuth] useSignup.onError:", err);
      if (options?.onError) options.onError(err);
    },
    onSuccess: (data) => {
      console.log("[useAuth] useSignup.onSuccess:", data);
      if (options?.onSuccess) options.onSuccess(data);
    },
  });
}
