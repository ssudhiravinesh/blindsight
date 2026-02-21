import type { Clause } from '../../lib/types';
import { CLAUSE_INFO } from '../../lib/types';

interface Props {
    clause: Clause;
}

const severityBorders: Record<number, string> = {
    0: 'border-l-bs-success',
    1: 'border-l-bs-notable',
    2: 'border-l-bs-caution',
    3: 'border-l-bs-danger',
};

export default function ClauseItem({ clause }: Props) {
    const info = CLAUSE_INFO[clause.type] ?? CLAUSE_INFO.DEFAULT;
    const borderColor = severityBorders[clause.severity] ?? severityBorders[1];

    return (
        <div className={`bg-bs-bg-tertiary/40 rounded-lg px-3 py-2.5 border-l-[3px] ${borderColor}`}>
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">{info.icon}</span>
                <span className="text-xs font-semibold text-bs-text-primary">{info.name}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-bs-text-secondary">{clause.explanation}</p>
            {clause.mitigation && (
                <p className="text-[10px] text-bs-success/80 mt-1 flex items-center gap-1">
                    <span>🛡️</span> {clause.mitigation}
                </p>
            )}
        </div>
    );
}
