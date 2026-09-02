import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, saveUserProfile, DEFAULT_PROFILE } from '@/lib/userProfile';
import { LogIn } from 'lucide-react';
import { lovable } from '@/integrations/lovable';
import { useState as useSocialState } from 'react';

const SOCIAL_BUTTONS = [
  { provider: 'google' as const, label: 'Google', icon: 'G' },
  { provider: 'apple' as const, label: 'Apple', icon: '' },
  { provider: 'microsoft' as const, label: 'Microsoft', icon: 'M' },
];

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [socialBusy, setSocialBusy] = useSocialState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Missing details', description: 'Email and password are required.' });
      return;
    }
    const existing = getUserProfile();
    const profile = existing ?? { ...DEFAULT_PROFILE, email: email.trim().slice(0, 120) };
    saveUserProfile(profile);
    toast({ title: `Welcome back, ${profile.firstName}!`, description: 'Your feed is ready.' });
    navigate('/', { replace: true });
  };

  const handleSocial = async (provider: 'google' | 'apple' | 'microsoft') => {
    setSocialBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: 'Sign-in failed', description: result.error.message });
        return;
      }
      if (result.redirected) {
        return; // Full-page redirect — browser handles it
      }
      // Session set — make sure a local profile exists so the feed works.
      const existing = getUserProfile();
      if (!existing) saveUserProfile({ ...DEFAULT_PROFILE });
      toast({ title: `Welcome, ${getUserProfile()?.firstName ?? 'friend'}!`, description: 'Your feed is ready.' });
      navigate('/', { replace: true });
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
            {SOCIAL_BUTTONS.map(({ provider, label, icon }) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                disabled={socialBusy !== null}
                onClick={() => handleSocial(provider)}
              >
                {socialBusy === provider ? '…' : icon || ''}
                <span className="sr-only">Sign in with {label}</span>
                <span className="hidden sm:inline">{label}</span>
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
            <Button type="submit" variant="hero" size="lg" className="w-full">
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