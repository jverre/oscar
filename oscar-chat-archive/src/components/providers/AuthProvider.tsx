"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useSession, SessionProvider } from 'next-auth/react';
import { Id } from '../../../convex/_generated/dataModel';

interface AuthContextType {
  userId: Id<"users"> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  
  console.log("AuthContextProvider - status:", status);
  console.log("AuthContextProvider - session:", session);
  console.log("AuthContextProvider - hostname:", typeof window !== 'undefined' ? window.location.hostname : 'SSR');
  
  // Log all cookies to debug
  if (typeof window !== 'undefined') {
    console.log("AuthContextProvider - all cookies:", document.cookie);
    console.log("AuthContextProvider - parsed cookies:", document.cookie.split(';').map(c => c.trim()));
  }
  
  return (
    <AuthContext.Provider value={{
      userId: session?.user?.id as Id<"users"> | null,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
