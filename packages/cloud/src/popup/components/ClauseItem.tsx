import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Clause } from '@blindsight/core';
import { CLAUSE_INFO } from '@blindsight/core';
import { clauseIcon, tint, toneFor } from '../ui';

interface Props {
    clause: Clause;
}

export default function ClauseItem({ clause }: Props) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const info = CLAUSE_INFO[clause.type] ?? CLAUSE_INFO.DEFAULT;
    const tone = toneFor(clause.severity);
    const Icon = clauseIcon(clause.type);
    const hasDetail = Boolean(clause.quote || clause.mitigation);

    return (
        <li className="overflow-hidden rounded-xl border border-line bg-white/[0.02] transition-colors hover:border-line-strong">
            <button
                type="button"
                onClick={() => hasDetail && setOpen((o) => !o)}
                aria-expanded={hasDetail ? open : undefined}
                aria-controls={hasDetail ? panelId : undefined}
                className={`flex w-full items-start gap-3 p-3 text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
            >
                <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: tint(tone.color, 0.12), color: tone.color }}
                    aria-hidden="true"
                >
                    <Icon size={15} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="truncate text-[12.5px] font-medium text-fg">{info.name}</span>
                        <span
                            className="ml-auto shrink-0 rounded-full px-1.5 py-px text-2xs font-semibold"
                            style={{ background: tint(tone.color, 0.12), color: tone.color }}
                        >
                            {tone.level}
                        </span>
                    </span>
                    <span className={`mt-1 block text-xs leading-relaxed text-fg-muted ${open ? '' : 'line-clamp-2'}`}>
                        {clause.explanation}
                    </span>
                </span>
                {hasDetail && (
                    <ChevronDown
                        size={15}
                        className={`mt-1 shrink-0 text-fg-subtle transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                )}
            </button>

            {hasDetail && open && (
                <div id={panelId} className="animate-fade-up space-y-2 px-3 pb-3 pl-[52px]">
                    {clause.quote && (
                        <blockquote
                            className="border-l-2 pl-2.5 text-[11.5px] italic leading-relaxed text-fg-muted"
                            style={{ borderColor: tint(tone.color, 0.6) }}
                        >
                            “{clause.quote}”
                        </blockquote>
                    )}
                    {clause.mitigation && (
                        <p className="rounded-lg bg-sev-0/10 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-emerald-200">
                            <span className="font-semibold text-sev-0">Opt-out: </span>
                            {clause.mitigation}
                        </p>
                    )}
                </div>
            )}
        </li>
    );
}
