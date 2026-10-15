import clsx from "clsx";
import { forwardRef, useId } from "react";

export const inputClass =
  "w-full h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 " +
  "outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
  className?: string;
  trailing?: React.ReactNode;
}

/** Label, control, then hint or error, wired up for screen readers. */
export function FieldShell({ label, hint, error, optional, children, className, trailing }: FieldShellProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-ink">
          {label}
          {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
        {trailing}
      </div>
      {children(id, message ? messageId : undefined)}
      {message && (
        <p id={messageId} className={clsx("mt-1.5 text-2xs", error ? "text-sell" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  trailing?: React.ReactNode;
  suffix?: React.ReactNode;
};

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, hint, error, optional, trailing, suffix, className, ...rest },
  ref
) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} trailing={trailing} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={clsx(inputClass, error && "border-sell focus:border-sell focus:ring-sell/20", suffix && "pr-14")}
            {...rest}
          />
          {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{suffix}</span>}
        </div>
      )}
    </FieldShell>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
};

export function SelectField({ label, hint, error, optional, className, children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} className={clsx(inputClass, "pr-8")} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}
