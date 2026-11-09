import type { ClauseType, SeverityKey } from '@blindsight/core';
import { severityToGrade } from '@blindsight/core';
import type { LucideIcon } from 'lucide-react';
import { Ban, Copyright, Database, FileText, Gavel, PenLine, ShieldOff } from 'lucide-react';

export interface SeverityTone {
    grade: string;
    color: string;
    /** Verdict shown next to the grade. */
    verdict: string;
    verdictKey: string;
    blurb: string;
    blurbKey: string;
    /** Per-finding label. */
    level: string;
}

const TONES: Record<SeverityKey, Omit<SeverityTone, 'grade'>> = {
    0: {
        color: '#34D399',
        verdict: 'Terms look good',
        verdictKey: 'termsLookGood',
        blurb: 'Standard, industry-normal terms.',
        blurbKey: 'termsLookGoodDesc',
        level: 'Low',
    },
    1: {
        color: '#FACC15',
        verdict: 'Notable terms',
        verdictKey: 'notableTerms',
        blurb: 'Worth knowing about, but common practice.',
        blurbKey: 'notableTermsDesc',
        level: 'Medium',
    },
    2: {
        color: '#FB923C',
        verdict: 'Proceed with caution',
        verdictKey: 'proceedCaution',
        blurb: 'Unusual terms detected. Review before accepting.',
        blurbKey: 'proceedCautionDesc',
        level: 'High',
    },
    3: {
        color: '#F43F5E',
        verdict: 'Critical terms',
        verdictKey: 'criticalTermsOverall',
        blurb: 'Aggressive terms found. Proceed at your own risk.',
        blurbKey: 'criticalTermsOverallDesc',
        level: 'Critical',
    },
};

export function toneFor(severity: number): SeverityTone {
    const key = (Math.max(0, Math.min(3, Math.round(severity))) as SeverityKey);
    return { ...TONES[key], grade: severityToGrade(key) };
}

const CLAUSE_ICONS: Partial<Record<ClauseType, LucideIcon>> = {
    DATA_SELLING: Database,
    ARBITRATION: Gavel,
    NO_CLASS_ACTION: Ban,
    TOS_CHANGES: PenLine,
    UNILATERAL_CHANGES: PenLine,
    CONTENT_RIGHTS: Copyright,
    LIABILITY: ShieldOff,
};

export function clauseIcon(type: string): LucideIcon {
    return CLAUSE_ICONS[type as ClauseType] ?? FileText;
}

/** `#RRGGBB` + alpha (0–1) → `rgba()`, for tinting surfaces with a severity colour. */
export function tint(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function prettyCategory(category?: string): string | null {
    if (!category || category === 'unknown') return null;
    return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function timeAgo(timestamp: number): string {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
