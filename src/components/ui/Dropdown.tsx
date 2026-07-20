import { useEffect, useRef, type ReactNode } from "react";

interface DropdownProps {
  trigger: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}

export default function Dropdown({
  trigger,
  open,
  onClose,
  children,
  className = "",
  align = "right",
}: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative inline-block">
      {trigger}
      {open && (
        <div
          className={`absolute z-50 mt-2 min-w-[12rem] rounded-xl border border-border bg-surface-raised p-1.5 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          } ${className}`}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* DropdownItem — ítem accesible por teclado */
interface DropdownItemProps {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  icon?: ReactNode;
}

export function DropdownItem({ onClick, children, danger = false, icon }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        danger
          ? "text-danger hover:bg-danger-surface"
          : "text-text hover:bg-surface"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
