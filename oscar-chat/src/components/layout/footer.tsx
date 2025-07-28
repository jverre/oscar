"use client";

import { useSession, signOut } from "next-auth/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Footer() {
  const { data: session } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: window.location.origin });
  };

  const handleSignIn = () => {
    window.location.href = "/signin";
  };

  return (
    <footer className="border-t border-border h-[22px] flex items-center justify-between px-3">
      <div className="flex items-center">
      </div>
      <div className="flex items-center">
        {session?.user?.email ? (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {session.user.email}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-xs h-7"
              >
                <LogOut className="mr-2 h-3 w-3" />
                Log out
              </Button>
            </PopoverContent>
          </Popover>
        ) : (
          <button 
            onClick={handleSignIn}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Sign in
          </button>
        )}
      </div>
    </footer>
  );
}