import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Events from "./pages/organizer/Events";
import SpeakerModule from "./pages/organizer/SpeakerModule";
import PromoEmbedSingle from "./pages/public/PromoEmbedSingle";
import SpeakerPortal from "./pages/organizer/SpeakerPortal";
import SpeakerDashboard from "./pages/speaker/SpeakerDashboard";
import SpeakerProfile from "./pages/speaker/Profile";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import EventLayout from "./components/layout/EventLayout";
import SpeakerIntakeForm from "./pages/public/SpeakerIntakeForm";
import CreateEvent from "./pages/organizer/CreateEvent";
import Settings from "./pages/organizer/Settings";
import EventSettings from "./pages/organizer/EventSettings";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import PromoEmbed from "./pages/public/PromoEmbed";
import PromoCardBuilderPage from "./pages/organizer/PromoCardBuilderPage";
import WebsiteCardBuilderPage from "./pages/organizer/WebsiteCardBuilderPage";
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


function EventLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <EventLayout>{children}</EventLayout>;
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

            <Route
              path="/organizer/events"
              element={
                <ProtectedRoute>
                  <DashboardLayout mode="organizer">
                    {/* <Events /> */}
                    {/* Redirect to Index which shows EventDashboard */}
                    <Navigate to="/organizer" replace />
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

            {/* Event routes — flat, each wrapped in EventLayout */}
            <Route
              path="/organizer/event/:id/speakers"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/speakers/applications"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/speakers/forms"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/speakers/embed"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/speakers/content"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            {/* SpeakerPortal — fullscreen, own layout, no EventLayoutWrapper */}
            {[
              "/organizer/event/:id/speakers/:speakerId",
              "/organizer/event/:id/speakers/:speakerId/speaker-card",
              "/organizer/event/:id/speakers/:speakerId/social-card",
              "/organizer/event/:id/speakers/:speakerId/content",
            ].map(path => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <SpeakerPortal />
                  </ProtectedRoute>
                }
              />
            ))}

            <Route
              path="/organizer/event/:id/settings"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <EventSettings />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            {/* Card builders — rendered inside SpeakerModule so the tab bar stays visible */}
            <Route
              path="/organizer/event/:id/promo-card-builder"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizer/event/:id/website-card-builder"
              element={
                <ProtectedRoute>
                  <EventLayoutWrapper>
                    <SpeakerModule />
                  </EventLayoutWrapper>
                </ProtectedRoute>
              }
            />

            {/* Public embed routes */}
            <Route path="/event/:id/speakers/embed/promo" element={<PromoEmbed />} />
            <Route path="/event/:id/speakers/embed/promo/:speakerId" element={<PromoEmbedSingle />} />

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

            <Route path="/speaker-intake/:eventId" element={<SpeakerIntakeForm />} />
            <Route path="/call-for-speakers/:eventId" element={<SpeakerIntakeForm />} />

            {/* Speaker management routes */}
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
