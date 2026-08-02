import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

// Profile dianggap lengkap jika minimal punya full_name dan (phone atau education)
const checkProfileComplete = (data) => {
  if (!data) return false;
  return !!(data.full_name && (data.phone || data.education || data.major));
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = async (userId) => {
    if (!userId) return;
    const local = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Filter out null/undefined values from Supabase so they don't override localStorage
    const dbClean = data
      ? Object.fromEntries(Object.entries(data).filter(([, v]) => v != null))
      : {};

    const merged = { ...local, ...dbClean };
    setProfile(merged);
    if (Object.keys(merged).length > 0) {
      localStorage.setItem('userProfile', JSON.stringify(merged));
    }
    setProfileLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
        setProfileLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setProfileLoaded(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
