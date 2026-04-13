import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { toast } from 'sonner';

export default function FinishSignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function run() {
      try {
        if (typeof window === 'undefined') return;
        const href = window.location.href;
        if (!isSignInWithEmailLink(auth, href)) {
          setLoading(false);
          return;
        }

        let email = '';
        try {
          email = window.localStorage.getItem('emailForSignIn') || '';
        } catch (e) {
          email = '';
        }

        if (!email) {
          // fallback: prompt user
          // eslint-disable-next-line no-alert
          email = window.prompt('Please provide the email you used to sign in') || '';
        }

        if (!email) {
          toast.error('Email is required to complete sign-in');
          setLoading(false);
          return;
        }

        await signInWithEmailLink(auth, email, href);
        try { window.localStorage.removeItem('emailForSignIn'); } catch (e) {}
        toast.success('Signed in with magic link');
        // let auth listener / token exchange take over; navigate to organizer
        navigate('/organizer', { replace: true });
      } catch (err: any) {
        toast.error(String(err?.message || err || 'Failed to complete sign-in'));
        setLoading(false);
      }
    }
    run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 bg-card rounded shadow">
        {loading ? (
          <div className="text-center">
            <div className="mb-2 font-semibold">Verifying your magic link…</div>
            <div className="text-sm text-muted-foreground">This may take a few moments.</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-2 font-semibold">No sign-in link detected</div>
            <div className="text-sm text-muted-foreground">Open the link from the email you received, or request a new magic link from the login page.</div>
          </div>
        )}
      </div>
    </div>
  );
}
