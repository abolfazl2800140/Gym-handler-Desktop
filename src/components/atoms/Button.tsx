import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

export default function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base = "ripple touch-target transition-all duration-200";
  const variants: Record<string, string> = {
    primary:
      "btn-primary",
    secondary:
      "btn-secondary",
    ghost:
      "px-4 py-2.5 rounded-lg bg-transparent text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10",
  };
  const cls = `${base} ${variants[variant]} ${className}`.trim();
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" strokeWidth="4" className="opacity-75" />
          </svg>
          در حال پردازش...
        </span>
      ) : (
        children
      )}
    </button>
  );
}