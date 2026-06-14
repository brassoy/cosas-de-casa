import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { ReactNode } from "react";

export interface ScreenStateProps {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyCta?: { label: string; onClick: () => void };
  onRetry?: () => void;
  skeleton?: ReactNode;
  children?: ReactNode;
}

export function ScreenState({
  isLoading, error, isEmpty, emptyIcon, emptyTitle, emptyCta, onRetry, skeleton, children,
}: ScreenStateProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        {skeleton ?? (
          <>
            <div className="h-20 rounded-card bg-surface-raised animate-pulse" />
            <div className="h-20 rounded-card bg-surface-raised animate-pulse" />
            <div className="h-20 rounded-card bg-surface-raised animate-pulse" />
          </>
        )}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3">
        <AlertCircle className="h-10 w-10 text-error" aria-hidden />
        <p className="text-text-muted">{error}</p>
        {onRetry && <Button onClick={onRetry} variant="outline">Reintentar</Button>}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3">
        <div className="text-text-muted">{emptyIcon ?? <Inbox className="h-10 w-10" aria-hidden />}</div>
        {emptyTitle && <p className="font-medium">{emptyTitle}</p>}
        {emptyCta && <Button onClick={emptyCta.onClick}>{emptyCta.label}</Button>}
      </div>
    );
  }
  return <>{children}</>;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-card bg-surface-raised animate-pulse" />
      ))}
    </div>
  );
}

export function InlineLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-text-muted text-sm" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}
