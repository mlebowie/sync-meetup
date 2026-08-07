import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, saveUserProfile, DEFAULT_PROFILE } from '@/lib/userProfile';
import { LogIn } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-5">
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
  );
};

export default Login;
