import type { LucideIcon } from "lucide-react";
import Button from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div className={`flex flex-col items-center gap-3 py-12 text-center ${className}`}>
      <Icon className="h-12 w-12 text-text-muted/30" />
      <div>
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-2">
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
