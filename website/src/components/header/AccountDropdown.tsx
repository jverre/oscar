import { LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium">{currentUser?.name || 'User'}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4 text-sage-green-600" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}