import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/i18n';

export default function PrivacyPage() {
  const { lang, setView } = useAppStore();
  const { t } = useTranslation(lang);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('landing')} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-sm">VaultLink</span>
          </div>
        </div>
      </header>

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
