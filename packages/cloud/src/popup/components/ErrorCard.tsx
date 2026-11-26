import { AlertTriangle, Clock, RotateCw } from 'lucide-react';

interface Props {
    title: string;
    message: string;
    rateLimited?: boolean;
    onRetry: () => void;
}

export default function ErrorCard({ title, message, rateLimited = false, onRetry }: Props) {
    const Icon = rateLimited ? Clock : AlertTriangle;
    const color = rateLimited ? 'text-sev-1 bg-sev-1/10' : 'text-sev-3 bg-sev-3/10';

    return (
        <section className="surface animate-fade-up p-4" role="alert">
            <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                    <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-[13.5px] font-semibold">{title}</h2>
                    <p className="mt-0.5 break-words text-xs leading-relaxed text-fg-muted">{message}</p>
                </div>
            </div>
            <button type="button" onClick={onRetry} className="btn-ghost mt-4 w-full">
                <RotateCw size={14} />
                Try again
            </button>
        </section>
    );
}
