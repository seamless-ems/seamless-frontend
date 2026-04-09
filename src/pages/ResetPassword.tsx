import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { resetFirebasePassword } from "@/lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const defaultEmail = params.get("email") ?? "";
  const [email, setEmail] = React.useState<string>(defaultEmail);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = String(email || "").trim();
    if (!clean) {
      toast.error("Please enter your email");
      return;
    }
    setIsSubmitting(true);
    try {
      await resetFirebasePassword({ email: clean });
      toast.success("Password reset email sent");
      navigate("/login");
    } catch (err: any) {
      toast.error(String(err?.message || err || "Failed to send reset email"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-[90%] max-w-md bg-card rounded-lg p-8">
        <h2 className="text-lg font-semibold mb-4">Reset your password</h2>
        <p className="text-sm text-muted-foreground mb-4">Enter your email and we'll send a password reset link.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="h-12" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" className="h-12" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send reset email"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
