import { tint } from '../ui';

interface Props {
    /** Letter grade to show; omitted while idle/scanning. */
    grade?: string;
    color?: string;
    /** 0–3; fills the ring proportionally to how *safe* the terms are. */
    severity?: number;
    scanning?: boolean;
    size?: number;
}

const STROKE = 6;

export default function GradeRing({ grade, color = '#8B7CFF', severity, scanning = false, size = 76 }: Props) {
    const r = (size - STROKE) / 2;
    const circumference = 2 * Math.PI * r;
    const fill = severity === undefined ? 0 : [1, 0.72, 0.45, 0.2][Math.max(0, Math.min(3, severity))];

    return (
        <div
            className="relative shrink-0"
            style={{ width: size, height: size }}
            role="img"
            aria-label={grade ? `Grade ${grade}` : scanning ? 'Analyzing' : 'Not scanned yet'}
        >
            {grade && (
                <div
                    className="absolute inset-1 rounded-full blur-xl"
                    style={{ background: tint(color, 0.28) }}
                    aria-hidden="true"
                />
            )}
            <svg width={size} height={size} className="relative -rotate-90" aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
                {scanning ? (
                    <g className="origin-center animate-sweep" style={{ transformBox: 'fill-box' }}>
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke="url(#bs-ring-scan)"
                            strokeWidth={STROKE}
                            strokeLinecap="round"
                            strokeDasharray={`${circumference * 0.28} ${circumference}`}
                        />
                    </g>
                ) : (
                    grade && (
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke={color}
                            strokeWidth={STROKE}
                            strokeLinecap="round"
                            strokeDasharray={`${circumference * fill} ${circumference}`}
                            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                        />
                    )
                )}
                <defs>
                    <linearGradient id="bs-ring-scan" x1="0" y1="0" x2="1" y2="1">
                        <stop stopColor="#B3A9FF" />
                        <stop offset="1" stopColor="#5B8CFF" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {grade ? (
                    <span className="text-[28px] font-bold leading-none tracking-tight" style={{ color }}>
                        {grade}
                    </span>
                ) : (
                    <span className="text-[22px] font-semibold leading-none text-fg-subtle">{scanning ? '' : '?'}</span>
                )}
            </div>
        </div>
    );
}
