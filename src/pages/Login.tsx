import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/userProfile';
import { LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type SocialProvider = 'google' | 'apple' | 'microsoft';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M17.05 12.54c-.03-2.84 2.32-4.2 2.42-4.27-1.32-1.93-3.37-2.19-4.1-2.22-1.74-.18-3.41 1.03-4.29 1.03-.89 0-2.25-1-3.7-.97-1.9.03-3.66 1.11-4.64 2.81-1.98 3.44-.51 8.53 1.42 11.32.94 1.37 2.06 2.9 3.54 2.84 1.42-.06 1.95-.92 3.67-.92 1.71 0 2.2.92 3.7.89 1.53-.03 2.5-1.39 3.43-2.77 1.08-1.58 1.53-3.11 1.55-3.19-.03-.02-2.97-1.14-3-4.52zM14.32 3.83c.78-.94 1.3-2.25 1.16-3.55-.1.04-2.17.44-3.84 2.18-.76.79-1.42 2.07-1.24 3.29.13.13.18.16 1.23.12 1.1-.04 2.14-.8 2.69-2.04z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
    <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
    <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
  </svg>
);

const SOCIAL_BUTTONS: { provider: SocialProvider; label: string; Icon: () => JSX.Element }[] = [
  { provider: 'google', label: 'Google', Icon: GoogleIcon },
  { provider: 'apple', label: 'Apple', Icon: AppleIcon },
  { provider: 'microsoft', label: 'Microsoft', Icon: MicrosoftIcon },
];

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Missing details', description: 'Email and password are required.' });
      return;
    }
    setSubmitting(true);
    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
    const { data, error } = isDemo
      ? { data: { user: null }, error: null }
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Log in failed', description: error.message, variant: 'destructive' });
      return;
    }
    const signedInEmail = (data.user?.email ?? email.trim()).slice(0, 120);
    const existing = getUserProfile();
    // Reuse the saved profile only if it belongs to this account; never fall back to demo data.
    const profile: UserProfile =
      existing && existing.email.toLowerCase() === signedInEmail.toLowerCase()
        ? existing
        : {
            firstName: (data.user?.user_metadata?.first_name as string | undefined) ?? signedInEmail.split('@')[0],
            lastName: (data.user?.user_metadata?.last_name as string | undefined) ?? '',
            email: signedInEmail,
            dateOfBirth: '',
            location: '',
            neighborhood: '',
            nationality: '',
            interests: [],
            onboardedAt: new Date().toISOString(),
          };
    saveUserProfile(profile);
    window.dispatchEvent(new Event('sync:profile-changed'));
    toast({ title: `Welcome back, ${profile.firstName}!`, description: 'Your feed is ready.' });
    navigate('/', { replace: true });
  };

  const handleSocial = async (provider: SocialProvider) => {
    setSocialBusy(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'microsoft' ? 'azure' : provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: 'Sign-in failed', description: error.message });
      }
      // On success the browser redirects to the provider, then back to the app.
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md px-4 md:px-6 py-12">
        <Link to="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">S</span>
          </div>
          <span className="text-xl font-bold text-foreground">Sync</span>
        </Link>

        <h1 className="text-3xl font-display font-light text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground mb-8">Log in to pick up with your crew and upcoming events.</p>

        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {SOCIAL_BUTTONS.map(({ provider, label, Icon }) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                disabled={socialBusy !== null}
                onClick={() => handleSocial(provider)}
              >
                {socialBusy === provider ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Icon />
                )}
                <span className="ml-2">{label}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="login-email">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div>
              <Label htmlFor="login-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              <LogIn className="h-4 w-4 mr-2" />
              Log in
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              New here?{' '}
              <Link to="/onboarding" className="text-primary font-medium hover:underline">
                Create a profile
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;