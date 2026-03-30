import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline:     "text-foreground border-border",
        // Order-status variants matching existing badge-* classes
        pending:     "bg-amber-100  text-amber-800  border-amber-200",
        accepted:    "bg-blue-100   text-blue-800   border-blue-200",
        preparing:   "bg-purple-100 text-purple-800 border-purple-200",
        completed:   "bg-green-100  text-green-800  border-green-200",
        cancelled:   "bg-red-100    text-red-800    border-red-200",
        // Dark theme variants
        "dark-pending":   "bg-amber-500/20  text-amber-300  border-amber-500/30",
        "dark-preparing": "bg-purple-500/20 text-purple-300 border-purple-500/30",
        "dark-completed": "bg-green-500/20  text-green-300  border-green-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
