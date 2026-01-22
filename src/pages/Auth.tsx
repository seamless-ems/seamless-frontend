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

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const signupSchema = z.object({
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    email: z.string().email(),
    password: z.string().min(6),
});

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
            console.log("Submitting login", data.email);
            const res = await loginMutation.mutateAsync({ email: data.email, password: data.password });
            console.log("login success", res);
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
        defaultValues: { first_name: "", last_name: "", email: "", password: "" },
    });

    const onSubmit = async (data: SignupValues) => {
        try {
            console.log("Submitting signup", data.email);
            const res = await signupMutation.mutateAsync({
                email: data.email,
                password: data.password,
                first_name: data.first_name,
                last_name: data.last_name,
            });
            console.log("signup success", res);
            onSuccess();
        } catch (err) {
            console.error("signup error", err);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">First name</label>
                    <Input {...form.register("first_name")} type="text" placeholder="First name" className="h-12" />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Last name</label>
                    <Input {...form.register("last_name")} type="text" placeholder="Last name" className="h-12" />
                </div>
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
        navigate("/organizer", { replace: true });
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.9 0 7.4 1.4 10.1 3.8l7.6-7.6C36.9 2.5 30.8 0 24 0 14.7 0 6.9 5 2.6 12.3l8.9 6.9C13.5 15 18 9.5 24 9.5z" />
                        </svg>
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

                {/* Help text */}
                <div className="text-center mt-4 text-sm text-muted-foreground">
                    Need help? Contact us here
                </div>
            </div>
        </div>
    );
};

export default Auth;
