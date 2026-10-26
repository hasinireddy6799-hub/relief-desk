import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  isAnonymous: boolean;
  isLoading: boolean;
  isResponder: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_ROLE_KEY = 'relief_desk_cached_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole) || 'citizen';
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile and role from Supabase
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from Supabase:', error.message);
        return;
      }

      if (data) {
        setProfile(data as Profile);
        const resolvedRole = (data.role as UserRole) || 'citizen';
        setRole(resolvedRole);
        localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, resolvedRole);
      }
    } catch (err) {
      console.warn('Network issue fetching profile, using cached role:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          if (mounted) {
            setSession(existingSession);
            setUser(existingSession.user);
            await loadProfile(existingSession.user.id);
          }
        } else {
          // If no session exists, perform anonymous sign-in so emergency SOS and reports work immediately
          try {
            const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
            if (anonError) {
              console.warn('Anonymous sign-in not available or failed:', anonError.message);
            } else if (anonData.session && mounted) {
              setSession(anonData.session);
              setUser(anonData.user);
              if (anonData.user) {
                await loadProfile(anonData.user.id);
              }
            }
          } catch (e) {
            console.warn('Offline or unable to reach auth server for anonymous sign-in:', e);
          }
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setRole('citizen');
          localStorage.removeItem(LOCAL_STORAGE_ROLE_KEY);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // After sign out, re-sign in anonymously so emergency access remains uninterrupted
    try {
      await supabase.auth.signInAnonymously();
    } catch {
      // offline fallback
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const isAnonymous = !user || !user.email || user.is_anonymous === true;
  const isResponder = ['volunteer', 'coordinator', 'admin'].includes(role);
  const isStaff = ['coordinator', 'admin'].includes(role);
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAnonymous,
        isLoading,
        isResponder,
        isStaff,
        isAdmin,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
