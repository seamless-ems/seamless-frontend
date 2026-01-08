import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Events from "./pages/organizer/Events";
import EventDashboard from "./pages/organizer/EventDashboard";
import SpeakerModule from "./pages/organizer/SpeakerModule";
import SpeakerEmbed from "./pages/public/SpeakerEmbed";
import SpeakerEmbedSingle from "./pages/public/SpeakerEmbedSingle";
import PromoEmbedSingle from "./pages/public/PromoEmbedSingle";
import SpeakerPortal from "./pages/organizer/SpeakerPortal";
import SpeakerDashboard from "./pages/speaker/SpeakerDashboard";
import SpeakerProfile from "./pages/speaker/Profile";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import SpeakerIntakeForm from "./pages/public/SpeakerIntakeForm";
import Team from "./pages/organizer/Team";
import Subscription from "./pages/organizer/Subscription";
import CreateEvent from "./pages/organizer/CreateEvent";
import Settings from "./pages/organizer/Settings";
import EventSettings from "./pages/organizer/EventSettings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import PromoEmbed from "./pages/public/PromoEmbed";

// Helper component for root redirect
function RootRedirect() {
  let mode = "organizer";
  try {
    const stored = localStorage.getItem("dashboardMode");
    if (stored === "speaker") mode = "speaker";
  } catch {}
  return <Navigate to={`/${mode}`} replace />;
}

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />

            <Route
              path="/organizer"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <Index />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Duplicate organizer routes under /organizer namespace (optional) */}
            <Route
              path="/organizer/events"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <Events />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/events/new"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <CreateEvent />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <EventDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/speakers"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <SpeakerModule />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <EventSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Public embed route for speaker promo cards */}
            <Route path="/event/:id/speakers/embed" element={<SpeakerEmbed />} />
            <Route path="/event/:id/speakers/embed/promo" element={<PromoEmbed />} />
            {/* Single-speaker embed routes (public) */}
            <Route path="/event/:id/speakers/embed/speaker/:speakerId" element={<SpeakerEmbedSingle />} />
            <Route path="/event/:id/speakers/embed/promo/:speakerId" element={<PromoEmbedSingle />} />

            <Route
              path="/organizer/event/:id/speakers/:speakerId"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <SpeakerPortal />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/team"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <Team />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/subscription"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <Subscription />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/speaker-intake/:eventId"
              element={
                // <ProtectedRoute>
                <SpeakerIntakeForm />
                // </ProtectedRoute>
              }
            />

            {/* Speaker management routes (protected, /speaker namespace) */}
            <Route
              path="/speaker"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="speaker">
                    <SpeakerDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/speaker/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="speaker">
                    <SpeakerProfile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
