import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkFirebaseEmail, sendFirebaseSignInLink } from "@/lib/api";
import { toast } from "sonner";
import { signInWithGooglePopup } from "@/lib/firebase";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
});

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

function LoginForm({ onEmailChange, initialEmail, onSent, showSubmitButton, isChecking }: { onEmailChange?: (email: string) => void; initialEmail?: string; onSent?: (email: string) => void; showSubmitButton?: boolean; isChecking?: boolean }) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail || "" },
  });

  const watchedEmail = form.watch("email");
  React.useEffect(() => {
    if (onEmailChange) onEmailChange(String(watchedEmail || ""));
  }, [watchedEmail, onEmailChange]);

  const handleSend = async () => {
    const e = String(form.getValues().email || "").trim();
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      toast.error('Enter a valid email to receive a sign-in link');
      return;
    }
    try {
      try { window.localStorage.setItem('emailForSignIn', e); } catch (err) {}
      const url = `${window.location.origin}/finish-signup`;
      await sendFirebaseSignInLink({ email: e, url });
      onSent?.(e);
    } catch (err: any) {
      toast.error(String(err?.message || err || 'Failed to send sign-in link'));
    }
  };

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); void handleSend(); }} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input {...form.register("email")} type="email" placeholder="you@example.com" className="h-12" />
        {isChecking && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Checking…</span>
          </div>
        )}
      </div>
      {showSubmitButton && (
        <Button type="submit" variant="outline" className="w-full h-12 border-[1.5px] font-medium">
          Continue with email
        </Button>
      )}
    </form>
  );
}

const Auth: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { isAuthenticated, isLoading } = useAuth();
  const [isSsoLoading, setIsSsoLoading] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

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
  }, []);

  const onEmailChange = React.useCallback((email: string) => {
    if (checkTimeoutRef.current) window.clearTimeout(checkTimeoutRef.current as number);
    setEmailCheck(null);
    // @ts-ignore
    checkTimeoutRef.current = window.setTimeout(() => doCheckEmail(email), 600);
  }, [doCheckEmail]);

  React.useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) window.clearTimeout(checkTimeoutRef.current as number);
    };
  }, []);

  React.useEffect(() => {
    const redirect = new URLSearchParams(location.search).get('redirect');
    if (redirect) {
      try { window.localStorage.setItem('seamless-post-login-redirect', redirect); } catch (e) {}
    }
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      let dest = '/organizer';
      try {
        const stored = window.localStorage.getItem('seamless-post-login-redirect');
        if (stored) { dest = stored; window.localStorage.removeItem('seamless-post-login-redirect'); }
        else if (!isOnboardingCompleted()) dest = '/onboarding';
      } catch (e) {
        if (!isOnboardingCompleted()) dest = '/onboarding';
      }
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);


  const cardShell = (children: React.ReactNode) => (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary-subtle)) 0%, hsl(var(--bg-app)) 100%)" }}
    >
      <div className="w-[90%] max-w-[480px] bg-card rounded-lg p-12 relative z-10" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-2 leading-none">
            <span className="text-[36px] font-semibold" style={{ letterSpacing: "-0.01em", color: "hsl(var(--primary))" }}>Seamless</span>
            <span className="text-[28px] font-normal" style={{ color: "hsl(var(--text-secondary))" }}>Events</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (sentTo) {
    return cardShell(
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <span className="font-medium text-foreground">{sentTo}</span>
        </p>
        <button
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 pt-1 block mx-auto"
          onClick={() => setSentTo(null)}
        >
          Use a different email
        </button>
      </div>
    );
  }

  const searchParams = new URLSearchParams(location.search);
  const speakerEmail = searchParams.get("speakerEmail") || undefined;

  return cardShell(
    <>
      <div className="space-y-4">
        <LoginForm
          onEmailChange={onEmailChange}
          initialEmail={speakerEmail}
          onSent={setSentTo}
          isChecking={checkingEmail}
          showSubmitButton={emailCheck !== null}
        />

        {emailCheck?.exists && emailCheck.providers?.includes("google.com") && (
          <div className="p-3 rounded border border-border bg-accent/5">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">This account uses Google</div>
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
        )}
      </div>

      {/* need help with logging in div */}
      <div className="mt-6 text-center">
        <span className="text-sm text-muted-foreground">Need help logging in?</span>
        <a href="https://seamlessevents.io/contact" target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-4 ml-1">Contact us</a>
      </div>

      <div className="flex items-center my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="px-4 text-sm text-muted-foreground">or continue with</span>
        <div className="flex-1 h-px bg-border" />
      </div>

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
    </>
  );
};

export default Auth;
