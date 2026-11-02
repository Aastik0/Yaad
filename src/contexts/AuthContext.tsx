"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AuthCredentialsSchema } from "@/lib/schemas";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = useMemo(() => isSupabaseConfigured(), []);

  // Listen for Supabase auth state changes and initial session
  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error: sessionError }) => {
      if (sessionError) {
        console.warn("Supabase getSession error:", sessionError.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);

      // Validate inputs
      const validation = AuthCredentialsSchema.safeParse({ email, password });
      if (!validation.success) {
        const msg = validation.error.issues[0]?.message || "Invalid email or password.";
        setError(msg);
        return { success: false, message: msg };
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        const msg = "Supabase is not configured. Running in Demo Mode.";
        setError(msg);
        return { success: false, message: msg };
      }

      setIsLoading(true);
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        });

        if (signInError) {
          let userMessage = signInError.message;
          if (signInError.message.includes("Invalid login credentials")) {
            userMessage = "Incorrect email or password. Please try again or create an account.";
          } else if (signInError.message.includes("Email not confirmed")) {
            userMessage = "Please check your inbox and confirm your email address before signing in.";
          }
          setError(userMessage);
          return { success: false, message: userMessage };
        }

        setUser(data.user);
        setSession(data.session);
        return { success: true };
      } catch (err: unknown) {
        const msg = (err as Error)?.message || "Failed to sign in. Please try again.";
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setError(null);

      // Validate inputs
      const validation = AuthCredentialsSchema.safeParse({ email, password });
      if (!validation.success) {
        const msg = validation.error.issues[0]?.message || "Invalid email or password.";
        setError(msg);
        return { success: false, message: msg };
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        const msg = "Supabase is not configured. Running in Demo Mode.";
        setError(msg);
        return { success: false, message: msg };
      }

      setIsLoading(true);
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return { success: false, message: signUpError.message };
        }

        // If auto-confirm is enabled or session exists
        if (data.session) {
          setUser(data.user);
          setSession(data.session);
          return { success: true };
        }

        // If email confirmation is required
        return {
          success: true,
          message: "Account created! Please check your email to confirm your account.",
        };
      } catch (err: unknown) {
        const msg = (err as Error)?.message || "Failed to create account. Please try again.";
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isConfigured,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [user, session, isLoading, isConfigured, error, signIn, signUp, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

