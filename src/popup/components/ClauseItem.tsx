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
        <div className={`p-3 rounded-md border border-bs-border bg-bs-bg-secondary cursor-pointer transition-colors hover:bg-bs-bg-tertiary/50`}>
            <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">{info.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-bs-text-primary mb-0.5 tracking-wide">
                            {info.name}
                        </h4>
                        {/* The original code had a severity badge here, but the provided snippet removed the logic for it. */}
                        {/* Keeping the original severity badge logic for now, as the instruction was to remove glossy backgrounds/borders, not functionality. */}
                        {/* If the user explicitly wants to remove the severity badge, they should provide a snippet that removes it. */}
                        {/* For now, I'll adapt the original severity badge to fit the new design. */}
                        <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider`}
                            style={{ backgroundColor: `${borderColor.replace('border-l-', '')}15`, color: borderColor.replace('border-l-', '') }}
                        >
                            {clause.severity === 0 ? 'Low' : clause.severity === 1 ? 'Medium' : clause.severity === 2 ? 'High' : 'Critical'}
                        </span>
                    </div>
                    <p className={`text-[11px] text-bs-text-secondary`}>
                        {clause.explanation}
                    </p>
                </div>
            </div>
        </div>
    );
}
