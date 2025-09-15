import { LogOut } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../ui/navigation-menu'

interface AccountDropdownProps {
  currentUser: {
    userId: string
    email: string | null
    name: string | null
  } | null | undefined
  onSignOut: () => void
}

export function AccountDropdown({ currentUser, onSignOut }: AccountDropdownProps) {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50">
            Account
          </NavigationMenuTrigger>
          <NavigationMenuContent className="px-0 py-0">
            <div>
              <div className="py-2 m-0 px-2 space-y-1 border-b">
                <p className="text-xs py-0 text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium">{currentUser?.name || 'User'}</p>
              </div>
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-2 py-2 px-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-sage-green-600" />
                Sign out
              </button>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}