import * as React from "react"

import { cn } from "@/lib/utils"

const labelVariants = {
  default: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(labelVariants.default, className)}
      {...props}
    />
  )
}

export { Label }