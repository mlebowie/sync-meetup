import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  INTEREST_GROUPS,
  ONBOARDING_INTERESTS,
  SOCIAL_STYLE_DETAILS,
  SocialPreferences,
  UserProfile,
  calculateAge,
  clearUserProfile,
  determineSocialStyle,
  saveUserProfile,
} from '@/lib/userProfile';
import { useToast } from '@/hooks/use-toast';
import { TypeaheadSelect } from '@/components/TypeaheadSelect';
import { CITIES, CITY_NEIGHBORHOODS, NATIONALITIES } from '@/lib/onboardingData';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Phone photos are several MB, and the profile lives in browser storage (about 5MB in total),
// so shrink the photo to a small JPEG before keeping it.
const fileToDataUrl = (file: File, maxSize = 600): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const maxDob = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
})();

const QUESTIONS = [
  {
    key: 'planning' as const,
    prompt: 'How does your perfect weekend start?',
    options: [
      { value: 'spontaneous', label: 'Spontaneous & unplanned', detail: 'I decide when the mood strikes' },
      { value: 'planned', label: 'A solid plan in place', detail: 'I like knowing what is ahead' },
    ],
  },
  {
    key: 'groupSetting' as const,
    prompt: "What's the ideal group size for a night out?",
    options: [
      { value: 'intimate', label: 'Intimate & cosy', detail: 'Around 3–5 people' },
      { value: 'lively', label: 'Lively & bustling', detail: 'Around 10+ people' },
    ],
  },
  {
    key: 'connectionGoal' as const,
    prompt: 'Walking into a room, you look for…',
    options: [
      { value: 'familiar', label: 'Familiar faces', detail: 'People I can catch up with' },
      { value: 'new-people', label: 'New people', detail: 'Someone new to introduce myself to' },
    ],
  },
] as const;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<SocialPreferences>>({});
  const [interests, setInterests] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [nationality, setNationality] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const completePreferences = answers.planning && answers.groupSetting && answers.connectionGoal
    ? answers as SocialPreferences
    : undefined;
  const socialStyle = completePreferences ? determineSocialStyle(completePreferences) : undefined;
  const styleDetails = socialStyle ? SOCIAL_STYLE_DETAILS[socialStyle] : undefined;
  const currentQuestion = step < QUESTIONS.length ? QUESTIONS[step] : undefined;
  const progress = Math.round(((step + 1) / 6) * 100);

  const interestsById = useMemo(
    () => new Map(ONBOARDING_INTERESTS.map(interest => [interest.id, interest])),
    [],
  );

  const leaveOnboarding = () => {
    clearUserProfile();
    navigate('/', { replace: true });
  };

  const toggleInterest = (id: string) => {
    setInterests(previous => {
      if (previous.includes(id)) return previous.filter(value => value !== id);
      if (previous.length >= 5) {
        toast({ title: 'Choose up to five', description: 'Remove one interest before adding another.' });
        return previous;
      }
      return [...previous, id];
    });
  };

  const handlePhoto = async (file?: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: 'Photo too large', description: 'Pick an image under 25MB.', variant: 'destructive' });
      return;
    }
    setPhoto(await fileToDataUrl(file));
  };

  const next = () => {
    if (currentQuestion && !answers[currentQuestion.key]) return;
    if (step === 4 && interests.length < 3) {
      toast({ title: 'Choose at least three', description: 'Three to five interests help us make useful recommendations.' });
      return;
    }
    setStep(previous => Math.min(previous + 1, 5));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!completePreferences || !socialStyle || !photo || !firstName || !lastName || !email || !password || !dob || !location || !neighborhood || !nationality) {
      toast({ title: 'A few more details', description: 'Complete every required field to create your profile.' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (calculateAge(dob) < 18) {
      toast({ title: 'You must be at least 18', description: 'SYNC is for adults aged 18 and over.', variant: 'destructive' });
      return;
    }

    const profile: UserProfile = {
      firstName: firstName.trim().slice(0, 60),
      lastName: lastName.trim().slice(0, 60),
      email: email.trim().slice(0, 120),
      dateOfBirth: dob,
      location: location.trim().slice(0, 80),
      neighborhood: neighborhood.trim().slice(0, 80),
      nationality: nationality.trim().slice(0, 60),
      photo,
      interests,
      socialPreferences: completePreferences,
      socialStyle,
      onboardedAt: new Date().toISOString(),
    };

    if (DEMO_MODE) {
      // Demo mode: the profile stays on this device and no account is created on the server.
      try {
        saveUserProfile(profile);
      } catch {
        toast({ title: 'Could not save your profile', description: 'Try a different photo.', variant: 'destructive' });
        return;
      }
      window.dispatchEvent(new Event('sync:profile-changed'));
      toast({ title: `Welcome, ${profile.firstName}!`, description: 'Your recommendations are ready.' });
      navigate('/', { replace: true });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: profile.email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: profile.firstName, last_name: profile.lastName },
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
    } else {
      toast({ title: `Welcome, ${profile.firstName}!`, description: 'Your recommendations are ready.' });
    }
    navigate('/', { replace: true });
  };

  // Progress runs across the three questions, the result and the interests step.
  const flowProgress = [20, 40, 60, 80, 100][step] ?? 100;
  const flowTop = (
    <>
      <header className="mb-6 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={leaveOnboarding} className="-ml-3 text-[#57514D]">
          <ArrowLeft aria-hidden="true" /> Return home
        </Button>
        <img src="/sync-wordmark.png" alt="SYNC" className="h-8 w-auto" />
      </header>

      <div
        className="mb-10 h-2 overflow-hidden rounded-full bg-[#ECE7DC]"
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={flowProgress}
      >
        <div
          className="h-full rounded-full bg-[#C1694F] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${flowProgress}%` }}
        />
      </div>
    </>
  );

  // The three "Find your flow" questions and the result screen use their own design.
  if (step <= 3) {
    const back = () => setStep(previous => previous - 1);
    const choose = (key: (typeof QUESTIONS)[number]['key'], value: string) =>
      setAnswers(previous => ({ ...previous, [key]: value }));

    // Arrow keys move between answers, like a native radio group.
    const onRadioKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!currentQuestion) return;
      const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
      const count = currentQuestion.options.length;
      const nextIndex = (index + delta + count) % count;
      choose(currentQuestion.key, currentQuestion.options[nextIndex].value);
      const group = event.currentTarget.parentElement;
      (group?.children[nextIndex] as HTMLElement | undefined)?.focus();
    };

    const backLink = (
      <button
        type="button"
        onClick={back}
        className="mx-auto mt-3 flex min-h-11 items-center px-3 text-base text-[#974B35] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        Back
      </button>
    );

    const primaryCta = 'min-h-12 px-6 text-[19px] font-bold bg-[#C1694F] text-[#1F110C] hover:bg-primary-hover disabled:opacity-40';

    return (
      <main className="min-h-screen bg-[#FCFAF3] font-sans text-[#57514D]">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          {flowTop}

          <section aria-live="polite">
            {currentQuestion && (
              <div key={currentQuestion.key} className="animate-fade-in">
                <p className="text-center text-sm leading-5 text-[#974B35]">Question {step + 1} of 3</p>
                <h1 id="flow-question" className="mt-2 text-center font-display text-[44px] font-bold leading-[52px] text-[#A25139]">
                  {currentQuestion.prompt}
                </h1>
                <div role="radiogroup" aria-labelledby="flow-question" className="mt-8 flex flex-col gap-3">
                  {currentQuestion.options.map((option, index) => {
                    const value = answers[currentQuestion.key];
                    const selected = value === option.value;
                    // Only one answer is in the tab order: the chosen one, or the first.
                    const tabbable = selected || (!value && index === 0);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={tabbable ? 0 : -1}
                        onClick={() => choose(currentQuestion.key, option.value)}
                        onKeyDown={event => onRadioKey(event, index)}
                        className={cn(
                          'flex w-full items-center gap-4 rounded-[20px] p-6 text-left shadow-[0_2px_12px_-4px_rgba(49,35,27,0.10)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          selected ? 'bg-[#FFECD2]' : 'bg-white',
                        )}
                      >
                        <span className="flex-1">
                          <span className="block text-base font-bold text-[#57514D]">{option.label}</span>
                          <span className="mt-1 block text-sm text-[#57514D]">{option.detail}</span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                            selected ? 'border-[#C1694F]' : 'border-[#57514D]',
                          )}
                        >
                          {selected && <span className="h-3 w-3 rounded-full bg-[#C1694F]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex flex-col items-center">
                  <Button type="button" onClick={next} disabled={!answers[currentQuestion.key]} className={primaryCta}>
                    Next
                  </Button>
                  {step > 0 && backLink}
                </div>
              </div>
            )}

            {step === 3 && styleDetails && (
              <div className="animate-fade-in text-center">
                <p className="text-sm leading-5 text-[#974B35]">Your starting point</p>
                <h1 className="mt-2 font-display text-[44px] font-bold leading-[52px] text-[#A25139]">{styleDetails.name}</h1>
                <p className="mx-auto mt-6 max-w-md text-base leading-6 text-[#57514D]">{styleDetails.description}</p>
                <div className="mt-8 flex flex-col items-center">
                  <Button type="button" onClick={next} className={primaryCta}>
                    Choose interests
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={cn('min-h-screen', step === 4 ? 'bg-[#FCFAF3]' : 'bg-background')}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {step === 4 ? flowTop : (<>
        <header className="mb-8 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={leaveOnboarding} className="-ml-3">
            <ArrowLeft aria-hidden="true" /> Guest view
          </Button>
          <span className="text-sm font-semibold text-primary">SYNC</span>
        </header>

        <div className="mb-8" aria-label={`Onboarding progress: ${progress}%`}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Your profile</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
        </div>
        </>)}

        <section className="min-h-[520px]" aria-live="polite">
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="mb-7 text-center">
                <p className="mb-2 text-sm font-semibold uppercase text-primary">Make it personal</p>
                <h1 className="font-display text-3xl font-light text-foreground sm:text-4xl">Choose 3–5 interests</h1>
                <p className="mt-3 text-sm text-muted-foreground">Your social style shapes the format. These shape what you will do.</p>
              </div>
              <div className="space-y-6">
                {INTEREST_GROUPS.map(group => (
                  <fieldset key={group.label}>
                    <legend className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group.label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {group.interestIds.map(id => {
                        const interest = interestsById.get(id);
                        if (!interest) return null;
                        const selected = interests.includes(id);
                        return (
                          <Button
                            key={id}
                            type="button"
                            variant={selected ? 'tagActive' : 'tag'}
                            size="tag"
                            onClick={() => toggleInterest(id)}
                            disabled={!selected && interests.length >= 5}
                            aria-pressed={selected}
                          >
                            <span aria-hidden="true">{interest.icon}</span>{interest.label}
                          </Button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
              <p className="mt-6 text-center text-sm font-medium text-primary">{interests.length} of 3–5 selected</p>
            </div>
          )}

          {step === 5 && (
            <form id="profile-form" onSubmit={handleSubmit} className="animate-fade-in space-y-7">
              <div className="text-center">
                <p className="mb-2 text-sm font-semibold uppercase text-primary">Last step</p>
                <h1 className="font-display text-3xl font-light text-foreground sm:text-4xl">Create your profile</h1>
                <p className="mt-3 text-sm text-muted-foreground">Tell people who they will be meeting in Porto.</p>
              </div>

              <div className="flex items-center gap-5 rounded-lg border border-border bg-card p-4">
                <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} className="h-20 w-20 shrink-0 overflow-hidden border-dashed" aria-label="Upload profile photo">
                  {photo ? <img src={photo} alt="Profile preview" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
                </Button>
                <div>
                  <Label>Profile photo <span className="text-destructive">*</span></Label>
                  <p className="mt-1 text-sm text-muted-foreground">Upload a high-resolution photo of you. No avatars allowed.</p>
                  <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => fileRef.current?.click()}>{photo ? 'Change photo' : 'Upload photo'}</Button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => handlePhoto(event.target.files?.[0])} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="firstName">First name *</Label><Input id="firstName" value={firstName} onChange={event => setFirstName(event.target.value)} maxLength={60} required /></div>
                <div><Label htmlFor="lastName">Last name *</Label><Input id="lastName" value={lastName} onChange={event => setLastName(event.target.value)} maxLength={60} required /></div>
                <div><Label htmlFor="email">Email address *</Label><Input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={120} required /></div>
                <div><Label htmlFor="password">Password *</Label><Input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /><p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p></div>
                <div><Label htmlFor="dob">Date of birth *</Label><Input id="dob" type="date" value={dob} onChange={event => setDob(event.target.value)} max={maxDob} required /><p className="mt-1 text-xs text-muted-foreground">You must be 18 or older.</p></div>
                <div><Label htmlFor="nationality">Nationality *</Label><TypeaheadSelect id="nationality" value={nationality} onChange={setNationality} placeholder="Type a nationality" options={NATIONALITIES.map(item => ({ value: item.name, label: item.name, leading: item.flag, sub: item.country, searchText: `${item.country} ${item.code}` }))} emptyText="No matching nationality" /></div>
                <div><Label htmlFor="location">Location *</Label><TypeaheadSelect id="location" value={location} onChange={value => { setLocation(value); setNeighborhood(''); }} showChevron placeholder="Select a city" options={CITIES.map(city => ({ value: city, label: city }))} emptyText="No matching cities" /></div>
                <div><Label htmlFor="neighborhood">Neighbourhood *</Label>{CITY_NEIGHBORHOODS[location] ? <TypeaheadSelect id="neighborhood" value={neighborhood} onChange={setNeighborhood} placeholder="Select a neighbourhood" options={CITY_NEIGHBORHOODS[location].map(item => ({ value: item, label: item }))} emptyText="No matching neighbourhoods" /> : <Input id="neighborhood" value={neighborhood} onChange={event => setNeighborhood(event.target.value)} disabled={!location} required />}</div>
              </div>
            </form>
          )}
        </section>

        <footer className="mt-8 flex items-center gap-3 border-t border-border pt-5">
          {step > 0 && <Button type="button" variant="ghost" onClick={() => setStep(previous => previous - 1)}><ArrowLeft aria-hidden="true" /> Back</Button>}
          {step < 5 ? (
            <Button type="button" size="lg" onClick={next} className="ml-auto rounded-lg">
              Add my details
            </Button>
          ) : (
            <Button type="submit" form="profile-form" size="lg" className="ml-auto rounded-lg" disabled={submitting}><Sparkles aria-hidden="true" /> Finish onboarding</Button>
          )}
        </footer>
      </div>
    </main>
  );
};

export default Onboarding;