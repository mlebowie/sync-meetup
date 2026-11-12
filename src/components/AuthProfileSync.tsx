import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureProfileForSession, saveAccountProfile } from '@/lib/authProfile';
import { getUserProfile } from '@/lib/userProfile';

/**
 * Keeps the profile on this device in step with the signed-in account:
 * loads it on sign-in, and saves every local change (interests, edits,
 * onboarding) back to the account. Renders nothing.
 */
const AuthProfileSync = () => {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => ensureProfileForSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't await Supabase calls inside this callback; defer them.
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setTimeout(() => ensureProfileForSession(session), 0);
      }
    });

    const onSaved = async () => {
      const profile = getUserProfile();
      if (!profile) return;
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (userId) await saveAccountProfile(userId, profile);
    };
    window.addEventListener('sync:profile-saved', onSaved);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('sync:profile-saved', onSaved);
    };
  }, []);

  return null;
};

export default AuthProfileSync;
