import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm transition-all duration-200",
      "placeholder:text-slate-400",
      "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none",
      "hover:border-slate-400",
      "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

