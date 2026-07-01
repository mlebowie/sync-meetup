import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Sparkles } from 'lucide-react';
import { ONBOARDING_INTERESTS, saveUserProfile, clearUserProfile, UserProfile } from '@/lib/userProfile';
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

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
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
    if (!firstName || !lastName || !email || interests.length === 0) {
      toast({ title: 'A few more details', description: 'Name, email and at least one interest are required.' });
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
              <p className="font-semibold text-foreground">Profile photo</p>
              <p className="text-sm text-muted-foreground">PNG or JPG, up to 4MB.</p>
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
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={60} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={60} required />
            </div>
          </div>

          {/* Email + DOB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} required />
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </div>
          </div>

          {/* Location + neighborhood */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location (city)</Label>
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
              <Label htmlFor="neighborhood">Neighborhood</Label>
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
            <Label htmlFor="nationality">Nationality</Label>
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
            <Label className="text-sm font-semibold text-foreground mb-3 block">
              Pick your interests
            </Label>
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
            <p className="text-xs text-muted-foreground mt-2">Pick at least one.</p>
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
