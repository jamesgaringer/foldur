type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]",
  success: "bg-green-900/30 text-[var(--color-success)]",
  warning: "bg-yellow-900/30 text-[var(--color-warning)]",
  error: "bg-red-900/30 text-[var(--color-error)]",
  info: "bg-blue-900/30 text-[var(--color-accent)]",
};

export function StatusBadge({ label, variant = "default" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}
