import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/stores/appStore';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { User, LogOut, CreditCard, Lock, ExternalLink, Shield, Cloud, Crown, Check, Sparkles, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { PLANS } from '@/lib/stripe';
import { useTranslation } from '@/lib/i18n';

interface PlanInfo {
  subscribed?: boolean;
  plan?: string | null;
  subscription_end?: string | null;
  auto_renew?: boolean | null;
  trialing?: boolean;
  trial_end?: string | null;
}

export default function AccountPage() {
  const { setView, cloudUser, lang } = useAppStore();
  const { t } = useTranslation(lang);
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'yearly' | 'lifetime' | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  const refreshPlan = async () => {
    setRefreshLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      if (data) setPlan(data);
    } finally { setRefreshLoading(false); }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setView('auth');
        return;
      }
      setEmail(user.email ?? null);
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
      void refreshPlan().catch(() => toast.error('Impossibile verificare il piano'));
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        toast.success('Sottoscrizione completata');
        void supabase.functions.invoke('send-purchase-confirmation');
      } else if (params.get('payment') === 'canceled') toast.info('Sottoscrizione non completata');
      if (params.has('payment')) window.history.replaceState({}, '', '/account');
    });
    const refresh = () => { void refreshPlan().catch(() => {}); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [cloudUser, setView]);

  const cancelTrial = async () => {
    if (!window.confirm('Disdire la prova Cloud Sync? Nessun addebito; accesso fino alla fine dei 10 giorni.')) return;
    setCancelLoading(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-trial');
      if (error) throw error;
      await refreshPlan();
      toast.success('Prova disdetta: nessun addebito alla scadenza');
    } catch { toast.error('Disdetta non riuscita. Riprova.'); }
    finally { setCancelLoading(false); }
  };

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

  const freeDaysLeft = plan?.plan === 'free' && plan?.subscription_end
    ? Math.max(0, Math.ceil((new Date(plan.subscription_end).getTime() - Date.now()) / 86400000))
    : null;

  const planLabel = plan?.plan === 'lifetime' ? t('pricingLifetimeName')
    : plan?.plan === 'yearly' ? (plan.trialing ? 'Cloud Sync — prova gratuita' : 'Cloud Sync — annuale')
    : plan?.plan === 'frozen' ? 'Frozen (scaduto)'
    : plan?.plan === 'free' ? `Free (scade tra ${freeDaysLeft ?? '—'} giorni)`
    : plan?.subscribed ? 'Attivo' : 'Free';

  const isFree = !!plan && !plan.subscribed;


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
                  · {plan.trialing ? 'fine prova' : plan.auto_renew ? 'rinnovo' : 'scadenza'} {new Date(plan.subscription_end).toLocaleDateString('it-IT')}
                </span>
              )}
            </p>
          </div>
          {plan?.trialing && (
            <p className="text-sm text-muted-foreground">
              {plan.auto_renew
                ? 'Oggi €0. Alla fine dei 10 giorni: €9,90/anno, salvo disdetta prima della fine della prova.'
                : 'Prova disdetta: nessun addebito. Cloud Sync resta disponibile fino alla fine della prova.'}
            </p>
          )}
          {plan?.trialing && plan.auto_renew && (
            <Button variant="outline" onClick={cancelTrial} disabled={cancelLoading}>
              <X className="w-4 h-4 mr-2" />{cancelLoading ? 'Disdetta…' : 'Disdici la prova'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => void refreshPlan().catch(() => toast.error('Impossibile verificare il piano'))} disabled={refreshLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />Aggiorna piano
          </Button>
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

        {isFree && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Passa a un piano premium</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('pricingFree')}
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Yearly */}
              <Card className="p-6 bg-card border-border flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Cloud Sync</h3>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  €9,90<span className="text-sm font-normal text-muted-foreground">/anno</span>
                </p>
                <p className="mt-2 text-sm text-primary font-semibold">10 giorni gratis · oggi €0</p>
                <p className="mt-2 text-xs text-muted-foreground">{t('pricingTrialTerms')}</p>
                <ul className="mt-4 space-y-2 text-sm text-foreground flex-1">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Sincronizzazione cloud E2EE</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Multi-dispositivo in tempo reale</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Backup automatico cifrato</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Aggiornamenti inclusi</li>
                </ul>
                <Button
                  onClick={() => handleCheckout('yearly')}
                  disabled={checkoutLoading !== null}
                  className="mt-5 bg-primary text-primary-foreground"
                >
                  {checkoutLoading === 'yearly' ? 'Apertura…' : 'Inizia i 10 giorni gratis'}
                </Button>
              </Card>

              {/* Lifetime */}
              <Card className="p-6 bg-card border-primary/50 flex flex-col relative ring-1 ring-primary/30">
                <span className="absolute -top-2 right-4 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Più popolare
                </span>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-vault-gold" />
                  <h3 className="font-semibold text-foreground">{t('pricingLifetimeName')}</h3>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  €49,90<span className="text-sm font-normal text-muted-foreground"> una tantum</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{t('pricingLifetimeDesc')}</p>
                <ul className="mt-4 space-y-2 text-sm text-foreground flex-1">
                  {['pricingLifetimeFeat1', 'pricingLifetimeFeat2', 'pricingLifetimeFeat3', 'pricingLifetimeFeat4'].map(key => (
                    <li key={key} className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {t(key)}</li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleCheckout('lifetime')}
                  disabled={checkoutLoading !== null}
                  className="mt-5 bg-primary text-primary-foreground"
                >
                  {checkoutLoading === 'lifetime' ? 'Apertura…' : 'Acquista'}
                </Button>
              </Card>
            </div>
          </div>
        )}



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
