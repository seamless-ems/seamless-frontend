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
            // error toast handled by onError
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Email</label>
                <Input {...form.register("email")} type="email" placeholder="you@example.com" />
            </div>

            <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Password</label>
                <Input {...form.register("password")} type="password" placeholder="Enter password" />
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.status === "pending"}>
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
            // onError handles toast
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">First name</label>
                    <Input {...form.register("first_name")} type="text" placeholder="First name" />
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Last name</label>
                    <Input {...form.register("last_name")} type="text" placeholder="Last name" />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Email</label>
                <Input {...form.register("email")} type="email" placeholder="you@example.com" />
            </div>

            <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Password</label>
                <Input {...form.register("password")} type="password" placeholder="Enter password" />
            </div>

            <Button type="submit" className="w-full" disabled={signupMutation.status === "pending"}>
                Create account
            </Button>
        </form>
    );
}

const Auth: React.FC = () => {
    const location = useLocation();
    const mode = location.pathname === "/signup" ? "signup" : "login";
    const title = mode === "login" ? "Sign in to Seamless" : "Create your account";
    const navigate = useNavigate();
    const [flow, setFlow] = React.useState<"organizer" | "speaker" | "public">("organizer");

    const navigateAfterAuth = () => {
        if (flow === "organizer") {
            navigate("/organizer", { replace: true });
        } else if (flow === "speaker") {
            navigate("/speaker", { replace: true });
        } else {
            navigate("/", { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-soft">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">{title}</h1>
                </div>

                {/* Flow selector */}
                <div className="flex gap-2">
                    <Button
                        variant={flow === "organizer" ? "default" : "outline"}
                        onClick={() => setFlow("organizer")}
                        className="flex-1"
                    >
                        Organizer
                    </Button>
                    <Button
                        variant={flow === "speaker" ? "default" : "outline"}
                        onClick={() => setFlow("speaker")}
                        className="flex-1"
                    >
                        Speaker
                    </Button>
                    <Button
                        variant={flow === "public" ? "default" : "outline"}
                        onClick={() => setFlow("public")}
                        className="flex-1"
                    >
                        Public
                    </Button>
                </div>

                    <div key={mode} className="space-y-4">
                        {mode === "signup" ? (
                            <SignupForm onSuccess={() => navigateAfterAuth()} />
                        ) : (
                            <LoginForm onSuccess={() => navigateAfterAuth()} />
                        )}

                        <div className="text-sm text-center mt-2">
                            {mode === "login" ? (
                                <span>
                                    New here? <Link to="/signup" className="text-primary underline">Create account</Link>
                                </span>
                            ) : (
                                <span>
                                    Have an account? <Link to="/login" className="text-primary underline">Sign in</Link>
                                </span>
                            )}
                        </div>
                    </div>

                <div className="flex items-center gap-2 my-4">
                    <span className="flex-1 h-px bg-border" />
                    <span className="text-sm text-muted-foreground">or continue with</span>
                    <span className="flex-1 h-px bg-border" />
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                                try {
                                    const res = await signInWithGooglePopup();
                                    // Attempt to exchange the returned ID token for a backend token
                                    try {
                                        const idToken = await res.user.getIdToken();
                                        const backend = await exchangeFirebaseToken(idToken);
                                        if (backend && backend.access_token) {
                                            setToken(backend.access_token);
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
                                    // navigate to flow-specific destination
                                    navigateAfterAuth();
                                } catch (e) {
                                    console.error("google popup error", e);
                                    toast.error("Unable to sign in with Google");
                                }
                            }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.9 0 7.4 1.4 10.1 3.8l7.6-7.6C36.9 2.5 30.8 0 24 0 14.7 0 6.9 5 2.6 12.3l8.9 6.9C13.5 15 18 9.5 24 9.5z" />
                        </svg>
                        <span>Google</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                                try {
                                    const res = await signInWithMicrosoftPopup();
                                    try {
                                        const idToken = await res.user.getIdToken();
                                        const backend = await exchangeFirebaseToken(idToken);
                                        if (backend && backend.access_token) {
                                            setToken(backend.access_token);
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24">
                            <rect x="1" y="1" width="10" height="10" fill="#f65314" />
                            <rect x="13" y="1" width="10" height="10" fill="#7cbb00" />
                            <rect x="1" y="13" width="10" height="10" fill="#00a1f1" />
                            <rect x="13" y="13" width="10" height="10" fill="#ffbb00" />
                        </svg>
                        <span>Microsoft</span>
                    </Button>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => navigate("/", { replace: true })}>
                        Continue as guest
                    </Button>

                    <p className="text-sm text-muted-foreground">
                        By continuing you agree to the <a className="underline">terms</a> and <a className="underline">privacy policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
