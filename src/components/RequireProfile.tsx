import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getUserProfile } from '@/lib/userProfile';

/**
 * Member-only pages. Logged-out visitors go to /login instead of seeing the
 * sample profile. A signed-in account whose profile is still loading waits for it.
 */
const RequireProfile = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<'ready' | 'waiting' | 'guest'>(() =>
    getUserProfile() ? 'ready' : 'waiting',
  );

  useEffect(() => {
    const onChanged = () => setState(getUserProfile() ? 'ready' : 'guest');
    window.addEventListener('sync:profile-changed', onChanged);

    if (!getUserProfile()) {
      supabase.auth.getSession().then(({ data }) => {
        if (getUserProfile()) setState('ready');
        else if (!data.session) setState('guest');
        // Signed in: AuthProfileSync is loading the profile; wait for it.
      });
    }
    return () => window.removeEventListener('sync:profile-changed', onChanged);
  }, []);

  if (state === 'guest') return <Navigate to="/login" replace />;
  if (state === 'waiting') return null;
  return <>{children}</>;
};

export default RequireProfile;
