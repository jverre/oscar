import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "h-9 w-full border border-sage-green-200/80 bg-transparent px-3 py-1 text-sm outline-none transition-colors focus-visible:border-sage-green-400 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "rounded-sm",
        grid: "rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {}

function Input({ className, type, variant, ...props }: InputProps) {
  if (variant === "grid") {
    return (
      <div className="relative w-full">
        <input
          type={type}
          data-slot="input"
          className={cn(inputVariants({ variant }), className)}
          {...props}
        />
        {/* Corner circles */}
        <div className="absolute -top-1 -left-1 size-2 z-10 rounded-full border border-sage-green-200 bg-cream-50"></div>
        <div className="absolute -top-1 -right-1 size-2 z-10 rounded-full border border-sage-green-200 bg-cream-50"></div>
        <div className="relative bottom-1 -left-1 size-2 z-10 rounded-full border border-sage-green-200 bg-cream-50"></div>
        <div className="relative bottom-3 -mr-1 ml-auto size-2 z-10 rounded-full border border-sage-green-200 bg-cream-50"></div>
      </div>
    )
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input }
