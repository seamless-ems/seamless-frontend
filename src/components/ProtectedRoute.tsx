import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "@/lib/auth";

type Props = {
  children: React.ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const [checking, setChecking] = React.useState(true);
  const [token, setTokenState] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Read token immediately; if not present, give a short grace period for
    // async login flows (onIdTokenChanged or mutation onSuccess) to write the
    // token into localStorage before redirecting. This avoids a redirect loop
    // where the app navigates to a protected route before the token is stored.
    const t = getToken();
    if (t) {
      setTokenState(t);
      setChecking(false);
      return;
    }

    let mounted = true;
    // Poll localStorage for token for up to 1000ms
    const interval = setInterval(() => {
      const tok = getToken();
      if (tok && mounted) {
        setTokenState(tok);
        clearInterval(interval);
        setChecking(false);
      }
    }, 100);

    const timeout = setTimeout(() => {
      mounted = false;
      clearInterval(interval);
      setChecking(false);
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (checking) {
    // Render nothing while we are determining auth state to avoid flashing login
    return null;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
