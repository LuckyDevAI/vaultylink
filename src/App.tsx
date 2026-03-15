import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/appStore";
import LandingPage from "@/pages/LandingPage";
import VaultApp from "@/pages/VaultApp";

const queryClient = new QueryClient();

const AppRouter = () => {
  const view = useAppStore((s) => s.view);
  return view === 'landing' ? <LandingPage /> : <VaultApp />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppRouter />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
