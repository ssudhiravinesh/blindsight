import type { HistoryEntry, SeverityKey } from '../../lib/types';
import { SEVERITY_CONFIG, severityToGrade, getSeverityColor } from '../../lib/types';

interface Props {
    entries: HistoryEntry[];
}

function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function HistorySection({ entries }: Props) {
    if (entries.length === 0) return null;

    return (
        <div className="animate-slide-in">
            <h2 className="text-xs font-semibold text-bs-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>📜</span> Recent Scans
            </h2>
            <div className="flex flex-col gap-1.5">
                {entries.map((entry) => {
                    const config = SEVERITY_CONFIG[entry.severity as SeverityKey];
                    const grade = severityToGrade(entry.severity);
                    const color = getSeverityColor(entry.severity);

                    return (
                        <div
                            key={entry.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bs-bg-secondary/50 border border-bs-border/30 hover:bg-bs-bg-secondary/80 transition-colors cursor-default"
                        >
                            {}
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border"
                                style={{ borderColor: color, color }}
                            >
                                {grade}
                            </div>

                            {}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold truncate">{entry.serviceName || entry.hostname}</span>
                                    <span className="text-[10px] text-bs-text-muted">•</span>
                                    <span className="text-[10px] text-bs-text-muted flex-shrink-0">{timeAgo(entry.timestamp)}</span>
                                </div>
                                <p className="text-[10px] text-bs-text-muted truncate">
                                    {config.name} — {entry.clauseCount} clause{entry.clauseCount !== 1 ? 's' : ''} found
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
