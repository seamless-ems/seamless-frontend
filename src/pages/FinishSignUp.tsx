import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isOnboardingCompleted } from '@/lib/onboarding';

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary-subtle)) 0%, hsl(var(--bg-app)) 100%)' }}
    >
      <div className="w-[90%] max-w-[480px] bg-card rounded-lg p-12 relative z-10" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-2 leading-none">
            <span className="text-[36px] font-semibold" style={{ letterSpacing: '-0.01em', color: 'hsl(var(--primary))' }}>Seamless</span>
            <span className="text-[28px] font-normal" style={{ color: 'hsl(var(--text-secondary))' }}>Events</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function FinishSignUp() {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<'loading' | 'needs-email' | 'error'>('loading');
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const hrefRef = React.useRef(typeof window !== 'undefined' ? window.location.href : '');

  React.useEffect(() => {
    if (!isSignInWithEmailLink(auth, hrefRef.current)) {
      setStatus('error');
      return;
    }
    let stored = '';
    try { stored = window.localStorage.getItem('emailForSignIn') || ''; } catch (e) {}

    if (stored) {
      completeSignIn(stored);
    } else {
      setStatus('needs-email');
    }
  }, []);

  const completeSignIn = async (emailToUse: string) => {
    try {
      await signInWithEmailLink(auth, emailToUse, hrefRef.current);
      try { window.localStorage.removeItem('emailForSignIn'); } catch (e) {}
      navigate(isOnboardingCompleted() ? '/organizer' : '/onboarding', { replace: true });
    } catch (err: any) {
      toast.error(String(err?.message || err || 'Failed to complete sign-in'));
      setStatus('needs-email');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    setIsSubmitting(true);
    await completeSignIn(clean);
    setIsSubmitting(false);
  };

  if (status === 'loading') {
    return (
      <CardShell>
        <div className="text-center space-y-2">
          <p className="font-semibold">Signing you in…</p>
          <p className="text-sm text-muted-foreground">This will only take a moment.</p>
        </div>
      </CardShell>
    );
  }

  if (status === 'needs-email') {
    return (
      <CardShell>
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold">Confirm your email</h2>
            <p className="text-sm text-muted-foreground">Enter the email address you used to request the sign-in link.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="you@example.com"
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <Button type="submit" variant="outline" className="w-full h-12 border-[1.5px] font-medium" disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? 'Signing in…' : 'Continue'}
            </Button>
          </form>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <div className="text-center space-y-2">
        <p className="font-semibold">Link not recognised</p>
        <p className="text-sm text-muted-foreground">Open the link from the email you received, or request a new one from the login page.</p>
      </div>
    </CardShell>
  );
}
