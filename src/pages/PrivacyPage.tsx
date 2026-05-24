import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import Seo from '@/components/Seo';

export default function PrivacyPage() {
  const { lang, setView } = useAppStore();
  const { t } = useTranslation(lang);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Privacy Policy · VaultyLink"
        description="Come VaultyLink protegge i tuoi dati: cifratura end-to-end AES-256-GCM, zero accesso server ai contenuti."
        path="/privacy"
      />
      <SiteHeader showBack onBack={() => setView('landing')} />

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <h1 className="text-3xl font-bold text-foreground">{t('privacyTitle')}</h1>
        <p className="text-xs text-muted-foreground">{t('privacyLastUpdate')}: 2026-03-16</p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS1Title')}</h2>
            <p>{t('privacyS1Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS2Title')}</h2>
            <p>{t('privacyS2Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS3Title')}</h2>
            <p>{t('privacyS3Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS4Title')}</h2>
            <p>{t('privacyS4Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS5Title')}</h2>
            <p>{t('privacyS5Text')}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
