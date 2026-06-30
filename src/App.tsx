import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Connections from "./pages/Connections";
import { SocialProvider } from "./context/SocialContext";
import { ActivityHistoryProvider } from "./context/ActivityHistoryContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AttendingProvider } from "./context/AttendingContext";
import { mockEvents } from "./data/mockData";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SocialProvider>
        <ActivityHistoryProvider>
          <WishlistProvider allEvents={mockEvents}>
            <AttendingProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/connections" element={<Connections />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AttendingProvider>
          </WishlistProvider>
        </ActivityHistoryProvider>
      </SocialProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
