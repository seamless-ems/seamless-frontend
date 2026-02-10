import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
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
import CreateEvent from "./pages/organizer/CreateEvent";
import Settings from "./pages/organizer/Settings";
import EventSettings from "./pages/organizer/EventSettings";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import PromoEmbed from "./pages/public/PromoEmbed";
import CardBuilderPage from "./pages/organizer/CardBuilderPage";
import Onboarding from "./components/onboarding/Onboarding";

// Helper component for root redirect
function RootRedirect() {
  let mode = "organizer";
  try {
    const stored = localStorage.getItem("dashboardMode");
    if (stored === "speaker") mode = "speaker";
  } catch {}
  return <Navigate to={`/${mode}`} replace />;
}

// Wrapper to pass eventId from route params to DashboardLayout
function EventLayoutWrapper({ children, mode }: { children: React.ReactNode; mode: "organizer" | "speaker" }) {
  const { id } = useParams();
  return (
    <DashboardLayout mode={mode} eventId={id}>
      {children}
    </DashboardLayout>
  );
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
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />

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
                  <EventLayoutWrapper mode="organizer">
                    <EventDashboard />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/speakers"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper mode="organizer">
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/settings"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper mode="organizer">
                    <EventSettings />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/card-builder"
              element={
                <ProtectedRoute>
                  <CardBuilderPage />
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
                  <EventLayoutWrapper mode="organizer">
                    <SpeakerPortal />
                  </EventLayoutWrapper>
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
              path="/support"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    <Support />
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

            <Route
              path="/call-for-speakers/:eventId"
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
