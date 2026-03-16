import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';

export default function EulaPage() {
  const { lang, setView } = useAppStore();
  const { t } = useTranslation(lang);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showBack onBack={() => setView('landing')} />

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <h1 className="text-3xl font-bold text-foreground">{t('eulaTitle')}</h1>
        <p className="text-xs text-muted-foreground">{t('eulaLastUpdate')}: 2026-03-16</p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('eulaS1Title')}</h2>
            <p>{t('eulaS1Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('eulaS2Title')}</h2>
            <p>{t('eulaS2Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('eulaS3Title')}</h2>
            <p>{t('eulaS3Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('eulaS4Title')}</h2>
            <p>{t('eulaS4Text')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('eulaS5Title')}</h2>
            <p>{t('eulaS5Text')}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
