import { cn } from "../lib/utils";

interface StatusBadgeProps {
  variant?: "default" | "promoted" | "buy" | "sell" | "status" | "role";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-zinc-800 text-zinc-200",
  promoted: "border border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  buy: "border border-green-500/30 bg-green-500/10 text-green-400",
  sell: "border border-red-500/30 bg-red-500/10 text-red-400",
  status: "bg-zinc-800 text-zinc-400",
  role: "border border-green-500/30 bg-green-500/10 text-green-400 text-[10px]",
};

export function StatusBadge({
  variant = "default",
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}