import React from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";

type Cx = string | false | null | undefined;
export const cx = (...classes: Cx[]) => classes.filter(Boolean).join(" ");

/** Card that wraps every tool. */
export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <section className={cx("bg-white border border-slate-200 rounded-xl p-5 sm:p-6", className)}>{children}</section>
);

export const PanelHeader: React.FC<{
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
    <div className="min-w-0">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </div>
);

/** Rounded inset area used to group related controls. */
export const Section: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className,
}) => (
  <div className={cx("rounded-lg border border-slate-200 bg-slate-50/60 p-4", className)}>
    {title && <h3 className="text-sm font-medium text-slate-800 mb-3">{title}</h3>}
    {children}
  </div>
);

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent",
  danger: "bg-transparent text-slate-500 hover:bg-red-50 hover:text-red-700 border border-transparent",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
      BUTTON_VARIANTS[variant],
      className
    )}
    {...rest}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : icon}
    {children}
  </button>
);

/** Square icon-only button; `label` is required for screen readers. */
export const IconButton: React.FC<
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & { label: string; tone?: "default" | "danger" }
> = ({ label, tone = "default", className, children, type = "button", ...rest }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={cx(
      "inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 transition-colors cursor-pointer",
      "disabled:opacity-30 disabled:cursor-not-allowed",
      tone === "danger" ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-900",
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

type AlertTone = "error" | "info" | "success" | "warning";

const ALERT_STYLES: Record<AlertTone, { box: string; icon: React.ReactNode }> = {
  error: { box: "bg-red-50 border-red-200 text-red-800", icon: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> },
  warning: {
    box: "bg-amber-50 border-amber-200 text-amber-900",
    icon: <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />,
  },
  success: {
    box: "bg-emerald-50 border-emerald-200 text-emerald-900",
    icon: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />,
  },
  info: { box: "bg-slate-50 border-slate-200 text-slate-700", icon: <Info className="w-4 h-4 shrink-0 mt-0.5" /> },
};

export const Alert: React.FC<{ tone?: AlertTone; children: React.ReactNode; className?: string }> = ({
  tone = "info",
  children,
  className,
}) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className={cx("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", ALERT_STYLES[tone].box, className)}
  >
    {ALERT_STYLES[tone].icon}
    <div className="min-w-0">{children}</div>
  </div>
);

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...rest }) => (
  <label className={cx("block text-sm font-medium text-slate-700 mb-1.5", className)} {...rest} />
);

export const inputClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

/** Segmented control for a small set of mutually exclusive options. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap p-1 bg-slate-100 rounded-lg text-sm">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cx(
              "px-3 py-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5",
              selected ? "bg-white text-slate-900 font-medium shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Footer row holding a tool's primary action. */
export const ActionBar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx("pt-4 mt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3", className)}>
    {children}
  </div>
);
