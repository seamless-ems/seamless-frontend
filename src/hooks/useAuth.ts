import { useMutation } from "@tanstack/react-query";
import { signIn, signUp } from "@/lib/firebase";
import type { LoginRequest, SignupRequest, TokenSchema } from "@/lib/api";

export function useLogin(options?: {
  onSuccess?: (data: TokenSchema) => void;
  onError?: (err: unknown) => void;
}) {
  return useMutation<TokenSchema, unknown, LoginRequest>({
    mutationFn: async (vars) => {
      
      try {
        await signIn(vars.email, vars.password);
        
      } catch (e) {
        
        throw e;
      }

      // Return a placeholder - the real token is set by the auth listener
      return { accessToken: "", tokenType: "firebase" } as TokenSchema;
    },
    onError: (err) => {
      
      if (options?.onError) options.onError(err);
    },
    onSuccess: (data) => {
      
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
      
      try {
        await signUp(vars.email, vars.password, vars.name);
        
      } catch (e) {
        
        throw e;
      }

      // Return a placeholder - the real token is set by the auth listener
      return { accessToken: "", tokenType: "firebase" } as TokenSchema;
    },
    onError: (err) => {
      
      if (options?.onError) options.onError(err);
    },
    onSuccess: (data) => {
      
      if (options?.onSuccess) options.onSuccess(data);
    },
  });
}
