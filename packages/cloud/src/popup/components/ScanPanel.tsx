import { ScanSearch } from 'lucide-react';
import { t } from '@blindsight/core';
import GradeRing from './GradeRing';

interface Props {
    scanning: boolean;
    disabled?: boolean;
    onScan: () => void;
}

/** Idle / in-progress state: explains what a scan does and hosts the primary action. */
export default function ScanPanel({ scanning, disabled = false, onScan }: Props) {
    return (
        <section className="surface animate-fade-up p-5" aria-busy={scanning}>
            <div className="flex flex-col items-center text-center">
                <GradeRing scanning={scanning} />
                <h2 className="mt-4 text-[15px] font-semibold tracking-tight">
                    {scanning ? 'Reading the fine print…' : "Know what you're agreeing to"}
                </h2>
                <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-fg-muted" role="status">
                    {scanning
                        ? 'Finding and analyzing this site’s Terms of Service.'
                        : 'Scan this site’s Terms of Service for data selling, forced arbitration and other red flags.'}
                </p>
            </div>

            <button type="button" onClick={onScan} disabled={scanning || disabled} className="btn-primary mt-5">
                {scanning ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Analyzing…
                    </>
                ) : (
                    <>
                        <ScanSearch size={17} strokeWidth={2} />
                        {t('scanTerms', 'Scan Terms')}
                    </>
                )}
            </button>

            {!scanning && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-2xs text-fg-subtle">
                    or press <span className="kbd">Alt</span>
                    <span className="kbd">B</span> on any page
                </p>
            )}
        </section>
    );
}
