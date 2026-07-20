import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

interface AlertProps {
  variant: "success" | "warning" | "danger" | "info";
  title: string;
  description?: string;
  className?: string;
}

const ICONS = {
  success: CheckCircle,
  warning: AlertCircle,
  danger: XCircle,
  info: Info,
};

const STYLES: Record<AlertProps["variant"], string> = {
  success: "bg-success-surface border-accent/20 text-success-foreground",
  warning: "bg-warning-surface border-warning/20 text-warning-foreground",
  danger: "bg-danger-surface border-danger/20 text-danger-foreground",
  info: "bg-info-surface border-info/20 text-info-foreground",
};

const ICON_COLORS: Record<AlertProps["variant"], string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export default function Alert({ variant, title, description, className = "" }: AlertProps) {
  const Icon = ICONS[variant];
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${STYLES[variant]} ${className}`}
      role="alert"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLORS[variant]}`} />
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs opacity-80">{description}</p>
        )}
      </div>
    </div>
  );
}
