/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { History } from 'lucide-react';
import type { HistoryEntry } from '@blindsight/core';
import { t } from '@blindsight/core';
import { timeAgo, tint, toneFor } from '../ui';

interface Props {
    entries: HistoryEntry[];
}

export default function HistorySection({ entries }: Props) {
    if (entries.length === 0) return null;

    return (
        <section className="animate-fade-up" aria-labelledby="bs-history-title">
            <div className="mb-2 flex items-center justify-between px-1">
                <h2 id="bs-history-title" className="eyebrow flex items-center gap-1.5">
                    <History size={11} />
                    {t('recentScans', 'Recent scans')}
                </h2>
                <span className="text-2xs text-fg-subtle">{entries.length}</span>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-ink-850/60">
                {entries.map((entry) => {
                    const tone = toneFor(entry.severity);
                    return (
                        <li key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
                                style={{ background: tint(tone.color, 0.12), color: tone.color }}
                                aria-label={`Grade ${tone.grade}`}
                            >
                                {tone.grade}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[12.5px] font-medium text-fg">{entry.serviceName || entry.hostname}</p>
                                <p className="truncate text-2xs text-fg-subtle">
                                    {entry.hostname} · {entry.clauseCount} {entry.clauseCount === 1 ? 'finding' : 'findings'}
                                </p>
                            </div>
                            <time className="shrink-0 text-2xs text-fg-subtle" dateTime={new Date(entry.timestamp).toISOString()}>
                                {timeAgo(entry.timestamp)}
                            </time>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
