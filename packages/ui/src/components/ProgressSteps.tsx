interface Step {
  label: string;
  status: "pending" | "active" | "completed" | "failed";
}

interface ProgressStepsProps {
  steps: Step[];
}

const statusDot: Record<Step["status"], string> = {
  pending: "bg-[var(--color-text-muted)]",
  active: "bg-[var(--color-accent)] animate-pulse",
  completed: "bg-[var(--color-success)]",
  failed: "bg-[var(--color-error)]",
};

export function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          {i > 0 && (
            <div className="h-px w-6 bg-[var(--color-border)]" />
          )}
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${statusDot[step.status]}`} />
            <span
              className={`text-xs ${
                step.status === "active"
                  ? "font-medium text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
