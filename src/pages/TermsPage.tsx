import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import Seo from '@/components/Seo';

export default function TermsPage() {
  const { lang, setView } = useAppStore();
  const { t } = useTranslation(lang);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Termini di servizio · VaultyLink"
        description="Termini che regolano l'uso di VaultyLink, la cassaforte cifrata per i tuoi link."
        path="/terms"
      />
      <SiteHeader showBack onBack={() => setView('landing')} />

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <h1 className="text-3xl font-bold text-foreground">{t('termsTitle')}</h1>
        <p className="text-xs text-muted-foreground">{t('termsLastUpdate')}: 2026-03-16</p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('termsS1Title')}</h2>
            <p>{t('termsS1Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('termsS2Title')}</h2>
            <p>{t('termsS2Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('termsS3Title')}</h2>
            <p>{t('termsS3Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('termsS4Title')}</h2>
            <p>{t('termsS4Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('termsS5Title')}</h2>
            <p>{t('termsS5Text')}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
