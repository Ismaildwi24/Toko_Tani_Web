import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, Profile } from '@/store/authStore';

export function useAuth() {
  const { user, profile, loading, setSession, setLoading, clearSession } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    async function getInitialSession() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setSession(session.user, profileData as Profile);
        } else {
          clearSession();
        }
      } catch (error) {
        console.error('Error fetching initial session:', error);
        clearSession();
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setSession(session.user, profileData as Profile);
        } else {
          clearSession();
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        clearSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setSession, setLoading, clearSession]);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      clearSession();
    } catch (error) {
      console.error('Error signing out:', error);
      clearSession();
    }
  };

  return {
    user,
    profile,
    loading,
    signOut,
  };
}
