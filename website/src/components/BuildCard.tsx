import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface BuildCardProps {
  title: string
  icon: LucideIcon
  onClick?: () => void
  className?: string
  comingSoon?: boolean
}

export function BuildCard({ title, icon: Icon, onClick, className, comingSoon = false }: BuildCardProps) {
  const cardId = `build-card-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <Card
      className={cn(
        "relative h-fit w-full shrink-0 grow md:h-[140px]",
        "dark:bg-[hsl(218,_13%,_6%,_.95)] bg-cream-50/80",
        "flex items-center justify-center overflow-clip rounded-sm p-2",
        "md:max-h-[140px] md:!h-[140px]",
        "border-sage-green-200/80",
        "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
        "shadow-[8px_8px_0_rgba(107,122,107,0.1),-8px_-8px_0_rgba(107,122,107,0.1)]",
        "group",
        className
      )}
      onClick={comingSoon ? undefined : onClick}
    >
      {/* Diagonal lines background pattern */}
      <svg className="pointer-events-none absolute inset-0 [z-index:-1] size-full select-none text-sage-green-400 opacity-60">
        <defs>
          <pattern
            id={`diagonal-lines-${cardId}`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1.5"></line>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#diagonal-lines-${cardId})`}></rect>
      </svg>

      <CardContent className="relative flex flex-col justify-between size-full p-6">
        {/* Icon positioned in top-left area */}
        <div className={cn(
          "flex justify-start",
          comingSoon && "group-hover:opacity-0 transition-opacity duration-300"
        )}>
          <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-sage-green-100 dark:bg-sage-green-800/50">
            <Icon className="w-5 h-5 text-sage-green-700 dark:text-sage-green-300" />
          </div>
        </div>

        {/* Title positioned in bottom-left */}
        <div className={cn(
          "flex justify-start",
          comingSoon && "group-hover:opacity-0 transition-opacity duration-300"
        )}>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>

        {/* Coming Soon text for coming soon cards */}
        {comingSoon && (
          <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs font-medium text-sage-green-700 dark:text-sage-green-300 bg-cream-50/90 dark:bg-[hsl(218,_13%,_6%,_.90)] px-2 py-1 rounded-sm">
              Coming Soon
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}