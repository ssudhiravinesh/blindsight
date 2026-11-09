/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Copy, RotateCw, Sparkles } from 'lucide-react';
import type { ScanResult, SeverityKey } from '@blindsight/core';
import { CLAUSE_INFO, getAlternatives, t } from '@blindsight/core';

import ClauseItem from './ClauseItem';
import GradeRing from './GradeRing';
import { prettyCategory, tint, toneFor } from '../ui';

interface Props {
    result: ScanResult;
    onRescan: () => void;
}

export default function ResultCard({ result, onRescan }: Props) {
    const [copied, setCopied] = useState(false);

    const severity = (result.overallSeverity ?? 0) as SeverityKey;
    const tone = toneFor(severity);
    const category = prettyCategory(result.category);

    const clauses = useMemo(
        () => [...(result.clauses ?? [])].sort((a, b) => b.severity - a.severity),
        [result.clauses],
    );
    const counts = useMemo(() => {
        const c = [0, 0, 0, 0];
        for (const clause of clauses) c[clause.severity] += 1;
        return c;
    }, [clauses]);

    const staticAlts = result.category ? getAlternatives(result.category, result.hostname) : null;
    const alternatives: { title: string; ai: boolean; items: { name: string; url: string; reason: string; icon: string }[] } | null =
        staticAlts && staticAlts.displayName !== 'Online Service' && staticAlts.alternatives.length
            ? { title: `Safer ${staticAlts.displayName.toLowerCase()} options`, ai: false, items: staticAlts.alternatives.slice(0, 3) }
            : result.aiAlternatives?.length
                ? {
                    title: 'Suggested alternatives',
                    ai: true,
                    items: result.aiAlternatives.slice(0, 3).map((a) => ({ ...a, icon: a.name.charAt(0).toUpperCase() })),
                }
                : null;

    const handleCopy = async () => {
        const lines = [
            'Blind-Sight scan report',
            `Grade ${tone.grade}: ${tone.verdict}`,
            `Service: ${result.serviceName ?? result.hostname ?? 'Unknown'}`,
            result.summary ? `Summary: ${result.summary}` : '',
            '',
            ...clauses.map((c) => `- [${toneFor(c.severity).level}] ${(CLAUSE_INFO[c.type] ?? CLAUSE_INFO.DEFAULT).name}: ${c.explanation}`),
        ].filter((l, i, all) => l !== '' || all[i - 1] !== '');
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard can be unavailable when the popup loses focus.
        }
    };

    return (
        <section className="surface animate-fade-up overflow-hidden">
            {/* Verdict */}
            <div
                className="flex items-center gap-4 border-b border-line p-4"
                style={{ background: `linear-gradient(135deg, ${tint(tone.color, 0.1)} 0%, transparent 70%)` }}
            >
                <GradeRing grade={tone.grade} color={tone.color} severity={severity} size={72} />
                <div className="min-w-0 flex-1">
                    <p className="eyebrow">Verdict</p>
                    <h2 className="mt-0.5 text-[16px] font-semibold leading-tight tracking-tight" style={{ color: tone.color }}>
                        {t(tone.verdictKey, tone.verdict)}
                    </h2>
                    <p className="mt-1 truncate text-xs text-fg-muted">
                        {result.serviceName ?? result.hostname ?? 'This service'}
                        {category && <span className="text-fg-subtle"> · {category}</span>}
                    </p>
                </div>
            </div>

            <div className="space-y-4 p-4">
                <p className="text-[12.5px] leading-relaxed text-fg/90">
                    {result.summary ?? t(tone.blurbKey, tone.blurb)}
                </p>

                {/* Findings */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <p className="eyebrow">Findings</p>
                        {clauses.length > 0 && (
                            <div className="flex items-center gap-2" aria-label="Findings by severity">
                                {([3, 2, 1, 0] as SeverityKey[])
                                    .filter((s) => counts[s] > 0)
                                    .map((s) => (
                                        <span key={s} className="flex items-center gap-1 text-2xs text-fg-muted">
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: toneFor(s).color }} />
                                            {counts[s]} {toneFor(s).level.toLowerCase()}
                                        </span>
                                    ))}
                            </div>
                        )}
                    </div>

                    {clauses.length > 0 ? (
                        <ul className="space-y-2">
                            {clauses.map((clause, i) => (
                                <ClauseItem key={`${clause.type}-${i}`} clause={clause} />
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">
                            No concerning clauses found.
                        </p>
                    )}
                </div>

                {/* Alternatives, only worth surfacing when the terms are bad */}
                {alternatives && severity >= 2 && (
                    <div>
                        <p className="eyebrow mb-2 flex items-center gap-1.5">
                            {alternatives.ai && <Sparkles size={11} />}
                            {alternatives.title}
                        </p>
                        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                            {alternatives.items.map((alt) => (
                                <a
                                    key={alt.name}
                                    href={alt.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 bg-white/[0.015] px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-sm">
                                        {alt.icon}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[12.5px] font-medium text-fg">{alt.name}</span>
                                        <span className="block truncate text-2xs text-fg-subtle">{alt.reason}</span>
                                    </span>
                                    <ArrowUpRight
                                        size={15}
                                        className="shrink-0 text-fg-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
                                    />
                                </a>
                            ))}
                        </div>
                        {alternatives.ai && (
                            <p className="mt-1.5 text-2xs text-fg-subtle">
                                {t('aiAltWarning', 'Suggested by AI. Verify before signing up.')}
                            </p>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={handleCopy} className="btn-ghost flex-1">
                        {copied ? <Check size={14} className="text-sev-0" /> : <Copy size={14} />}
                        {copied ? t('copiedToClipboard', 'Copied') : t('copyReport', 'Copy report')}
                    </button>
                    <button type="button" onClick={onRescan} className="btn-ghost flex-1">
                        <RotateCw size={14} />
                        Rescan
                    </button>
                </div>
                {result.scanDurationMs !== undefined && (
                    <p className="text-center text-2xs text-fg-subtle">
                        {t('analyzedIn', `Analyzed in ${(result.scanDurationMs / 1000).toFixed(1)}s`, [
                            (result.scanDurationMs / 1000).toFixed(1),
                        ])}
                    </p>
                )}
            </div>
        </section>
    );
}
