/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { SeverityKey } from '@blindsight/core';
import { severityToGrade, getSeverityColor } from '@blindsight/core';


interface Props {
    severity: SeverityKey;
}

export default function TrustBadge({ severity }: Props) {
    const grade = severityToGrade(severity);
    const color = getSeverityColor(severity);
    return (
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-black tracking-tighter"
                style={{ backgroundColor: `${color}15`, color: color, border: `2px solid ${color}` }}
                title={`Trust Grade: ${grade}`}
            >
                {grade}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: color }}>Grade</span>
        </div>
    );
}
