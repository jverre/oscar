import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useQuery } from "convex/react";

export interface AuthContext {
  isAuthenticated: boolean;
  user: string | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

export function useAuth(): AuthContext {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  // Get current user from Convex
  const currentUser = useQuery(api.auth.currentUser);
  console.log("User", currentUser);
  return {
    isAuthenticated: isAuthenticated ?? false,
    user: currentUser?.email ?? currentUser?.name ?? null,
    isLoading,
    login: () => {
      void signIn("github");
    },
    logout: () => {
      void signOut();
    },
  };
}