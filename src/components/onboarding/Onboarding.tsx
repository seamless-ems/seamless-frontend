import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setOnboardingCompleted } from "@/lib/onboarding";
import { createOrganization, createTeam, getTeam } from "@/lib/api";
import { toast } from "sonner";

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Skip onboarding if user already has a team (e.g. localStorage was cleared)
  React.useEffect(() => {
    getTeam().then((teams) => {
      if (teams && teams.length > 0) {
        setOnboardingCompleted(true);
        navigate("/organizer", { replace: true });
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setIsLoading(true);
    try {
      const orgRes = await createOrganization({ name: teamName.trim() });
      await createTeam({ name: teamName.trim(), organizationId: orgRes.id });
      setOnboardingCompleted(true);
      navigate("/organizer/events/new", { replace: true });
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{
      background: 'linear-gradient(135deg, hsl(var(--primary-subtle)) 0%, hsl(var(--bg-app)) 100%)'
    }}>
      {/* Decorative flow - top */}
      <div className="fixed top-0 left-0 w-full h-[60px] pointer-events-none z-[1]">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0 35 Q150 15, 300 28 Q450 42, 600 25 Q750 12, 900 35 Q1050 48, 1200 30" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.25" />
          <path d="M0 20 Q150 38, 300 22 Q450 8, 600 25 Q750 40, 900 18 Q1050 5, 1200 25" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.15" />
        </svg>
      </div>

      {/* Decorative flow - bottom */}
      <div className="fixed bottom-0 left-0 w-full h-[60px] pointer-events-none z-[1] rotate-180">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0 35 Q150 15, 300 28 Q450 42, 600 25 Q750 12, 900 35 Q1050 48, 1200 30" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.25" />
          <path d="M0 20 Q150 38, 300 22 Q450 8, 600 25 Q750 40, 900 18 Q1050 5, 1200 25" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.15" />
        </svg>
      </div>

      <div className="w-[90%] max-w-[420px] bg-card rounded-lg p-12 relative z-10" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-2 leading-none">
            <span className="text-[36px] font-semibold" style={{ letterSpacing: '-0.01em', color: 'hsl(var(--primary))' }}>
              Seamless
            </span>
            <span className="text-[28px] font-normal" style={{ color: 'hsl(var(--text-secondary))' }}>
              Events
            </span>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Welcome — let's get you set up</h1>
          <p className="text-sm text-muted-foreground">What's your team called?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="e.g. Marketing Squad"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            className="w-full h-12 border-[1.5px] font-medium"
            disabled={!teamName.trim() || isLoading}
          >
            {isLoading ? "Setting up…" : "Get started"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
