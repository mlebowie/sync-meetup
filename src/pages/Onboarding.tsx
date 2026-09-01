import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Sparkles } from 'lucide-react';
import { ONBOARDING_INTERESTS, saveUserProfile, clearUserProfile, UserProfile, calculateAge } from '@/lib/userProfile';
import { useToast } from '@/hooks/use-toast';
import { TypeaheadSelect } from '@/components/TypeaheadSelect';
import { CITIES, CITY_NEIGHBORHOODS, NATIONALITIES } from '@/lib/onboardingData';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
r.onerror = rej;
    r.readAsDataURL(file);
  });

// Latest birthdate a user may select — anything after this means they are under 18.
const maxDob = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [nationality, setNationality] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (id: string) =>
    setInterests(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handlePhoto = async (f?: File) => {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast({ title: 'Photo too large', description: 'Pick an image under 4MB.', variant: 'destructive' });
      return;
    }
    setPhoto(await fileToDataUrl(f));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !photo ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !dob ||
      !location ||
      !neighborhood ||
      !nationality ||
      interests.length === 0
    ) {
      toast({ title: 'A few more details', description: 'All fields are required, including at least one interest.' });
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
    };
    saveUserProfile(profile);
    toast({ title: `Welcome, ${profile.firstName}!`, description: 'Your feed is being personalized.' });
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl px-4 md:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => { clearUserProfile(); navigate('/', { replace: true }); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Back to guest homepage"
          >
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">Sync</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { clearUserProfile(); navigate('/', { replace: true }); }}
          >
            ← Back to guest view
          </Button>
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-light text-foreground mb-2">
          Let's set up your profile
        </h1>
        <p className="text-muted-foreground mb-8">
          A few details so we can match you with events and people who fit.
        </p>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-7">
          {/* Photo */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-24 w-24 rounded-full overflow-hidden bg-secondary border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
              aria-label="Upload profile photo"
            >
              {photo ? (
                <img src={photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-7 w-7 text-muted-foreground" />
              )}
            </button>
            <div>
              <p className="font-semibold text-foreground">
                Profile photo <span className="text-destructive">*</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Upload a high-resolution photo of you. No avatars allowed.
              </p>
              <p className="text-xs text-muted-foreground">PNG or JPG, up to 4MB.</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
                {photo ? 'Change photo' : 'Upload photo'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handlePhoto(e.target.files?.[0])}
              />
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name <span className="text-destructive">*</span></Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={60} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last name <span className="text-destructive">*</span></Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={60} required />
            </div>
          </div>

          {/* Email + password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} required />
            </div>
            <div>
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">At least 8 characters.</p>
            </div>
          </div>

          {/* DOB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
              <Label htmlFor="dob">Date of birth <span className="text-destructive">*</span></Label>
              <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} max={maxDob} required />
              <p className="text-xs text-muted-foreground mt-1">You must be 18 or older to join.</p>
            </div>
          </div>

          {/* Location + neighborhood */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location (city) <span className="text-destructive">*</span></Label>
              <TypeaheadSelect
                id="location"
                value={location}
                onChange={(v) => {
                  setLocation(v);
                  // Reset neighborhood when city changes to one with its own list
                  if (CITY_NEIGHBORHOODS[v]) setNeighborhood('');
                }}
                allowFreeText
                placeholder="Start typing… e.g. Porto"
                options={CITIES.map(c => ({ value: c, label: c }))}
                emptyText="Keep typing — we'll add more cities soon"
              />
            </div>
            <div>
              <Label htmlFor="neighborhood">Neighborhood <span className="text-destructive">*</span></Label>
              {CITY_NEIGHBORHOODS[location] ? (
                <TypeaheadSelect
                  id="neighborhood"
                  value={neighborhood}
                  onChange={setNeighborhood}
                  placeholder={`Pick a ${location} neighborhood`}
                  options={CITY_NEIGHBORHOODS[location].map(n => ({ value: n, label: n }))}
                  emptyText="No matching neighborhoods"
                />
              ) : (
                <Input
                  id="neighborhood"
                  placeholder={location ? 'e.g. Cedofeita' : 'Pick a city first'}
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  maxLength={80}
                  disabled={!location}
                />
              )}
            </div>
          </div>

          {/* Nationality */}
          <div>
            <Label htmlFor="nationality">Nationality <span className="text-destructive">*</span></Label>
            <TypeaheadSelect
              id="nationality"
              value={nationality}
              onChange={setNationality}
              placeholder="Type a nationality or country"
              options={NATIONALITIES.map(n => ({
                value: n.name,
                label: n.name,
                leading: n.flag,
                sub: n.country,
                searchText: `${n.country} ${n.code}`,
              }))}
              emptyText="No matching nationality"
            />
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <Label className="text-sm font-semibold text-foreground">
                Pick your interests <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">Pick at least one.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_INTERESTS.map(i => (
                <Button
                  key={i.id}
                  type="button"
                  variant={interests.includes(i.id) ? 'tagActive' : 'tag'}
                  size="tag"
                  onClick={() => toggleInterest(i.id)}
                >
                  <span className="mr-1">{i.icon}</span>
                  {i.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="hero" size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Submit & enter Sync
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
