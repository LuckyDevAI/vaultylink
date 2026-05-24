import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/stores/appStore';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { User, LogOut, CreditCard, Lock, ExternalLink, Shield, Cloud, Crown, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PLANS } from '@/lib/stripe';

interface PlanInfo {
  subscribed?: boolean;
  plan?: string | null;
  subscription_end?: string | null;
  auto_renew?: boolean | null;
}

export default function AccountPage() {
  const { setView, cloudUser } = useAppStore();
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setView('auth');
        return;
      }
      setEmail(user.email ?? null);
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
      supabase.functions.invoke('check-subscription').then(({ data, error }) => {
        if (!error && data) setPlan(data);
      });
      supabase.from('user_plans').select('auto_renew, expires_at, plan').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) setPlan(p => ({
            subscribed: p?.subscribed ?? (data.plan !== 'frozen'),
            plan: data.plan,
            subscription_end: data.expires_at ?? p?.subscription_end ?? null,
            auto_renew: data.auto_renew,
          }));
        });
    });
  }, [cloudUser, setView]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('landing');
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
      else throw new Error('URL portale non disponibile');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossibile aprire il portale');
    } finally {
      setPortalLoading(false);
    }
  };

  const planLabel = plan?.plan === 'lifetime' ? 'Lifetime'
    : plan?.plan === 'yearly' ? 'Annuale'
    : plan?.plan === 'frozen' ? 'Frozen (scaduto)'
    : plan?.subscribed ? 'Attivo' : 'Free';

  const isFree = !plan?.subscribed && (plan?.plan == null || plan?.plan === 'free');

  const handleCheckout = async (which: 'yearly' | 'lifetime') => {
    setCheckoutLoading(which);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PLANS[which].priceId, mode: PLANS[which].mode },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Account</h1>
        </div>

        <Card className="p-6 bg-card border-border space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="text-base text-foreground break-all">{email ?? '—'}</p>
          </div>
          <Separator className="bg-border" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Piano</p>
            <p className="text-base text-foreground">
              {planLabel}
              {plan?.subscription_end && (
                <span className="text-sm text-muted-foreground ml-2">
                  · scade {new Date(plan.subscription_end).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          {plan?.subscribed && plan?.plan !== 'lifetime' && (
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={portalLoading}
              className="border-border w-full sm:w-auto"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {portalLoading ? 'Apertura…' : 'Gestisci abbonamento'}
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          )}
        </Card>

        <Card className="p-6 bg-card border-border space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vault</p>
          <p className="text-sm text-muted-foreground">
            Per modificare Master Password, PIN o biometria devi prima sbloccare il vault.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setView('vault')} className="bg-primary text-primary-foreground">
              <Lock className="w-4 h-4 mr-2" /> Apri il vault
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => setView('admin')} className="border-border">
                <Shield className="w-4 h-4 mr-2" /> Pannello Admin
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-border text-destructive hover:text-destructive w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
