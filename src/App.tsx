import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/integrations/supabase/client";
import LandingPage from "@/pages/LandingPage";
import VaultApp from "@/pages/VaultApp";
import AuthPage from "@/pages/AuthPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import EulaPage from "@/pages/EulaPage";
import AdminPage from "@/pages/AdminPage";

const queryClient = new QueryClient();

const AppRouter = () => {
  const { view, setView, setCloudUser } = useAppStore();

  // Listen for auth state changes (e.g. OAuth redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCloudUser(true);
        if (view === 'auth' || view === 'landing') {
          setView('vault');
        }
      } else {
        setCloudUser(false);
      }
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCloudUser(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [setCloudUser, setView, view]);

  switch (view) {
    case 'auth':
      return <AuthPage onBack={() => setView('landing')} onAuth={() => setView('vault')} />;
    case 'vault':
      return <VaultApp />;
    case 'admin':
      return <AdminPage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'terms':
      return <TermsPage />;
    case 'eula':
      return <EulaPage />;
    default:
      return <LandingPage />;
  }
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
