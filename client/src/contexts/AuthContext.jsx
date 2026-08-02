import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

// Profile dianggap lengkap jika minimal punya full_name, phone, education
const checkProfileComplete = (data) => {
  if (!data) return false;
  return !!(data.full_name && data.phone && data.education && data.major);
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = async (userId) => {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data);
      localStorage.setItem('userProfile', JSON.stringify(data));
    } else {
      setProfile(null);
    }
    setProfileLoaded(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setLoading(false); setProfileLoaded(true); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfileLoaded(true); }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mark loading false after profile attempt
  useEffect(() => {
    if (user !== undefined) setLoading(false);
  }, [user, profile]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) console.error("Error signing in with Google:", error.message);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
    setProfile(null);
    setProfileLoaded(false);
    localStorage.removeItem('userProfile');
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const isProfileComplete = checkProfileComplete(profile);

  const value = {
    session,
    user,
    profile,
    setProfile,
    refreshProfile,
    signInWithGoogle,
    signOut,
    isProfileComplete,
    profileLoaded,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
