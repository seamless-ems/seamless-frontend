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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/new" element={<CreateEvent />} />
          <Route path="/event/:id" element={<EventDashboard />} />
          <Route path="/event/:id/speakers" element={<SpeakerModule />} />
          <Route path="/event/:id/speakers/:speakerId" element={<SpeakerPortal />} />
          <Route path="/team" element={<Team />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/speaker-intake/:eventId" element={<SpeakerIntakeForm />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
