import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureProfileForSession } from '@/lib/authProfile';

/** Keeps the local profile in step with the signed-in account. Renders nothing. */
const AuthProfileSync = () => {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => ensureProfileForSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      ensureProfileForSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
};

export default AuthProfileSync;
