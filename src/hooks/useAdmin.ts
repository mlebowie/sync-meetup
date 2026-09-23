import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
}

/** True only when the signed-in account carries the admin role in the database. */
export function useAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({
    loading: true,
    userId: null,
    email: null,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        if (!cancelled) setState({ loading: false, userId: null, email: null, isAdmin: false });
        return;
      }
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (cancelled) return;
      setState({
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        isAdmin: (roles ?? []).some((r) => r.role === 'admin'),
      });
    };

    resolve();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      resolve();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
