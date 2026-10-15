import Link from "next/link";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "buy" | "sell";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent/90",
  secondary: "bg-surface text-ink border border-line hover:bg-raised",
  ghost: "text-muted hover:text-ink hover:bg-raised",
  danger: "bg-sell text-white hover:bg-sell/90",
  buy: "bg-buy text-white hover:bg-buy/90",
  sell: "bg-sell text-white hover:bg-sell/90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-sm gap-2",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export function buttonClass({ variant = "primary", size = "md", className }: Omit<CommonProps, "children">) {
  return clsx(
    "inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors",
    "disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, loading, disabled, children, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant, size, className, children }: CommonProps & { href: string }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })}>
      {children}
    </Link>
  );
}
