import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDashboard from "./pages/EventDashboard";
import SpeakerModule from "./pages/SpeakerModule";
import SpeakerPortal from "./pages/SpeakerPortal";
import SpeakerIntakeForm from "./pages/SpeakerIntakeForm";
import Team from "./pages/Team";
import Subscription from "./pages/Subscription";
import CreateEvent from "./pages/CreateEvent";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Token processing is handled via Firebase onIdTokenChanged listener

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />

            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />

            <Route
              path="/events/new"
              element={
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/event/:id"
              element={
                <ProtectedRoute>
                  <EventDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/event/:id/speakers"
              element={
                <ProtectedRoute>
                  <SpeakerModule />
                </ProtectedRoute>
              }
            />

            <Route
              path="/event/:id/speakers/:speakerId"
              element={
                <ProtectedRoute>
                  <SpeakerPortal />
                </ProtectedRoute>
              }
            />

            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              }
            />

            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/speaker-intake/:eventId"
              element={
                <ProtectedRoute>
                  <SpeakerIntakeForm />
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
