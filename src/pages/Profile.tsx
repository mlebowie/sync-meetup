import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Globe, Users, Pencil, LogOut } from 'lucide-react';
import Header from '@/components/Header';
import GroupsSection from '@/components/GroupsSection';
import EditProfileDialog from '@/components/EditProfileDialog';
import { Button } from '@/components/ui/button';
import { getUserProfile, saveUserProfile, clearUserProfile, ONBOARDING_INTERESTS, DEFAULT_PROFILE, calculateAge, UserProfile } from '@/lib/userProfile';
import { useSocial } from '@/context/SocialContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile() ?? DEFAULT_PROFILE);
  const [isDefault, setIsDefault] = useState<boolean>(() => !getUserProfile());
  const [editOpen, setEditOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { following, followers } = useSocial();
  const connectionsCount = new Set([...following, ...followers]).size;

  const handleLogout = async () => {
    // Sign out from backend auth when available
    const { error } = await supabase.auth.signOut();
    if (error && error.message !== 'Auth session missing!') {
      toast({ title: 'Error signing out', description: error.message, variant: 'destructive' });
      return;
    }
    // Clear local guest profile and persisted state
    clearUserProfile();
    toast({ title: 'Signed out', description: 'See you soon!' });
    navigate('/');
  };

  const handleSaveProfile = (p: UserProfile) => {
    setProfile(p);
    setIsDefault(false);
    saveUserProfile(p);
  };


  const interests = ONBOARDING_INTERESTS.filter(i => profile.interests.includes(i.id));
  const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 md:px-6 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Log out
          </Button>
        </div>

        {/* Profile header */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-10">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-muted ring-4 ring-primary/10 shrink-0">
            {profile.photo ? (
              <img src={profile.photo} alt={`${profile.firstName} ${profile.lastName}`} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit profile
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[profile.neighborhood, profile.location].filter(Boolean).join(', ')}
              </span>
              {age !== null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {age} years old
                </span>
              )}
              {profile.nationality && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {profile.nationality}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Link
                to="/profile/connections"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                {connectionsCount} Connections
              </Link>
              <span className="text-xs text-muted-foreground">
                {followers.size} followers · {following.size} following
              </span>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {interests.map(i => (
                  <span key={i.id} className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                    {i.icon} {i.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Calendar entry point */}
        <Link
          to="/calendar"
          className="flex items-center justify-between gap-3 p-4 rounded-xl border bg-card hover:shadow-card-hover transition-shadow mb-10"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">My calendar</p>
              <p className="text-xs text-muted-foreground">Coming up, past events and your wishlist</p>
            </div>
          </div>
          <span className="text-sm text-primary font-medium">View →</span>
        </Link>


        {/* Default profile hint */}
        {isDefault && (
          <div className="mt-10 p-4 rounded-xl border bg-secondary/30 text-center">
            <p className="text-sm text-muted-foreground">
              This is a preview profile. <Link to="/onboarding" className="text-primary font-medium hover:underline">Create your own</Link> to unlock a personalized feed.
            </p>
          </div>
        )}

        {/* Your crews - from tagged connections & recurring co-attendance */}
        <div className="mt-10 -mx-4 md:-mx-6">
          <GroupsSection />
        </div>
      </main>
      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSaved={handleSaveProfile}
      />
    </div>
  );
};

export default Profile;
