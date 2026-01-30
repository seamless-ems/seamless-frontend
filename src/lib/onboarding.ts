const ONBOARDING_KEY = "onboardingCompleted";

export function setOnboardingCompleted(completed: boolean = true): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_KEY, completed ? "true" : "false");
    }
  } catch (e) {
    console.error("Failed to set onboarding status:", e);
  }
}

export function isOnboardingCompleted(): boolean {
  try {
    if (typeof window !== "undefined") {
      const value = localStorage.getItem(ONBOARDING_KEY);
      return value === "true";
    }
  } catch (e) {
    console.error("Failed to get onboarding status:", e);
  }
  return false;
}

export function clearOnboardingStatus(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ONBOARDING_KEY);
    }
  } catch (e) {
    console.error("Failed to clear onboarding status:", e);
  }
}
