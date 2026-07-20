import { CheckCircle } from "lucide-react";

interface Step {
  key: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: string;
  className?: string;
}

export default function Stepper({ steps, currentStep, className = "" }: StepperProps) {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Progreso" className={className}>
      <ol className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;

          return (
            <li key={step.key} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCompleted
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-text-muted"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`hidden text-xs font-medium sm:inline ${
                    isCurrent ? "text-text" : "text-text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-6 sm:w-10 rounded ${
                    i < currentIdx ? "bg-success" : "bg-gray-200"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
