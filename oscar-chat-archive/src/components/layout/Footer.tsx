"use client";

import { useAuthenticatedQuery } from "@/hooks/useAuthenticatedQuery";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { SignInButton } from "@/components/auth/SignInButton";
import { useTabContext } from "@/contexts/TabContext";
import { useRouter } from "next/navigation";

export function Footer() {
  const { userId, isLoading } = useAuth();
  const { data: session } = useSession();
  const user = useAuthenticatedQuery(api.users.current); // TODO: Fix with NextAuth integration
  const { clearAllTabs } = useTabContext();
  const router = useRouter();

  const [showCallout, setShowCallout] = useState(false);
  const [showSignOutMenu, setShowSignOutMenu] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const signInRef = useRef<HTMLDivElement>(null);
  const signOutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (signInRef.current && !signInRef.current.contains(event.target as Node)) {
        setShowCallout(false);
      }
      if (signOutRef.current && !signOutRef.current.contains(event.target as Node)) {
        setShowSignOutMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignInClick = () => {
    console.log("Footer signin clicked, toggling callout");
    setShowCallout(!showCallout);
  };

  const handleGoogleSignIn = () => {
    console.log("Footer handleGoogleSignIn called, closing callout");
    setShowCallout(false);
  };

  const handleSignOutClick = () => {
    setShowSignOutMenu(!showSignOutMenu);
  };

  return (
    <div className="relative">
      {/* Sign-in Callout */}
      {showCallout && (
        <div 
          ref={signInRef}
          className="absolute bottom-full right-4 mb-2 rounded-md shadow-lg p-3 min-w-[200px]"
          style={{ 
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--sidebar)'
          }}
        >
          <div className="text-xs font-normal text-sidebar-foreground mb-2">Sign in to Oscar Chat</div>
          <SignInButton onSignInStart={handleGoogleSignIn} />
          {/* Arrow pointing down */}
          <div 
            className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
            style={{ borderTopColor: 'var(--border-subtle)' }}
          ></div>
        </div>
      )}

      {/* Sign-out Menu */}
      {showSignOutMenu && (
        <div 
          ref={signOutRef}
          className="absolute bottom-full right-4 mb-2 rounded-md shadow-lg p-1 min-w-[120px]"
          style={{ 
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--background)'
          }}
        >
          <button
            onClick={() => {
              clearAllTabs();
              signOut();
              setShowSignOutMenu(false);
              router.push('/');
            }}
            className="w-full px-3 py-1.5 text-left text-xs transition-colors"
            style={{ 
              color: 'var(--status-error)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Sign out
          </button>
          {/* Arrow pointing down */}
          <div 
            className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
            style={{ borderTopColor: 'var(--border-subtle)' }}
          ></div>
        </div>
      )}
      
      <div className="h-[22px] border-t flex items-center justify-end px-4" style={{ backgroundColor: 'var(--surface-primary)', borderTopColor: 'var(--border-subtle)', borderTopWidth: '1px' }}>
        {!isHydrated ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : isLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : !userId ? (
          <div 
            // ref={buttonRef}
            onClick={handleSignInClick}
            className="text-xs cursor-pointer hover:opacity-80 flex items-center font-semibold" 
            style={{ backgroundColor: 'var(--status-error)', color: 'var(--text-primary)', paddingLeft: '10px', paddingRight: '10px', height: '100%' }}
          >
            Sign In
          </div>
        ) : (
          <div 
            onClick={handleSignOutClick}
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          >
            {session?.user?.email}
          </div>
        )}
      </div>
    </div>
  );
}