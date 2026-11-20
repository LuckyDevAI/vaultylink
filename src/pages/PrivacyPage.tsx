import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/i18n';
import SiteHeader from '@/components/SiteHeader';
import Seo from '@/components/Seo';
import securityContent from '@/content/security.json';

export default function PrivacyPage() {
  const { lang, setView } = useAppStore();
  const { t } = useTranslation(lang);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Privacy Policy · VaultyLink"
        description="Dati trattati, archivio locale, database in Irlanda, servizi esterni e limiti della verifica privacy di Vaulty Link."
        path="/privacy"
      />
      <SiteHeader showBack onBack={() => setView('landing')} />

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <h1 className="text-3xl font-bold text-foreground">{t('privacyTitle')}</h1>
        <p className="text-xs text-muted-foreground">{t('privacyLastUpdate')}: 2026-11-20 · Italiano</p>

        <div lang="it" dir="ltr" className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS1Title')}</h2>
            <p>Solo Locale conserva link e preferiti sul dispositivo senza sincronizzare l’archivio sul cloud. L’account, gli acquisti, l’assistenza e le visite al sito comportano comunque trattamenti online. Lovable Cloud gestisce email di accesso, identificativi account e informazioni di autenticazione; il servizio registra anche stato del piano e dati operativi. Cloud Sync invia al database una copia cifrata dell’archivio e metadati associati. La coda dell’estensione invia URL, titolo e favicon non cifrati prima dell’importazione.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS2Title')}</h2>
            <p>Il browser conserva archivio e impostazioni in IndexedDB e localStorage, inclusi preferenza lingua, sessione di accesso e, nel percorso di ripristino del vault, una chiave JWK. Queste memorie sono distinte dalle analisi delle visite. Nel codice esaminato non sono stati individuati pixel pubblicitari né un banner collegato al consenso per le analisi.</p>
            <p>Le analisi delle visite di Lovable registrano, per ogni visitatore, pagine visitate, provenienza, paese, browser, sistema operativo, tipo di dispositivo, durata della visita, velocità di caricamento, errori e clic su pulsanti e link. Non usano cookie, non memorizzano nulla sul dispositivo, non conservano indirizzi IP e non identificano i visitatori. I dettagli sono conservati per 90 giorni e i riepiloghi giornalieri per un anno.</p>
            <p>Lovable raccoglie questi dati per noi. La sua <a href="https://lovable.dev/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">informativa sulla privacy</a> spiega come li tratta.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS3Title')}</h2>
            <p>Lovable Cloud riceve i dati necessari ad account, sincronizzazione e invio di email. Stripe gestisce il pagamento: i dati inseriti nella pagina di pagamento sono comunicati a Stripe e il servizio conserva i riferimenti necessari al piano. Se usi Google o Apple per l’accesso, il rispettivo fornitore riceve la richiesta di autenticazione. Le infrastrutture del sito e della CDN possono trattare dati di connessione.</p>
            <p>Quando usi l’assistente in Supporto, il testo della conversazione viene inviato al servizio AI di Lovable e al fornitore del modello OpenAI per generare la risposta. Non inviare password, PIN, chiavi o archivi personali. Le email di assistenza transitano attraverso i fornitori di posta e l’inoltro Cloudflare. Tempi di conservazione e luoghi di trattamento di tutti questi fornitori non sono stati verificati in questa revisione.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS4Title')}</h2>
            <p>Il vault utilizza AES-256-GCM, ma la gestione attuale delle chiavi account, della sessione locale e della biometria presenta limiti documentati. Non è dimostrata una garanzia zero-knowledge né l’impossibilità per il gestore di decifrare la copia cloud. Consulta il <a href="/security" className="text-primary underline">documento di sicurezza</a> per il dettaglio; questo aggiornamento informativo non modifica la crittografia.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('privacyS5Title')}</h2>
            <p>Per domande sul trattamento o richieste sui tuoi dati scrivi a <a href="mailto:support@vaultylink.com" className="text-primary underline">support@vaultylink.com</a>. Non includere segreti o archivi personali. Identità e recapiti completi del titolare, basi giuridiche, conservazione per categoria e procedure per esercitare i diritti devono essere completati e verificati prima di dichiarare conclusa la valutazione privacy.</p>
          </section>
          <section id="infrastruttura" className="space-y-3 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground">6. Server e trasferimenti internazionali</h2>
            <p className="font-medium text-primary">{securityContent.infrastructure.summary}</p>
            <p>{securityContent.infrastructure.scope}</p>
            <p>{securityContent.infrastructure.limits}</p>
            <p>{securityContent.infrastructure.certification}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
