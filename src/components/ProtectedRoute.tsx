import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingCompleted } from "@/lib/onboarding";

type Props = {
  children: React.ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Render nothing while we are determining auth state to avoid flashing login
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user hasn't completed onboarding and is not already on the onboarding page, redirect
  const isOnOnboardingPage = location.pathname === "/onboarding";
  if (!isOnOnboardingPage && !isOnboardingCompleted()) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
