import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useQuery } from "convex/react";
import { createContext, useContext, ReactNode, useCallback } from "react";

export interface AuthContextType {
  isAuthenticated: boolean;
  user: string | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  // Get current user from Convex
  const currentUser = useQuery(api.auth.currentUser);

  const login = useCallback(() => {
    void signIn("github");
  }, [signIn]);

  const logout = useCallback(() => {
    void signOut();
  }, [signOut]);

  const value: AuthContextType = {
    isAuthenticated: isAuthenticated ?? false,
    user: currentUser?.email ?? currentUser?.name ?? null,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}