import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Globe, Users, Pencil } from 'lucide-react';
import { primaryCta } from '@/lib/ctaStyles';
import Header from '@/components/Header';
import GroupsSection from '@/components/GroupsSection';
import ActivityLogCard from '@/components/ActivityLogCard';
import EditProfileDialog from '@/components/EditProfileDialog';
import { Button } from '@/components/ui/button';
import { getUserProfile, saveUserProfile, clearUserProfile, backupUserProfile, ONBOARDING_INTERESTS, DEFAULT_PROFILE, calculateAge, UserProfile } from '@/lib/userProfile';
import { saveAccountProfile } from '@/lib/authProfile';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile() ?? DEFAULT_PROFILE);
  const [isDefault, setIsDefault] = useState<boolean>(() => !getUserProfile());
  const [editOpen, setEditOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Connections only: people you met at an event who tagged you back.
  const { connectionIds } = useActivityHistory();
  const connectionsCount = connectionIds.size;

  const handleLogout = async () => {
    // Save the latest profile to the account before signing out, so nothing is lost.
    const current = getUserProfile();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (current && userId) await saveAccountProfile(userId, current);

    // Sign out from backend auth when available
    const { error } = await supabase.auth.signOut();
    if (error && error.message !== 'Auth session missing!') {
      toast({ title: 'Error signing out', description: error.message, variant: 'destructive' });
      return;
    }
    // Sign this device out of the profile. It stays saved with the account,
    // and a backup is kept here so the next sign-in restores it.
    if (current) backupUserProfile(current);
    clearUserProfile();
    window.dispatchEvent(new Event('sync:profile-changed'));
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
              <h1 className="text-2xl font-light tracking-[0.015em]">{profile.firstName} {profile.lastName}</h1>
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
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {interests.map(i => (
                  <span key={i.id} className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                    {i.label}
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

        {/* Your activity log (moved here from the home page) */}
        <div className="mb-10 max-w-xl">
          <ActivityLogCard />
        </div>


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

        {/* Log out: the screen's main button, at the bottom, same size and colour as onboarding. */}
        <div className="mt-12 pb-6">
          <Button type="button" className={primaryCta} onClick={handleLogout}>
            Log out
          </Button>
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
