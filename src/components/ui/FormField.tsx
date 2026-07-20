import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  label,
  error,
  hint,
  required = false,
  id,
  children,
  className = "",
}: FormFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-sm font-medium text-text"
      >
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {/* TODO(F5-a11y-formfield): asociar aria-describedby al input hijo para
          hints y errores. Hoy los hijos (Input, Select) no reciben estos ids. */}
      {hint && !error && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
