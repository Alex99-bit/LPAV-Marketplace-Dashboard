import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-success-surface text-success-foreground",
  warning: "bg-warning-surface text-warning-foreground",
  danger: "bg-danger-surface text-danger-foreground",
  info: "bg-info-surface text-info-foreground",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
