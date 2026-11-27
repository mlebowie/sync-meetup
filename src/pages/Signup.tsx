import { useEffect, useMemo, useState } from 'react';
import { primaryCta } from '@/lib/ctaStyles';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import ConsentFields from '@/components/ConsentFields';
import {
  INTEREST_GROUPS,
  ONBOARDING_INTERESTS,
  UserProfile,
  getUserProfile,
  saveUserProfile,
} from '@/lib/userProfile';
import { getPendingIntent, clearPendingIntent } from '@/lib/pendingIntent';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { resetFilterTour } from '@/lib/filterTour';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const MIN_INTERESTS = 3;
const MAX_INTERESTS = 5;

/**
 * Short sign-up (Figma "G3/G4"): interests (required) then account (required).
 * No personality quiz — that stays optional, from the homepage hero.
 * After Google sign-in (?via=google) the account already exists, so only the
 * interests step is shown.
 */
const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const viaGoogle = params.get('via') === 'google';
  const intent = useMemo(() => getPendingIntent(), []);

  const [step, setStep] = useState<'interests' | 'account'>('interests');
  const [interests, setInterests] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  // Required privacy consent and the optional email opt-in (same as the full onboarding).
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const consentTimes = () => {
    const now = new Date().toISOString();
    return { privacyAcceptedAt: now, ...(emailOptIn ? { emailOptInAt: now } : {}) };
  };
  const needPrivacy = () =>
    toast({
      title: 'Agree to the privacy policy',
      description: 'Tick the privacy box to create your account.',
      variant: 'destructive',
    });
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = viaGoogle ? 1 : 2;
  const stepNumber = step === 'interests' ? 1 : 2;

  const interestsById = useMemo(() => new Map(ONBOARDING_INTERESTS.map((i) => [i.id, i])), []);

  // Back from Google with a profile that already has interests (returning member): nothing to ask.
  useEffect(() => {
    if (!viaGoogle) return;
    const check = () => {
      const profile = getUserProfile();
      if (profile && profile.interests.length >= MIN_INTERESTS) navigate('/', { replace: true });
    };
    check();
    window.addEventListener('sync:profile-changed', check);
    return () => window.removeEventListener('sync:profile-changed', check);
  }, [viaGoogle, navigate]);

  const toggleInterest = (id: string) => {
    setInterests((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= MAX_INTERESTS) {
        toast({ title: 'Choose up to five', description: 'Remove one interest before adding another.' });
        return prev;
      }
      return [...prev, id];
    });
  };

  const finish = (profile: UserProfile, welcome: boolean) => {
    resetFilterTour();
    window.dispatchEvent(new Event('sync:profile-changed'));
    if (welcome && !intent) {
      toast({ title: `Welcome to SYNC, ${profile.firstName}`, description: 'Your feed is ready.' });
    }
    // With an intent, the event card finishes the action and says hello.
    navigate('/', { replace: true });
  };

  const continueFromInterests = async () => {
    if (interests.length < MIN_INTERESTS) {
      toast({ title: 'Choose at least three', description: 'They decide which events fill your home feed.' });
      return;
    }
    if (!viaGoogle) {
      setStep('account');
      window.scrollTo({ top: 0 });
      return;
    }
    if (!privacyAccepted) {
      needPrivacy();
      return;
    }
    // Google: the account and a basic profile exist; add the interests and consent to it.
    const { data } = await supabase.auth.getSession();
    const existing = getUserProfile();
    if (!data.session || !existing) {
      toast({
        title: 'Still signing you in',
        description: 'Give it a second, then tap Continue again.',
      });
      return;
    }
    const consent = consentTimes();
    const profile = { ...existing, interests, ...consent };
    saveUserProfile(profile); // also saves to the account
    // Keep the consent with the account too, as the email sign-up does.
    void supabase.auth.updateUser({
      data: { privacy_accepted_at: consent.privacyAcceptedAt, email_opt_in_at: consent.emailOptInAt ?? null },
    });
    finish(profile, true);
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !password) {
      toast({ title: 'A few more details', description: 'Add your first name, email and a password.' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (!adult) {
      toast({ title: 'SYNC is for adults', description: 'Confirm you’re 18 or older to continue.', variant: 'destructive' });
      return;
    }
    if (!privacyAccepted) {
      needPrivacy();
      return;
    }

    const profile: UserProfile = {
      firstName: firstName.trim().slice(0, 60),
      lastName: '',
      email: email.trim().slice(0, 120),
      dateOfBirth: '',
      location: 'Porto',
      neighborhood: '',
      nationality: '',
      interests,
      onboardedAt: new Date().toISOString(),
      ...consentTimes(),
    };

    if (DEMO_MODE) {
      saveUserProfile(profile);
      finish(profile, true);
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: profile.email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: profile.firstName,
          privacy_accepted_at: profile.privacyAcceptedAt,
          email_opt_in_at: profile.emailOptInAt ?? null,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not create your account', description: error.message, variant: 'destructive' });
      return;
    }
    saveUserProfile(profile);
    if (!data.session) {
      // Email confirmation is on: the account exists but needs the link in the inbox.
      toast({ title: 'Check your email', description: `We sent a confirmation link to ${profile.email}.` });
    }
    finish(profile, !!data.session);
  };

  const goBack = () => {
    if (step === 'account') {
      setStep('interests');
      return;
    }
    clearPendingIntent();
    navigate('/', { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={goBack} className="-ml-3">
            <ArrowLeft aria-hidden="true" /> {step === 'account' ? 'Back' : 'Back to events'}
          </Button>
          <span className="font-display text-sm font-bold tracking-wide text-primary-text">SYNC</span>
        </header>

        <div className="mb-6" aria-label={`Step ${stepNumber} of ${totalSteps}`}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-sage-deep">
            <span>
              Step {stepNumber} of {totalSteps} · {step === 'interests' ? 'Your interests' : 'Your account'}
            </span>
            <span className="text-primary-text">Required</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-sage/30">
            <div
              className="h-full rounded-full bg-sage-deep transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {intent && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-event-card px-3 py-2.5 shadow-card">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-deep">
                {intent.action === 'tickets'
                  ? 'Signing up to get tickets for'
                  : intent.action === 'waitlist'
                    ? 'Signing up to join the waitlist for'
                    : 'Signing up to register for'}
              </p>
              <p className="text-sm font-semibold text-primary-text">{intent.eventTitle}</p>
            </div>
          </div>
        )}

        {step === 'interests' ? (
          <section className="animate-fade-in">
            <h1 className="font-display text-[22px] leading-7 font-light tracking-[0.015em] text-primary-text sm:text-2xl">What are you into?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick three to five. They decide which events fill your home feed, and you can change them any time.
            </p>
            <div className="mt-6 space-y-5">
              {INTEREST_GROUPS.map((group) => (
                <fieldset key={group.label}>
                  <legend className="mb-2 text-xs font-semibold uppercase text-sage-deep">{group.label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {group.interestIds.map((id) => {
                      const interest = interestsById.get(id);
                      if (!interest) return null;
                      const selected = interests.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleInterest(id)}
                          disabled={!selected && interests.length >= MAX_INTERESTS}
                          aria-pressed={selected}
                          className={cn(
                            'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-40',
                            selected
                              ? 'border-sage-deep bg-sage-deep text-event-card'
                              : 'border-sage bg-white text-foreground hover:border-sage-deep',
                          )}
                        >
                          <span aria-hidden="true">{interest.icon}</span>
                          {interest.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="sticky bottom-0 mt-8 bg-background/95 pb-4 pt-3">
              {/* Signed up with Google: there is no account step, so the consent is asked here. */}
              {viaGoogle && (
                <div className="mb-4">
                  <ConsentFields
                    idPrefix="signup-google"
                    privacyAccepted={privacyAccepted}
                    onPrivacyAccepted={setPrivacyAccepted}
                    emailOptIn={emailOptIn}
                    onEmailOptIn={setEmailOptIn}
                  />
                </div>
              )}
              <p className="mb-2 text-center text-sm font-semibold text-sage-deep" aria-live="polite">
                {interests.length} of 3–5 selected
              </p>
              <Button className={primaryCta} onClick={continueFromInterests}>
                {viaGoogle ? 'Finish' : 'Continue'}
              </Button>
            </div>
          </section>
        ) : (
          <form className="animate-fade-in" onSubmit={createAccount}>
            <h1 className="font-display text-[22px] leading-7 font-light tracking-[0.015em] text-primary-text sm:text-2xl">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              So you can sign in on any device and keep your events, chats and connections.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="signup-first">First name</Label>
                <Input id="signup-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} autoComplete="given-name" required />
              </div>
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" required />
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
                <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <label htmlFor="signup-adult" className="flex items-center gap-3 text-sm text-foreground">
                <Checkbox id="signup-adult" checked={adult} onCheckedChange={(v) => setAdult(v === true)} />
                I’m 18 or older
              </label>
              <ConsentFields
                idPrefix="signup"
                privacyAccepted={privacyAccepted}
                onPrivacyAccepted={setPrivacyAccepted}
                emailOptIn={emailOptIn}
                onEmailOptIn={setEmailOptIn}
              />
            </div>
            <Button type="submit" className={cn(primaryCta, 'mt-8')} disabled={submitting}>
              {submitting
                ? 'Creating your account…'
                : intent?.action === 'tickets'
                  ? 'Create account and get tickets'
                  : intent?.action === 'waitlist'
                    ? 'Create account and join the waitlist'
                    : intent
                      ? 'Create account and register'
                      : 'Create account'}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-text hover:underline">
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
};

export default Signup;
