import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

