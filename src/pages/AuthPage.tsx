import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowLeft, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        if (error) throw error;
        onAuth();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Auth error');
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {mode === 'login' ? 'Login' : 'Register'}
            </h1>
            <p className="text-xs text-muted-foreground">VaultLink Cloud Sync</p>
          </div>
        </div>

        {/* Social buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-11 border-border text-foreground hover:bg-secondary justify-center gap-3"
            onClick={handleGoogle}
          >
            <Chrome className="w-5 h-5 text-primary" />
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
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="bg-secondary border-border mt-1" required
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Password</Label>
            <Input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="bg-secondary border-border mt-1" required minLength={6}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
            <Mail className="w-4 h-4 mr-2" />
            {loading ? '...' : mode === 'login' ? 'Login' : 'Register'}
          </Button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-xs text-muted-foreground">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-primary hover:underline font-medium"
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>

        <p className="text-[10px] text-center text-muted-foreground font-mono">
          {t('privacyNote')}
        </p>
      </motion.div>
    </div>
  );
}
