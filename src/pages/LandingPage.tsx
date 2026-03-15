import { motion } from 'framer-motion';
import { Shield, Lock, Heart, Cloud, Globe, Download, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/stores/appStore';
import { LANG_NAMES, type LangCode } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

export default function LandingPage() {
  const { lang, setLang, setView } = useAppStore();
  const { t } = useTranslation(lang);

  const features = [
    { icon: Shield, key: 'featCrypto', descKey: 'featCryptoDesc', color: 'text-primary' },
    { icon: Lock, key: 'featLocal', descKey: 'featLocalDesc', color: 'text-vault-gold' },
    { icon: Heart, key: 'featTopics', descKey: 'featTopicsDesc', color: 'text-destructive' },
    { icon: Cloud, key: 'featCloud', descKey: 'featCloudDesc', color: 'text-primary' },
    { icon: Globe, key: 'featLangs', descKey: 'featLangsDesc', color: 'text-vault-gold' },
    { icon: Download, key: 'featPwa', descKey: 'featPwaDesc', color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-vault-gold/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-lg text-foreground">VaultLink</span>
        </div>
        <div className="flex items-center gap-3">
          <Select value={lang} onValueChange={(v) => setLang(v as LangCode)}>
            <SelectTrigger className="w-[140px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANG_NAMES).map(([code, name]) => (
                <SelectItem key={code} value={code}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

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
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            {t('heroSub')}
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
              <h3 className="text-lg font-semibold text-foreground mb-2">{t(feat.key)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(feat.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            VaultLink v10.10.10
          </div>
          <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>
        </div>
      </footer>
    </div>
  );
}
