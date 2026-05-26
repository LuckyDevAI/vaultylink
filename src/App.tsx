import { useEffect, useState } from 'react';
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
import AccountPage from "@/pages/AccountPage";
import SitemapPage from "@/pages/SitemapPage";

const queryClient = new QueryClient();

const PATH_TO_VIEW: Record<string, string> = {
  '/': 'landing',
  '/amministra': 'admin',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/eula': 'eula',
  '/auth': 'auth',
  '/vault': 'vault',
  '/account': 'account',
  '/sitemap': 'sitemap',
};

const VIEW_TO_PATH: Record<string, string> = {
  landing: '/',
  admin: '/amministra',
  privacy: '/privacy',
  terms: '/terms',
  eula: '/eula',
  auth: '/auth',
  vault: '/vault',
  account: '/account',
  sitemap: '/sitemap',
};

const isPasswordRecoveryCallback = () => {
  if (window.location.pathname !== '/auth') return false;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return query.get('type') === 'recovery' || hash.get('type') === 'recovery' || query.has('code');
};



const AppRouter = () => {
  const { view, setView, setCloudUser } = useAppStore();
  const [hasSyncedInitialPath, setHasSyncedInitialPath] = useState(false);

  // Sync URL path → view on mount
  useEffect(() => {
    const path = window.location.pathname;
    const mapped = PATH_TO_VIEW[path];
    if (mapped && mapped !== view) {
      setView(mapped as typeof view);
    }
    setHasSyncedInitialPath(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync view → URL path on view change
  useEffect(() => {
    if (!hasSyncedInitialPath || isPasswordRecoveryCallback()) return;
    const targetPath = VIEW_TO_PATH[view] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.replaceState(null, '', targetPath);
    }
  }, [hasSyncedInitialPath, view]);

  // Listen for auth state changes (e.g. OAuth redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCloudUser(true);
        if (event === 'PASSWORD_RECOVERY' || isPasswordRecoveryCallback()) {
          sessionStorage.setItem('vl_password_recovery', '1');
          setView('auth');
          return;
        }
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
        if (isPasswordRecoveryCallback()) {
          sessionStorage.setItem('vl_password_recovery', '1');
          setView('auth');
        }
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
    case 'account':
      return <AccountPage />;
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
