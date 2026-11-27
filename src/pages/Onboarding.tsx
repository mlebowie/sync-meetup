import { useMemo, useRef, useState } from 'react';
import { pillField, primaryCta, revealDelay, revealItem, secondaryLink } from '@/lib/ctaStyles';
import ConsentFields from '@/components/ConsentFields';
import { prepareProfilePhoto } from '@/lib/profilePhoto';
import syncWordmark from '@/assets/sync-wordmark-v2.png';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
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
import { resetFilterTour } from '@/lib/filterTour';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

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
  // The "Find your flow" quiz is optional: skipping it goes straight to interests, with no social style saved.
  const [skippedQuiz, setSkippedQuiz] = useState(false);
  // Required GDPR consent before an account is created.
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  // Optional: emails about the test (new features, short feedback requests). Off unless ticked.
  const [emailOptIn, setEmailOptIn] = useState(false);

  const completePreferences = answers.planning && answers.groupSetting && answers.connectionGoal
    ? answers as SocialPreferences
    : undefined;
  const socialStyle = completePreferences ? determineSocialStyle(completePreferences) : undefined;
  const styleDetails = socialStyle ? SOCIAL_STYLE_DETAILS[socialStyle] : undefined;
  const currentQuestion = step < QUESTIONS.length ? QUESTIONS[step] : undefined;

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
    try {
      setPhoto(await prepareProfilePhoto(file));
    } catch {
      toast({ title: "Couldn't read that photo", description: 'Try a JPEG or PNG photo instead.', variant: 'destructive' });
    }
  };

  const next = () => {
    if (currentQuestion && !answers[currentQuestion.key]) return;
    if (step === 4 && interests.length < 3) {
      toast({ title: 'Choose at least three', description: 'Three to five interests help us make useful recommendations.' });
      return;
    }
    setStep(previous => Math.min(previous + 1, 6));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!photo || !firstName || !lastName || !email || !password || !dob || !location || !neighborhood || !nationality) {
      toast({ title: 'A few more details', description: 'Complete every required field to create your profile.' });
      return;
    }
    if (!privacyAccepted) {
      toast({ title: 'Please accept the privacy policy', description: 'Tick the box to agree to how SYNC handles your data.' });
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
      socialPreferences: skippedQuiz ? undefined : completePreferences,
      socialStyle: skippedQuiz ? undefined : socialStyle,
      onboardedAt: new Date().toISOString(),
      // When consent was given, so it can be shown later if asked (GDPR Art. 7(1)).
      privacyAcceptedAt: new Date().toISOString(),
      // Only when ticked, with when it was given, so it can be shown later and withdrawn.
      ...(emailOptIn ? { emailOptInAt: new Date().toISOString() } : {}),
    };

    if (DEMO_MODE) {
      // Demo mode: the profile stays on this device and no account is created on the server.
      try {
        saveUserProfile(profile);
      } catch {
        toast({ title: 'Could not save your profile', description: 'Try a different photo.', variant: 'destructive' });
        return;
      }
      resetFilterTour();
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
        data: {
          first_name: profile.firstName,
          last_name: profile.lastName,
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
    resetFilterTour();
    if (!data.session) {
      // Email confirmation is on: the account exists but needs the link in the inbox.
      toast({ title: 'Check your email', description: `We sent a confirmation link to ${profile.email}.` });
    } else {
      toast({ title: `Welcome, ${profile.firstName}!`, description: 'Your recommendations are ready.' });
    }
    navigate('/', { replace: true });
  };

  // Progress runs across every onboarding step: three questions, result, interests, how connections work, profile.
  const flowProgress = [14, 29, 43, 57, 71, 86, 100][step] ?? 100;
  const flowTop = (
    <>
      <header className="mb-6 flex justify-center">
        {/* The wordmark takes people home, as "Return home" used to. */}
        <button
          type="button"
          onClick={leaveOnboarding}
          aria-label="SYNC, return home"
          className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={syncWordmark} alt="" className="h-8 w-auto" />
        </button>
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

  const back = () => {
    // Back from interests after skipping the quiz returns to its first question.
    if (step === 4 && skippedQuiz) {
      setSkippedQuiz(false);
      setStep(0);
      return;
    }
    setStep(previous => previous - 1);
  };

  const skipQuiz = () => {
    setSkippedQuiz(true);
    setStep(4);
  };

  const backLink = (
    <button
      type="button"
      onClick={back}
      className={secondaryLink}
    >
      Back
    </button>
  );

  // The three "Find your flow" questions and the result screen use their own design.
  if (step <= 3) {
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


    return (
      <main className="min-h-screen bg-[#FCFAF3] font-sans text-[#57514D]">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          {flowTop}

          <section aria-live="polite">
            {currentQuestion && (
              <div key={currentQuestion.key} className="animate-fade-in">
                <p className="text-center text-sm leading-5 text-[#974B35]">Question {step + 1} of 3</p>
                <h1 id="flow-question" className="mt-2 text-center font-display text-[22px] font-light tracking-[0.015em] leading-7 sm:text-[44px] sm:leading-[52px] text-[#A25139]">
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
                          // Selected: sage at 80% (as on every selection in SYNC); no radio circle.
                          'flex w-full items-center rounded-[20px] p-5 sm:p-6 text-left shadow-[0_2px_12px_-4px_rgba(49,35,27,0.10)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          selected ? 'bg-[#9EAFAB]/80' : 'bg-white',
                        )}
                      >
                        {/* Label only: the answers are short enough to stand on their own. */}
                        <span className={cn('flex-1 text-base font-bold', selected ? 'text-[#1F110C]' : 'text-[#57514D]')}>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex w-full flex-col items-center">
                  <Button type="button" onClick={next} disabled={!answers[currentQuestion.key]} className={primaryCta}>
                    Next
                  </Button>
                  {step > 0 && backLink}
                  {step === 0 && (
                    <button
                      type="button"
                      onClick={skipQuiz}
                      className={secondaryLink}
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 3 && styleDetails && (
              <div className="animate-fade-in text-center">
                <p className="text-sm leading-5 text-[#974B35]">Your starting point</p>
                <h1 className="mt-2 font-display text-[22px] font-light tracking-[0.015em] leading-7 sm:text-[44px] sm:leading-[52px] text-[#A25139]">{styleDetails.name}</h1>
                <p className="mx-auto mt-6 max-w-md text-base leading-6 text-[#57514D]">{styleDetails.description}</p>
                <div className="mt-8 flex w-full flex-col items-center">
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
    <main className="min-h-screen bg-[#FCFAF3] font-sans text-[#57514D]">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {flowTop}

        <section aria-live="polite">
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="mb-7 text-center">
                <h1 className="font-display text-[22px] leading-7 font-light tracking-[0.015em] text-foreground sm:text-4xl">Choose 3–5 interests</h1>
                <p className="mt-3 text-sm text-muted-foreground">Personalise your homefeed with events you actually want to go to.</p>
              </div>
              <div className="space-y-6">
                {INTEREST_GROUPS.map(group => (
                  <fieldset key={group.label}>
                    {/* Same size as the interest pills (15px). */}
                    <legend className="mb-2.5 text-[15px] font-semibold uppercase text-muted-foreground">{group.label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {group.interestIds.map(id => {
                        const interest = interestsById.get(id);
                        if (!interest) return null;
                        const selected = interests.includes(id);
                        return (
                          // Larger than the app's small tags so they read well next to the 16px buttons;
                          // selected fills sage at 80%.
                          <Button
                            key={id}
                            type="button"
                            variant="tag"
                            size="tag"
                            className={cn(
                              'h-10 gap-1.5 px-4 text-[15px]',
                              selected && 'bg-[#9EAFAB]/80 text-[#1F110C] hover:bg-[#9EAFAB]/80 hover:text-[#1F110C]',
                            )}
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
              <p className="mt-6 text-center text-sm font-medium text-primary">{interests.length} of 5 selected</p>
            </div>
          )}

          {/* How connections work: the two ideas (connections, your private tags), before the profile. */}
          {step === 5 && (
            <div className="animate-fade-in">
              <div className="mb-8 text-center">
                <h1 className="font-display text-[22px] leading-7 font-light tracking-[0.015em] text-foreground sm:text-4xl">
                  Connect with new people
                </h1>
              </div>
              <ol className="mx-auto max-w-md space-y-6">
                {[
                  'Attend your first event.',
                  'Tag the people you spoke and connected with in person.',
                  'If they tag you back, a conversation unlocks and you can make plans to meet again.',
                ].map((line, i) => (
                  // Gentle reveal: the lines arrive one after another.
                  <li key={line} className={`flex gap-4 ${revealItem}`} style={revealDelay(i)}>
                    <span className="w-6 shrink-0 text-right text-2xl font-light leading-7 text-[#C1694F]">{i + 1}</span>
                    <span className="text-base leading-7 text-foreground">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step === 6 && (
            <form id="profile-form" onSubmit={handleSubmit} className="animate-fade-in space-y-7">
              <div className="text-center">
                <h1 className="font-display text-[22px] leading-7 font-light tracking-[0.015em] text-foreground sm:text-4xl">Create your profile</h1>
                <p className="mt-3 text-sm text-muted-foreground">Tell people who they will be meeting in Porto.</p>
              </div>

              <div className="flex items-center gap-5 rounded-[20px] bg-white p-6 shadow-[0_2px_12px_-4px_rgba(49,35,27,0.10)]">
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
                <div><Label htmlFor="firstName">First name *</Label><Input className={pillField} id="firstName" value={firstName} onChange={event => setFirstName(event.target.value)} maxLength={60} required /></div>
                <div><Label htmlFor="lastName">Last name *</Label><Input className={pillField} id="lastName" value={lastName} onChange={event => setLastName(event.target.value)} maxLength={60} required /></div>
                <div><Label htmlFor="email">Email address *</Label><Input className={pillField} id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={120} required /></div>
                <div><Label htmlFor="password">Password *</Label><Input className={pillField} id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /><p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p></div>
                <div><Label htmlFor="dob">Date of birth *</Label><Input className={pillField} id="dob" type="date" value={dob} onChange={event => setDob(event.target.value)} max={maxDob} required /><p className="mt-1 text-xs text-muted-foreground">You must be 18 or older.</p></div>
                <div><Label htmlFor="nationality">Nationality *</Label><TypeaheadSelect pill id="nationality" value={nationality} onChange={setNationality} placeholder="Type a nationality" options={NATIONALITIES.map(item => ({ value: item.name, label: item.name, leading: item.flag, sub: item.country, searchText: `${item.country} ${item.code}` }))} emptyText="No matching nationality" /></div>
                <div><Label htmlFor="location">Location *</Label><TypeaheadSelect pill id="location" value={location} onChange={value => { setLocation(value); setNeighborhood(''); }} showChevron placeholder="Select a city" options={CITIES.map(city => ({ value: city, label: city }))} emptyText="No matching cities" /></div>
                <div><Label htmlFor="neighborhood">Neighbourhood *</Label>{CITY_NEIGHBORHOODS[location] ? <TypeaheadSelect pill id="neighborhood" value={neighborhood} onChange={setNeighborhood} placeholder="Select a neighbourhood" options={CITY_NEIGHBORHOODS[location].map(item => ({ value: item, label: item }))} emptyText="No matching neighbourhoods" /> : <Input className={pillField} id="neighborhood" value={neighborhood} onChange={event => setNeighborhood(event.target.value)} disabled={!location} required />}</div>
              </div>

              {/* Required privacy consent and the optional email opt-in, both unticked by default. */}
              <ConsentFields
                idPrefix="onboarding"
                privacyAccepted={privacyAccepted}
                onPrivacyAccepted={setPrivacyAccepted}
                emailOptIn={emailOptIn}
                onEmailOptIn={setEmailOptIn}
              />
            </form>
          )}
        </section>

        {/* On the "Connect with new people" screen the actions arrive last, after the three lines. */}
        <div
          key={step}
          className={`mt-8 flex w-full flex-col items-center ${step === 5 ? revealItem : ''}`}
          style={step === 5 ? revealDelay(3) : undefined}
        >
          {step === 4 ? (
            <Button type="button" onClick={next} className={primaryCta}>
              Next
            </Button>
          ) : step === 5 ? (
            <Button type="button" onClick={next} className={primaryCta}>
              Add my details
            </Button>
          ) : (
            <Button type="submit" form="profile-form" className={primaryCta} disabled={submitting}>
              Finish onboarding
            </Button>
          )}
          {backLink}
        </div>
      </div>
    </main>
  );
};

export default Onboarding;