import logoVaulty from '@/assets/logo_vaulty.png';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/stores/appStore';

export default function SiteFooter() {
  const { lang } = useAppStore();
  const { t } = useTranslation(lang);

  return (
    <footer className="border-t border-border py-4 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src={logoVaulty} alt="VaultLink" className="w-5 h-5" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} VaultLink</p>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{t('encrypted')}</p>
      </div>
    </footer>
  );
}
