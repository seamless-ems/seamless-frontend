import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useLogin, useSignup } from "@/hooks/useAuth";
import { signInWithGooglePopup, signInWithMicrosoftPopup } from "@/lib/firebase";
import { exchangeFirebaseToken } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { isOnboardingCompleted } from "@/lib/onboarding";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const signupSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email(),
    password: z.string().min(6),
});

// Google icon SVG
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const navigate = useNavigate();
    const loginMutation = useLogin({
        onSuccess: () => {
            toast.success("Signed in");
            onSuccess();
        },
        onError: (err) => {
            toast.error(String(err));
        },
    });

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (data: LoginValues) => {
        try {
            const res = await loginMutation.mutateAsync({ email: data.email, password: data.password });
            onSuccess();
        } catch (err) {
            console.error("login error", err);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input {...form.register("email")} type="email" placeholder="you@example.com" className="h-12" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input {...form.register("password")} type="password" placeholder="Enter password" className="h-12" />
            </div>

            <div className="text-right">
                <a href="#" className="text-sm text-primary hover:underline">
                    Forgot password?
                </a>
            </div>

            <Button type="submit" variant="outline" className="w-full h-12 border-[1.5px] font-medium" disabled={loginMutation.status === "pending"}>
                Sign in
            </Button>
        </form>
    );
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
    const signupMutation = useSignup({
        onSuccess: () => {
            toast.success("Account created");
            onSuccess();
        },
        onError: (err) => {
            toast.error(String(err));
        },
    });

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { name: "", email: "", password: "" },
    });

    const onSubmit = async (data: SignupValues) => {
        try {
            const res = await signupMutation.mutateAsync({
                email: data.email,
                password: data.password,
                name: data.name,
            });
            onSuccess();
        } catch (err) {
            console.error("signup error", err);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input {...form.register("name")} type="text" placeholder="Name" className="h-12" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input {...form.register("email")} type="email" placeholder="you@example.com" className="h-12" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input {...form.register("password")} type="password" placeholder="Enter password" className="h-12" />
            </div>

            <Button type="submit" variant="outline" className="w-full h-12 border-[1.5px] font-medium" disabled={signupMutation.status === "pending"}>
                Create account
            </Button>
        </form>
    );
}

const Auth: React.FC = () => {
    const location = useLocation();
    const mode = location.pathname === "/signup" ? "signup" : "login";
    const navigate = useNavigate();

    const navigateAfterAuth = () => {
        // Check if user needs onboarding (only for new signups)
        if (mode === "signup" || !isOnboardingCompleted()) {
            navigate("/onboarding", { replace: true });
        } else {
            navigate("/organizer", { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary-subtle)) 0%, hsl(var(--bg-app)) 100%)'
        }}>
            {/* Decorative flow - top */}
            <div className="fixed top-0 left-0 w-full h-[60px] pointer-events-none z-[1]">
                <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full">
                    <path
                        d="M0 35 Q150 15, 300 28 Q450 42, 600 25 Q750 12, 900 35 Q1050 48, 1200 30"
                        stroke="hsl(var(--primary))"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.25"
                    />
                    <path
                        d="M0 20 Q150 38, 300 22 Q450 8, 600 25 Q750 40, 900 18 Q1050 5, 1200 25"
                        stroke="hsl(var(--primary))"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.15"
                    />
                </svg>
            </div>

            {/* Decorative flow - bottom */}
            <div className="fixed bottom-0 left-0 w-full h-[60px] pointer-events-none z-[1] rotate-180">
                <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full">
                    <path
                        d="M0 35 Q150 15, 300 28 Q450 42, 600 25 Q750 12, 900 35 Q1050 48, 1200 30"
                        stroke="hsl(var(--primary))"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.25"
                    />
                    <path
                        d="M0 20 Q150 38, 300 22 Q450 8, 600 25 Q750 40, 900 18 Q1050 5, 1200 25"
                        stroke="hsl(var(--primary))"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.15"
                    />
                </svg>
            </div>

            <div className="w-[90%] max-w-[420px] bg-card rounded-lg p-12 relative z-10" style={{
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                {/* Logo */}
                <div className="mb-8 text-center">
                    <div className="flex items-baseline justify-center gap-2 leading-none">
                        <span className="text-[36px] font-semibold" style={{
                            letterSpacing: '-0.01em',
                            color: 'hsl(var(--primary))'
                        }}>
                            Seamless
                        </span>
                        <span className="text-[28px] font-normal" style={{
                            color: 'hsl(var(--text-secondary))'
                        }}>
                            Events
                        </span>
                    </div>
                </div>


                {/* Form */}
                <div key={mode} className="space-y-4">
                    {mode === "signup" ? (
                        <SignupForm onSuccess={() => navigateAfterAuth()} />
                    ) : (
                        <LoginForm onSuccess={() => navigateAfterAuth()} />
                    )}
                </div>

                {/* Divider */}
                <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="px-4 text-sm text-muted-foreground">or continue with</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                {/* SSO Buttons */}
                <div className="flex flex-col gap-4">
                    <Button
                        variant="outline"
                        className="w-full h-12 border-[1.5px]"
                        type="button"
                        onClick={async () => {
                            try {
                                const res = await signInWithGooglePopup();
                                try {
                                    const idToken = await res.user.getIdToken();
                                    const backend = await exchangeFirebaseToken(idToken);
                                    if (backend && backend.accessToken) {
                                        setToken(backend.accessToken);
                                    } else {
                                        setToken(idToken);
                                    }
                                } catch (err) {
                                    console.warn("Google popup token exchange failed, falling back to ID token:", err);
                                    try {
                                        const idToken = await res.user.getIdToken();
                                        setToken(idToken);
                                    } catch (e) {
                                        // ignore
                                    }
                                }
                                toast.success("Signed in with Google");
                                navigateAfterAuth();
                            } catch (e) {
                                console.error("google popup error", e);
                                toast.error("Unable to sign in with Google");
                            }
                        }}
                    >
                        <GoogleIcon />
                        <span>Google</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full h-12 border-[1.5px]"
                        type="button"
                        onClick={async () => {
                            try {
                                const res = await signInWithMicrosoftPopup();
                                try {
                                    const idToken = await res.user.getIdToken();
                                    const backend = await exchangeFirebaseToken(idToken);
                                    if (backend && backend.accessToken) {
                                        setToken(backend.accessToken);
                                    } else {
                                        setToken(idToken);
                                    }
                                } catch (err) {
                                    console.warn("Microsoft popup token exchange failed, falling back to ID token:", err);
                                    try {
                                        const idToken = await res.user.getIdToken();
                                        setToken(idToken);
                                    } catch (e) {
                                        // ignore
                                    }
                                }
                                toast.success("Signed in with Microsoft");
                                navigateAfterAuth();
                            } catch (e) {
                                console.error("microsoft popup error", e);
                                toast.error("Unable to sign in with Microsoft");
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <rect x="1" y="1" width="10" height="10" fill="#f65314" />
                            <rect x="13" y="1" width="10" height="10" fill="#7cbb00" />
                            <rect x="1" y="13" width="10" height="10" fill="#00a1f1" />
                            <rect x="13" y="13" width="10" height="10" fill="#ffbb00" />
                        </svg>
                        <span>Microsoft</span>
                    </Button>
                </div>

                {/* Toggle between login/signup */}
                <div className="text-center mt-6 text-sm text-muted-foreground">
                    {mode === "login" ? (
                        <span>
                            New here? <Link to="/signup" className="text-primary hover:underline">Create account</Link>
                        </span>
                    ) : (
                        <span>
                            Have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
