import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkFirebaseEmail, sendFirebaseSignInLink } from "@/lib/api";
import { toast } from "sonner";
import { signInWithGooglePopup } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
  email: z.string().email(),
});

// Signup uses same magic-link flow as login; no separate schema required

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

type LoginValues = z.infer<typeof loginSchema>;
// SignupValues removed; email-only flow uses LoginValues

function LoginForm({ onSuccess, onEmailChange, initialEmail }: { onSuccess: () => void; onEmailChange?: (email: string) => void; initialEmail?: string }) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail || "" },
  });

  const watchedEmail = form.watch("email");
  React.useEffect(() => {
    if (onEmailChange) onEmailChange(String(watchedEmail || ""));
  }, [watchedEmail, onEmailChange]);

  const handleSend = async (email?: string) => {
    const e = email || String(form.getValues().email || "").trim();
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      toast.error('Enter a valid email to receive a sign-in link');
      return;
    }
    try {
      try { window.localStorage.setItem('emailForSignIn', e); } catch (err) {}
      const url = `${window.location.origin}/finish-signup`;
      await sendFirebaseSignInLink({ email: e, url });
      toast.success('Magic link sent — check your email');
    } catch (err: any) {
      toast.error(String(err?.message || err || 'Failed to send magic link'));
    }
  };

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); void handleSend(); }} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input {...form.register("email")} type="email" placeholder="you@example.com" className="h-12" />
      </div>

      <Button type="submit" variant="outline" className="w-full h-12 border-[1.5px] font-medium">
        Send magic link
      </Button>
    </form>
  );
}

// SignupForm removed; signup uses same email-only magic link flow as login

const Auth: React.FC = () => {
  const location = useLocation();
  // Single email-only flow: always show login (magic link)
  const mode = "login";
  const navigate = useNavigate();

  const { isAuthenticated, isLoading } = useAuth();
  const [isSsoLoading, setIsSsoLoading] = React.useState(false);

  const [emailCheck, setEmailCheck] = React.useState<{ exists: boolean; providers: string[] } | null>(null);
  const [checkingEmail, setCheckingEmail] = React.useState(false);
  const checkTimeoutRef = React.useRef<number | null>(null);
  const lastCheckedEmailRef = React.useRef<string>("");

  const doCheckEmail = React.useCallback(async (email: string) => {
    const clean = String(email || "").trim();
    if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      setEmailCheck(null);
      return;
    }
    lastCheckedEmailRef.current = clean;
    setCheckingEmail(true);
    try {
      const res = await checkFirebaseEmail({ email: clean });
      if (lastCheckedEmailRef.current !== clean) return;
      setEmailCheck(res ?? null);
    } catch (e) {
      setEmailCheck(null);
    } finally {
      setCheckingEmail(false);
    }
  }, [setEmailCheck, setCheckingEmail]);

  const onEmailChange = React.useCallback((email: string) => {
    if (checkTimeoutRef.current) window.clearTimeout(checkTimeoutRef.current as number);
    // debounce 600ms
    // @ts-ignore
    checkTimeoutRef.current = window.setTimeout(() => doCheckEmail(email), 600);
  }, [doCheckEmail]);

  // cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) window.clearTimeout(checkTimeoutRef.current as number);
    };
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      if (mode === "signup" || !isOnboardingCompleted()) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/organizer", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, mode, navigate]);

  // Handle Firebase email link (magic link) sign-in flow
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn') || '';
        if (!email) {
          // Fallback: ask user to provide the email they used to sign in
          // This mirrors Firebase's recommended approach for clients that cannot
          // persist the email in localStorage.
          // eslint-disable-next-line no-alert
          email = window.prompt('Please provide your email for confirmation') || '';
        }
        if (!email) {
          toast.error('Email required to complete sign-in with magic link');
          return;
        }
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            try { window.localStorage.removeItem('emailForSignIn'); } catch (e) {}
            toast.success('Signed in with magic link');
            // Auth state listener will handle backend token exchange and redirect
          })
          .catch((err) => {
            toast.error(String(err?.message || err || 'Failed to sign in with magic link'));
          });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary-subtle)) 0%, hsl(var(--bg-app)) 100%)",
      }}
    >
      {/* Decorative flow placeholders */}
      <div className="fixed top-0 left-0 w-full h-[60px] pointer-events-none z-[1]"> </div>
      <div className="fixed bottom-0 left-0 w-full h-[60px] pointer-events-none z-[1] rotate-180"> </div>

      <div className="w-[90%] max-w-[420px] bg-card rounded-lg p-12 relative z-10" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-2 leading-none">
            <span className="text-[36px] font-semibold" style={{ letterSpacing: "-0.01em", color: "hsl(var(--primary))" }}>Seamless</span>
            <span className="text-[28px] font-normal" style={{ color: "hsl(var(--text-secondary))" }}>Events</span>
          </div>
        </div>

        <div className="space-y-4">
          {(() => {
            const searchParams = new URLSearchParams(location.search);
            const speakerEmail = searchParams.get("speakerEmail") || undefined;
            return <LoginForm onSuccess={() => {}} onEmailChange={onEmailChange} initialEmail={speakerEmail} />;
          })()}

          {emailCheck && emailCheck.exists === false && (
            <div className="mt-3 p-3 rounded border border-border bg-secondary/30">
              <div className="font-medium">Welcome to Seamless</div>
              <div className="text-sm text-muted-foreground">We didn't find an account for this email — click "Send magic link" to create one instantly.</div>
            </div>
          )}

          {emailCheck?.exists && emailCheck.providers?.includes("google.com") && (
            <div className="mt-3 p-3 rounded border border-border bg-primary/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">This email is registered with Google</div>
                  <div className="text-sm text-muted-foreground">Use Google to sign in for a quicker login.</div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setIsSsoLoading(true);
                      try {
                        await signInWithGooglePopup();
                      } catch (e) {
                        toast.error("Unable to sign in with Google");
                      } finally {
                        setIsSsoLoading(false);
                      }
                    }}
                  >
                    Sign in with Google
                  </Button>
                </div>
              </div>
            </div>
          )}
          {emailCheck?.exists && Array.isArray(emailCheck.providers) && emailCheck.providers.length === 0 && (
            <div className="mt-3 p-3 rounded border border-border bg-warning/5">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="font-medium">Account exists</div>
                  <div className="text-sm text-muted-foreground">This email already has an account — send a magic link to sign in.</div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const email = String(lastCheckedEmailRef.current || "").trim();
                      if (!email) return;
                      try {
                        try { window.localStorage.setItem('emailForSignIn', email); } catch (e) {}
                        const url = `${window.location.origin}/finish-signup`;
                        await sendFirebaseSignInLink({ email, url });
                        toast.success('Magic link sent — check your email');
                      } catch (err: any) {
                        toast.error(String(err?.message || err || 'Failed to send magic link'));
                      }
                    }}
                  >
                    Send magic link
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {! (emailCheck?.exists === false) && (
          <div className="text-center mt-6 mb-6 text-sm text-muted-foreground">
            Enter your email and we'll send a magic link to sign in or create your account.
          </div>
        )}

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="px-4 text-sm text-muted-foreground">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="w-full h-12 border-[1.5px]"
            type="button"
            disabled={isSsoLoading}
            onClick={async () => {
              if (isSsoLoading) return;
              setIsSsoLoading(true);
              try {
                await signInWithGooglePopup();
              } catch (e) {
                toast.error("Unable to sign in with Google");
              } finally {
                setIsSsoLoading(false);
              }
            }}
          >
            <GoogleIcon />
            <span>{isSsoLoading ? "Connecting..." : "Google"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
