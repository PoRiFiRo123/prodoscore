import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Judge from "./pages/Judge";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import JudgeSnippetsPage from "./pages/JudgeSnippets";
import TeamCheckin from "./pages/TeamCheckin";
import PublicVoting from "./pages/PublicVoting";
import VoteTeam from "./pages/VoteTeam";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/judge" element={<Judge />} />
          <Route path="/judge/snippets" element={<JudgeSnippetsPage />} />
          <Route path="/team-checkin/:teamId" element={<TeamCheckin />} />
          <Route path="/public-voting" element={<PublicVoting />} />
          <Route path="/vote/:teamId" element={<VoteTeam />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
