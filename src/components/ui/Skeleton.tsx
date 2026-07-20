interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
      role="status"
      aria-label="Cargando..."
    />
  );
}
