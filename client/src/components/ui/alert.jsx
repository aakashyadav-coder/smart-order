import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react"
import { cva } from "class-variance-authority"

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default:     "bg-background text-foreground border-border [&>svg]:text-foreground",
        destructive: "border-red-200 bg-red-50 text-red-800 [&>svg]:text-red-600",
        warning:     "border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600",
        success:     "border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600",
        info:        "border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
