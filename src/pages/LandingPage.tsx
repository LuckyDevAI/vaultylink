import { useEffect, useState } from 'react';
import logoVaulty from '@/assets/logo_vaulty.png';
import { motion } from 'framer-motion';
import { Shield, Lock, Heart, Cloud, Globe, Download, ChevronRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { PLANS } from '@/lib/stripe';
import { toast } from 'sonner';
import SiteHeader from '@/components/SiteHeader';
import Seo from '@/components/Seo';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

export default function LandingPage() {
  const { lang, setView, cloudUser } = useAppStore();
  const { t } = useTranslation(lang);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Handle payment redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      toast.success(t('paymentSuccess') || 'Pagamento completato con successo!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'canceled') {
      toast.info(t('paymentCanceled') || 'Pagamento annullato.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleCheckout = async (plan: 'yearly' | 'lifetime') => {
    if (!cloudUser) {
      setView('auth');
      return;
    }
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PLANS[plan].priceId, mode: PLANS[plan].mode },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  const features = [
    { icon: Shield, key: 'featCrypto', descKey: 'featCryptoDesc', color: 'text-primary', priceKey: 'featPriceFree' },
    { icon: Lock, key: 'featLocal', descKey: 'featLocalDesc', color: 'text-vault-gold', priceKey: 'featPriceLocal' },
    { icon: Heart, key: 'featTopics', descKey: 'featTopicsDesc', color: 'text-destructive', priceKey: 'featPriceFree' },
    { icon: Cloud, key: 'featCloud', descKey: 'featCloudDesc', color: 'text-primary', priceKey: 'featPriceCloud' },
    { icon: Globe, key: 'featLangs', descKey: 'featLangsDesc', color: 'text-vault-gold', priceKey: 'featPriceFree' },
    { icon: Download, key: 'featPwa', descKey: 'featPwaDesc', color: 'text-primary', priceKey: 'featPriceFree' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-vault-gold/5 blur-[100px]" />
      </div>

      <Seo
        title="VaultyLink — Tutti i tuoi link in cassaforte cifrata"
        description="VaultyLink: cassaforte digitale end-to-end cifrata (AES-256-GCM) per salvare, organizzare e proteggere i tuoi link. Windows, macOS e Web."
        path="/"
      />
      <SiteHeader />

      <main>
      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial="hidden" animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
          >
            <Shield className="w-3.5 h-3.5" />
            AES-256-GCM
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1}
            className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight"
          >
            <span className="text-foreground">{t('heroTitle')}</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-vault-gold bg-clip-text text-transparent">
              {t('heroHighlight')}
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2}
            className="text-primary/90 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-semibold whitespace-pre-line"
          >
            {t('heroSub')}
            <br />
            Scegli il piano che preferisci:
            <br />
            il Piano con sincronizzazione solo locale. Solo tuo.
            <br />
            Oppure con Backup cifrato su Cloud Criptato.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => setView('vault')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base font-semibold vault-glow"
            >
              {t('ctaOpen')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-secondary px-8 py-6 text-base"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('ctaLearn')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Vault illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 mx-auto max-w-md"
        >
          <div className="relative p-8 rounded-2xl bg-card border border-border vault-glow">
            <div className="absolute inset-0 rounded-2xl vault-shimmer" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2 w-full">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="flex-1 h-2 rounded bg-muted" />
                    <div className="w-12 h-2 rounded bg-muted" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{t('encrypted')}</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat, i) => (
            <motion.div
              key={feat.key}
              variants={fadeUp}
              custom={i}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors duration-300"
            >
              <feat.icon className={`w-8 h-8 ${feat.color} mb-4`} />
              <h2 className="text-lg font-semibold text-foreground mb-2">{t(feat.key)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{t(feat.descKey)}</p>
              <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                feat.priceKey === 'featPriceFree' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-vault-gold/10 text-vault-gold'
              }`}>
                {t(feat.priceKey)}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-12"
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center text-foreground">
            {t('pricingTitle')}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Yearly Plan */}
            <motion.div variants={fadeUp} custom={1}
              className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors duration-300 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-foreground">{t('pricingYearlyName')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">{t('pricingYearlyDesc')}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">€{t('pricingYearlyPrice')}</span>
                <span className="text-muted-foreground text-sm">{t('pricingYearlyPeriod')}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['pricingYearlyFeat1','pricingYearlyFeat2','pricingYearlyFeat3','pricingYearlyFeat4'].map(k => (
                  <li key={k} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {t(k)}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-secondary"
                onClick={() => handleCheckout('yearly')}
                disabled={loadingPlan === 'yearly'}
              >
                {loadingPlan === 'yearly' ? '...' : t('pricingCta')}
              </Button>
            </motion.div>

            {/* Lifetime Plan */}
            <motion.div variants={fadeUp} custom={2}
              className="relative p-8 rounded-2xl bg-card border-2 border-primary/50 hover:border-primary transition-colors duration-300 flex flex-col vault-glow"
            >
              <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {t('pricingLifetimeBadge')}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-vault-gold" />
                <h3 className="text-xl font-bold text-foreground">{t('pricingLifetimeName')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">{t('pricingLifetimeDesc')}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">€{t('pricingLifetimePrice')}</span>
                <span className="text-muted-foreground text-sm ml-1">{t('pricingLifetimeOnce')}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['pricingLifetimeFeat1','pricingLifetimeFeat2','pricingLifetimeFeat3','pricingLifetimeFeat4'].map(k => (
                  <li key={k} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-vault-gold shrink-0" />
                    {t(k)}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 vault-glow"
                onClick={() => handleCheckout('lifetime')}
                disabled={loadingPlan === 'lifetime'}
              >
                {loadingPlan === 'lifetime' ? '...' : t('pricingCta')}
                {loadingPlan !== 'lifetime' && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </motion.div>
          </div>

          <motion.p variants={fadeUp} custom={3} className="text-center text-sm text-muted-foreground">
            {t('pricingFree')}
          </motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      </main>

      <footer className="relative z-10 border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img src={logoVaulty} alt="Vaulty Link secure vault logo" className="w-10 h-10" />
                <span className="font-semibold text-lg text-foreground">Vaulty Link</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                {t('tagline')}
              </p>
              <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>
            </div>

            {/* Product */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Product</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t('ctaLearn')}
                  </button>
                </li>
                <li>
                  <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t('pricingTitle')}
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('vault')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t('ctaOpen')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t('footerLegal')}</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setView('privacy')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t('privacyPolicy')}
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('terms')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t('termsOfService')}
                  </button>
                </li>
                <li>
                  <button onClick={() => setView('eula')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t('eula')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Security */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t('featCrypto')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-primary shrink-0" />
                  AES-256-GCM
                </li>
                <li className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-primary shrink-0" />
                  PBKDF2 · 100k iter
                </li>
                <li className="flex items-center gap-1.5">
                  <Download className="w-3 h-3 text-primary shrink-0" />
                  PWA · Offline
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Vaulty Link · v10.10.10
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {t('encrypted')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
