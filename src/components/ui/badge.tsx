import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none select-none",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-indigo-600 text-white shadow-2xs",
        secondary:
          "border border-slate-200 bg-slate-100 text-slate-700",
        destructive:
          "border border-rose-200 bg-rose-50 text-rose-700",
        outline:
          "text-slate-600 border border-slate-300",
        success:
          "border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold",
        warning:
          "border border-amber-200 bg-amber-50 text-amber-800 font-semibold",
        subtle:
          "bg-slate-100 text-slate-700 border border-slate-200/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
