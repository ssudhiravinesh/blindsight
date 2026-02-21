import { useState } from 'react';
import type { ScanResult, SeverityKey } from '../../lib/types';
import { SEVERITY_CONFIG, CLAUSE_INFO, severityToGrade } from '../../lib/types';
import { getAlternatives } from '../../lib/alternatives';
import ClauseItem from './ClauseItem';
import TrustBadge from './TrustBadge';

interface Props {
    result: ScanResult;
}

export default function ResultCard({ result }: Props) {
    const [copySuccess, setCopySuccess] = useState(false);

    const severity = result.overallSeverity ?? 0;
    const config = SEVERITY_CONFIG[severity as SeverityKey];
    const alts = result.category ? getAlternatives(result.category, result.hostname) : null;
    const hasStaticAlts = alts && alts.displayName !== 'Online Service'; // not the 'unknown' fallback
    const hasAiAlts = result.aiAlternatives && result.aiAlternatives.length > 0;

    const gradientClass: Record<string, string> = {
        safe: 'bs-gradient-safe',
        notable: 'bs-gradient-notable',
        caution: 'bs-gradient-caution',
        danger: 'bs-gradient-danger',
    };

    const handleCopy = async () => {
        const lines: string[] = [
            `🔍 Blind-Sight Scan Report`,
            `━━━━━━━━━━━━━━━━━━━━━━━━`,
            `Trust Grade: ${severityToGrade(severity as SeverityKey)} (${config.name})`,
            `Service: ${result.serviceName ?? 'Unknown'}`,
            `Summary: ${result.summary ?? 'No summary'}`,
            '',
        ];

        if (result.clauses.length > 0) {
            lines.push('📋 Clauses Found:');
            for (const clause of result.clauses) {
                const info = CLAUSE_INFO[clause.type] ?? CLAUSE_INFO.DEFAULT;
                lines.push(`  ${info.icon} ${info.name}: ${clause.explanation}`);
            }
        }

        lines.push('', '— Scanned by Blind-Sight 🛡️');

        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch { /* fallback not needed in extension popup */ }
    };

    return (
        <div className={`bs-glass ${gradientClass[config.cardClass] ?? ''} animate-slide-in overflow-hidden`}>
            {/* Header */}
            <div className="p-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                        <h3 className="font-bold text-sm">{config.title}</h3>
                        <p className="text-xs text-bs-text-secondary mt-0.5">{config.message}</p>
                    </div>
                </div>
                <TrustBadge severity={severity as SeverityKey} />
            </div>

            {/* Summary */}
            {result.summary && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-bs-text-secondary leading-relaxed bg-bs-bg-tertiary/40 rounded-lg px-3 py-2">
                        {result.summary}
                    </p>
                </div>
            )}

            {/* Clauses */}
            {result.clauses.length > 0 && (
                <div className="px-4 pb-3 flex flex-col gap-1.5">
                    {result.clauses.map((clause, i) => (
                        <ClauseItem key={i} clause={clause} />
                    ))}
                </div>
            )}

            {/* Alternatives (static curated) */}
            {alts && hasStaticAlts && severity >= 2 && (
                <div className="px-4 pb-3">
                    <div className="bg-bs-success/5 border border-bs-success/15 rounded-xl p-3">
                        <h4 className="text-xs font-semibold text-bs-success mb-2">🛡️ Safer {alts.displayName} Alternatives</h4>
                        <div className="flex flex-col gap-1.5">
                            {alts.alternatives.slice(0, 3).map((alt) => (
                                <a
                                    key={alt.name}
                                    href={alt.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                >
                                    <span className="text-base">{alt.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-bs-success">{alt.name}</span>
                                        <p className="text-[10px] text-bs-text-muted truncate">{alt.reason}</p>
                                    </div>
                                    <span className="text-bs-success/50 group-hover:text-bs-success group-hover:translate-x-0.5 transition-all text-sm">→</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* AI-Suggested Alternatives (fallback for unknown categories) */}
            {!hasStaticAlts && hasAiAlts && severity >= 2 && (
                <div className="px-4 pb-3">
                    <div className="bg-bs-success/5 border border-bs-success/15 rounded-xl p-3">
                        <h4 className="text-xs font-semibold text-bs-success mb-2">🤖 AI-Suggested Alternatives</h4>
                        <div className="flex flex-col gap-1.5">
                            {result.aiAlternatives!.slice(0, 3).map((alt) => (
                                <a
                                    key={alt.name}
                                    href={alt.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                >
                                    <span className="text-base">🔗</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-bs-success">{alt.name}</span>
                                        <p className="text-[10px] text-bs-text-muted truncate">{alt.reason}</p>
                                    </div>
                                    <span className="text-bs-success/50 group-hover:text-bs-success group-hover:translate-x-0.5 transition-all text-sm">→</span>
                                </a>
                            ))}
                        </div>
                        <p className="text-[9px] text-bs-text-muted mt-2 text-center opacity-60">These alternatives were suggested by AI — verify before visiting</p>
                    </div>
                </div>
            )}

            {/* Copy button */}
            <div className="px-4 pb-4">
                <button
                    onClick={handleCopy}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-bs-bg-tertiary/60 hover:bg-bs-bg-tertiary text-bs-text-secondary hover:text-bs-text-primary transition-all border border-bs-border/50"
                >
                    {copySuccess ? '✅ Copied to clipboard!' : '📋 Copy Report'}
                </button>
            </div>
        </div>
    );
}
