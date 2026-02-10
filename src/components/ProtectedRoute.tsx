import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "@/lib/auth";
import { isOnboardingCompleted } from "@/lib/onboarding";

type Props = {
  children: React.ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const location = useLocation();
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
    // Poll localStorage for token for up to 2000ms (give auth flows more time)
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
    }, 2000);

    // Listen for explicit token-change events dispatched by `setToken/clearToken`.
    const handleTokenChange = () => {
      try {
        const tok = getToken();
        if (tok && mounted) {
          setTokenState(tok);
          setChecking(false);
        }
        if (!tok && mounted) {
          setTokenState(null);
          setChecking(false);
        }
      } catch (e) {
        // ignore
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("seamless:token-changed", handleTokenChange);
    }

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
      if (typeof window !== "undefined") {
        window.removeEventListener("seamless:token-changed", handleTokenChange);
      }
    };
  }, []);

  if (checking) {
    // Render nothing while we are determining auth state to avoid flashing login
    return null;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If user hasn't completed onboarding and is not already on the onboarding page, redirect
  const isOnOnboardingPage = location.pathname === "/onboarding";
  if (!isOnOnboardingPage && !isOnboardingCompleted()) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
