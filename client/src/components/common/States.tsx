export const SectionSkeleton = () => <div className="token-card h-28 animate-pulse" />;
export const SectionEmpty = ({ label }: { label: string }) => <div className="token-card p-4 text-sm text-muted">No {label} yet.</div>;
export const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="token-card p-4">
    <p className="mb-3 text-sm text-muted">We could not load home data.</p>
    <button className="h-11 rounded-token bg-primary px-4 text-white" onClick={onRetry}>Retry</button>
  </div>
);
