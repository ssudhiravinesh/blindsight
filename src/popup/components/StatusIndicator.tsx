interface Props {
    status: string;
    message: string;
}

const statusColors: Record<string, string> = {
    idle: 'bg-bs-text-muted',
    scanning: 'bg-bs-accent animate-pulse',
    safe: 'bg-bs-success',
    notable: 'bg-bs-notable',
    caution: 'bg-bs-caution',
    danger: 'bg-bs-danger animate-pulse',
    error: 'bg-bs-danger',
    nokey: 'bg-bs-warning',
};

export default function StatusIndicator({ status, message }: Props) {
    const dotColor = statusColors[status] ?? statusColors.idle;

    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bs-bg-secondary/50 border border-bs-border/50">
            <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`}
                aria-hidden
            />
            <span className="text-xs text-bs-text-secondary font-medium">{message}</span>
        </div>
    );
}
