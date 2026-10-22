import type { Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { clearAllOfflineData } from '../../lib/offlineStorage';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Pořadové číslo posledního načítání profilu – pomalejší starší odpověď (např. po rychlém
  // odhlášení a přihlášení jiného účtu) nesmí přepsat novější
  const profileRequestRef = useRef(0);
  // Pro kterého uživatele je načtený profil – obnovení tokenu nebo návrat do záložky
  // (Supabase znovu hlásí SIGNED_IN) profil znovu nestahuje
  const profileUserIdRef = useRef<string | null>(null);

  // Načíst profil uživatele
  const loadProfile = async (userId: string) => {
    const requestId = ++profileRequestRef.current;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (requestId !== profileRequestRef.current) return;

      if (error) throw error;
      setProfile(data as Profile);
      profileUserIdRef.current = userId;
    } catch (error) {
      if (requestId !== profileRequestRef.current) return;
      console.error('Error loading profile:', error);
      setProfile(null);
      profileUserIdRef.current = null;
    }
  };

  // Refresh profilu (po update)
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  // Google OAuth sign in
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // Email/Password sign in
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  // Email/Password sign up
  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    profileUserIdRef.current = null;
    // Cache může obsahovat drafty odhlášeného uživatele včetně řešení úkolů (sdílené zařízení)
    clearAllOfflineData().catch((err) => console.warn('Nepodařilo se smazat offline data:', err));
  };

  // Sledovat změny autentizace. onAuthStateChange hlásí i INITIAL_SESSION (uloženou session
  // z localStorage), takže samostatné getSession() není potřeba.
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadProfile je stabilní funkce, spouští se pouze při mountu
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      const userId = session?.user.id ?? null;
      if (!userId) {
        profileRequestRef.current++;
        profileUserIdRef.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      // Profil stahovat jen při změně uživatele nebo jeho údajů, ne při každém obnovení tokenu
      const needsProfile = profileUserIdRef.current !== userId || event === 'USER_UPDATED';
      if (!needsProfile) {
        setLoading(false);
        return;
      }

      // loading končí až s profilem – chráněné stránky by jinak chvíli běžely bez něj
      loadProfile(userId).finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook pro použití auth contextu
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
