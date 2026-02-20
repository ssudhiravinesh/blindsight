import type { SeverityKey } from '../../lib/types';
import { severityToGrade, getSeverityColor } from '../../lib/types';

interface Props {
    severity: SeverityKey;
}

export default function TrustBadge({ severity }: Props) {
    const grade = severityToGrade(severity);
    const color = getSeverityColor(severity);
    const percentage = [100, 75, 45, 15][severity] ?? 100;

    return (
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black border-2"
                style={{ borderColor: color, color }}
            >
                {grade}
            </div>
            {/* Progress bar */}
            <div className="w-10 h-1 rounded-full bg-bs-bg-tertiary overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}
