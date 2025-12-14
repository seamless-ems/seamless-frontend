import { useMutation } from "@tanstack/react-query";
import { login, signup, type LoginRequest, type SignupRequest, type TokenSchema } from "@/lib/api";
import { setToken } from "@/lib/auth";

export function useLogin(options?: {
  onSuccess?: (data: TokenSchema) => void;
  onError?: (err: unknown) => void;
}) {
  return useMutation<TokenSchema, unknown, LoginRequest>({
    mutationFn: (vars) => login(vars),
    onSuccess: (data) => {
      try {
        setToken(data.access_token);
      } catch (e) {}
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useSignup(options?: {
  onSuccess?: (data: TokenSchema) => void;
  onError?: (err: unknown) => void;
}) {
  return useMutation<TokenSchema, unknown, SignupRequest>({
    mutationFn: (vars) => signup(vars),
    onSuccess: (data) => {
      try {
        setToken(data.access_token);
      } catch (e) {}
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
