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
        <div className="animate-slide-in mt-2">
            <h2 className="text-xs font-semibold text-bs-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span>📜</span> Recent Scans</span>
                <span className="bg-bs-bg-tertiary text-[10px] px-1.5 py-0.5 rounded-full">{entries.length}/10</span>
            </h2>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 cs-scroll">
                {entries.map((entry) => {
                    const config = SEVERITY_CONFIG[entry.severity as SeverityKey];
                    const grade = severityToGrade(entry.severity);
                    const color = getSeverityColor(entry.severity);

                    return (
                        <div
                            key={entry.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-bs-bg-secondary border border-bs-border hover:bg-bs-bg-tertiary transition-colors cursor-default"
                        >
                            {/* Grade Circle */}
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 border-2"
                                style={{ borderColor: color, color, backgroundColor: `${color}10` }}
                                title={`Grade: ${grade}`}
                            >
                                {grade}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-bold text-bs-text-primary truncate pr-2">{entry.serviceName || entry.hostname}</span>
                                    <span className="text-[10px] font-semibold text-bs-text-muted flex-shrink-0">{timeAgo(entry.timestamp)}</span>
                                </div>
                                <p className="text-[10px] text-bs-text-secondary truncate font-medium">
                                    {config.name} <span className="text-bs-border mx-1">|</span> {entry.clauseCount} issue{entry.clauseCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
