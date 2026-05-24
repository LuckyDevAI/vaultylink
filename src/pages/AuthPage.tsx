import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowLeft, Chrome, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import SiteFooter from '@/components/SiteFooter';
import Seo from '@/components/Seo';
import { lovable } from '@/integrations/lovable/index';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/stores/appStore';
import { toast } from 'sonner';

// Apple logo SVG
const AppleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

interface AuthPageProps {
  onBack: () => void;
  onAuth: () => void;
}

export default function AuthPage({ onBack, onAuth }: AuthPageProps) {
  const { lang } = useAppStore();
  const { t } = useTranslation(lang);
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  // Detect password recovery callback (#type=recovery, ?type=recovery, or legacy ?code=... on /auth)
  useEffect(() => {
    const hash = window.location.hash;
    const query = new URLSearchParams(window.location.search);
    if (hash.includes('type=recovery') || query.get('type') === 'recovery' || query.has('code')) {
      setMode('recovery');
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginFailed(false);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success('Check your email to confirm your account!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setLoginFailed(true);
          throw error;
        }
        onAuth();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Auth error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Inserisci la tua email per ricevere il link di reset');
      return;
    }
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw error;
      toast.success('Ti abbiamo inviato un link per reimpostare la password. Controlla la tua email.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore invio email');
    } finally {
      setResetSending(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('La password deve avere almeno 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password aggiornata. Ora puoi accedere.');
      // Clean hash and switch back to login
      window.history.replaceState(null, '', '/auth');
      setMode('login');
      setPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore aggiornamento password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error('Google login failed');
  };

  const handleApple = async () => {
    const { error } = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error('Apple login failed');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Header */}
        <Seo
          title={mode === 'login' ? 'Login · VaultyLink' : mode === 'register' ? 'Crea account · VaultyLink' : 'Reset password · VaultyLink'}
          description="Accedi o registrati per sincronizzare la tua cassaforte cifrata VaultyLink su tutti i tuoi dispositivi."
          path="/auth"
        />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Torna alla home" className="shrink-0">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {mode === 'login' ? 'Unlock your Vaulty Link' : mode === 'register' ? 'Register' : 'Reimposta password'}
            </h1>
            <p className="text-xs text-muted-foreground">Vaulty Link Cloud Sync</p>
          </div>
        </div>

        {mode === 'recovery' ? (
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Inserisci la nuova password per il tuo account.
            </p>
            <div>
              <Label htmlFor="new-password" className="text-xs text-muted-foreground">Nuova password</Label>
              <Input
                id="new-password" autoComplete="new-password"
                type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="bg-secondary border-border mt-1" required minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
              <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
              {loading ? '...' : 'Aggiorna password'}
            </Button>
          </form>
        ) : (
          <>
            {/* Social buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11 border-border text-foreground hover:bg-secondary justify-center gap-3"
                onClick={handleGoogle}
              >
                <Chrome className="w-5 h-5 text-primary" aria-hidden="true" />
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full h-11 border-border text-foreground hover:bg-secondary justify-center gap-3"
                onClick={handleApple}
              >
                <AppleLogo />
                Continue with Apple
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1 bg-border" />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <Label htmlFor="auth-email" className="text-xs text-muted-foreground">Email</Label>
                <Input
                  id="auth-email" autoComplete="email"
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="bg-secondary border-border mt-1" required
                />
              </div>
              <div>
                <Label htmlFor="auth-password" className="text-xs text-muted-foreground">Password</Label>
                <Input
                  id="auth-password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="bg-secondary border-border mt-1" required minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
                <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                {loading ? '...' : mode === 'login' ? 'Login' : 'Register'}
              </Button>
            </form>

            {/* Reset Password — always visible in login mode, emphasized after a failed login */}
            {mode === 'login' && (
              <div
                className={`rounded-lg p-3 space-y-2 transition-colors ${
                  loginFailed
                    ? 'border border-destructive/30 bg-destructive/10'
                    : 'border border-border/40 bg-secondary/40'
                }`}
              >
                <p className={`text-xs ${loginFailed ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {loginFailed
                    ? 'Password errata. Vuoi reimpostarla?'
                    : 'Hai dimenticato la password?'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={resetSending}
                  className={`w-full ${
                    loginFailed
                      ? 'border-destructive/40 text-destructive hover:bg-destructive/20 hover:text-destructive'
                      : 'border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
                  {resetSending ? 'Invio in corso...' : 'Reset Password'}
                </Button>
              </div>
            )}

            {/* Toggle mode */}
            <p className="text-center text-xs text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setLoginFailed(false); }}
                className="text-primary hover:underline font-medium"
              >
                {mode === 'login' ? 'Register' : 'Login'}
              </button>
            </p>

            <p className="text-[10px] text-center text-muted-foreground font-mono">
              {t('privacyNote')}
            </p>
          </>
        )}
      </motion.div>
      <SiteFooter />
    </div>
  );
}
