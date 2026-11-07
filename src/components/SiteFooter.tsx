import logoVaulty from '@/assets/logo_vaulty.png';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';

export default function SiteFooter() {
  const { lang, setView } = useAppStore();
  const { t } = useTranslation(lang);

  return (
    <footer className="border-t border-border py-4 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <div className="flex items-center gap-2">
            <img src={logoVaulty} alt="Vaulty Link" className="w-5 h-5" />
            <p className="text-xs text-muted-foreground">
              © 2026-2030 Vaulty Link ·{' '}
              <a
                href="https://apprentice.technology"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary underline-offset-2 hover:underline transition-colors"
              >
                Apprentice.Technology
              </a>
              . all right reserved.
            </p>
          </div>
          <a href="mailto:vaultylink@mailcripty.com" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Info: vaultylink@mailcripty.com
          </a>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{t('encrypted')}</p>
        <Button asChild variant="link" size="sm"><a href="/download" onClick={(event) => { event.preventDefault(); setView('download'); }}>Download</a></Button>
      </div>
    </footer>
  );
}
