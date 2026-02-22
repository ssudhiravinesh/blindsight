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
    const hasStaticAlts = alts && alts.displayName !== 'Online Service';
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
        } catch { }
    };

    return (
        <div className={`bs-glass ${gradientClass[config.cardClass] ?? ''} overflow-hidden border-t-2`} style={{ borderTopColor: `var(--bs-${config.cardClass})` }}>
            {/* Header Area */}
            <div className="p-4 flex flex-col gap-4">
                <div className="flex items-start justify-between pb-3 border-b border-bs-border">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl drop-shadow-md">{config.icon}</span>
                        <div>
                            <h3 className="font-bold text-sm tracking-wide text-bs-text-primary">{config.title}</h3>
                            <p className="text-xs text-bs-text-secondary mt-0.5 font-medium">{config.message}</p>
                        </div>
                    </div>
                    <TrustBadge severity={severity as SeverityKey} />
                </div>

                {/* Summary */}
                {result.summary && (
                    <div className="bg-bs-bg-tertiary/20 rounded-md p-3 border border-bs-border/50">
                        <p className="text-sm text-bs-text-secondary leading-relaxed font-normal">
                            {result.summary}
                        </p>
                    </div>
                )}

                {/* Clauses */}
                {result.clauses.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {result.clauses.map((clause, i) => (
                            <ClauseItem key={i} clause={clause} />
                        ))}
                    </div>
                )}
            </div>{/* End Header Area flex-col */}

            {/* Static Alternatives */}
            {alts && hasStaticAlts && severity >= 2 && (
                <div className="px-4 pb-4">
                    <div className="border border-bs-border bg-bs-bg-primary/50 rounded-lg p-3">
                        <h4 className="text-[11px] font-bold text-bs-text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span className="text-bs-success">🛡️</span> Safer {alts.displayName} Alternatives
                        </h4>
                        <div className="flex flex-col gap-2">
                            {alts.alternatives.slice(0, 3).map((alt) => (
                                <a
                                    key={alt.name}
                                    href={alt.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-bs-bg-tertiary transition-colors group"
                                >
                                    <span className="text-lg opacity-80 group-hover:opacity-100">{alt.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-bs-text-primary group-hover:text-bs-accent transition-colors">{alt.name}</span>
                                        <p className="text-[11px] text-bs-text-muted truncate mt-0.5">{alt.reason}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-bs-text-muted group-hover:text-bs-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Alternatives */}
            {!hasStaticAlts && hasAiAlts && severity >= 2 && (
                <div className="px-4 pb-4">
                    <div className="border border-bs-border bg-bs-bg-primary/50 rounded-lg p-3">
                        <h4 className="text-[11px] font-bold text-bs-text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span className="text-bs-accent">🤖</span> AI-Suggested Alternatives
                        </h4>
                        <div className="flex flex-col gap-2">
                            {result.aiAlternatives!.slice(0, 3).map((alt) => (
                                <a
                                    key={alt.name}
                                    href={alt.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-bs-bg-tertiary transition-colors group"
                                >
                                    <span className="text-lg opacity-80 group-hover:opacity-100">🔗</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-bs-text-primary group-hover:text-bs-accent transition-colors">{alt.name}</span>
                                        <p className="text-[11px] text-bs-text-muted truncate mt-0.5">{alt.reason}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-bs-text-muted group-hover:text-bs-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>
                            ))}
                        </div>
                        <p className="text-[9px] text-bs-text-muted mt-3 text-center opacity-70">
                            These alternatives were suggested by AI — verify before visiting
                        </p>
                    </div>
                </div>
            )}

            <div className="px-4 pb-4">
                <button
                    onClick={handleCopy}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-bs-bg-tertiary/60 hover:bg-bs-bg-tertiary text-bs-text-secondary hover:text-bs-text-primary transition-all border border-bs-border/50"
                >
                    {copySuccess ? '✅ Copied to clipboard!' : '📋 Copy Report'}
                </button>
                {result.scanDurationMs && (
                    <p className="text-[10px] text-bs-text-muted text-center mt-3 opacity-70">
                        ⚡ Analyzed in {(result.scanDurationMs / 1000).toFixed(1)}s
                    </p>
                )}
            </div>
        </div>
    );
}
