import type { ActivityTrendPoint } from "@foldur/db";

interface Props {
  data: ActivityTrendPoint[];
  days: number;
  height?: number;
  className?: string;
}

export function ActivitySparkline({ data, days, height = 48, className = "" }: Props) {
  const dateMap = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  const points: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push(dateMap.get(key) ?? 0);
  }

  const max = Math.max(...points, 1);
  const barWidth = 100 / points.length;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={`Activity trend over ${days} days`}
    >
      {points.map((count, i) => {
        const barHeight = (count / max) * (height - 4);
        return (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={height - barHeight - 2}
            width={barWidth * 0.7}
            height={Math.max(barHeight, count > 0 ? 2 : 0)}
            rx={1}
            fill="var(--color-accent)"
            opacity={count > 0 ? 0.7 : 0.15}
          />
        );
      })}
    </svg>
  );
}
