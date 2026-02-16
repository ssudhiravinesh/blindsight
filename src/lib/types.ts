// ─── Severity ───────────────────────────────────────────
export enum SeverityLevel {
    STANDARD = 0,
    NOTABLE = 1,
    CAUTIONARY = 2,
    CRITICAL = 3,
}

export type SeverityKey = 0 | 1 | 2 | 3;

export interface SeverityConfig {
    name: string;
    status: string;
    icon: string;
    title: string;
    message: string;
    cardClass: string;
}

export const SEVERITY_CONFIG: Record<SeverityKey, SeverityConfig> = {
    0: {
        name: 'Standard',
        status: 'safe',
        icon: '✅',
        title: 'Terms Look Good',
        message: "Standard, industry-normal terms. You're good to go!",
        cardClass: 'safe',
    },
    1: {
        name: 'Notable',
        status: 'notable',
        icon: '📝',
        title: 'Notable Terms',
        message: 'Some terms worth knowing about, but common practice.',
        cardClass: 'notable',
    },
    2: {
        name: 'Cautionary',
        status: 'caution',
        icon: '⚠️',
        title: 'Proceed with Caution',
        message: 'Unusual terms detected. Review before accepting.',
        cardClass: 'caution',
    },
    3: {
        name: 'Critical',
        status: 'danger',
        icon: '🚨',
        title: 'Critical Terms Detected',
        message: 'Aggressive terms found. A warning has been shown on the page.',
        cardClass: 'danger',
    },
};

// ─── Clause Types ───────────────────────────────────────
export type ClauseType =
    | 'DATA_SELLING'
    | 'ARBITRATION'
    | 'NO_CLASS_ACTION'
    | 'TOS_CHANGES'
    | 'CONTENT_RIGHTS'
    | 'LIABILITY'
    | 'UNILATERAL_CHANGES'
    | 'OTHER';

export interface ClauseInfo {
    icon: string;
    name: string;
}

export const CLAUSE_INFO: Record<string, ClauseInfo> = {
    DATA_SELLING: { icon: '💰', name: 'Data Selling/Sharing' },
    ARBITRATION: { icon: '⚖️', name: 'Arbitration Clause' },
    NO_CLASS_ACTION: { icon: '🚫', name: 'No Class Action' },
    TOS_CHANGES: { icon: '📝', name: 'Terms Changes' },
    CONTENT_RIGHTS: { icon: '©️', name: 'Content Rights' },
    LIABILITY: { icon: '⚡', name: 'Liability Waiver' },
    UNILATERAL_CHANGES: { icon: '📝', name: 'Unilateral Changes' },
    OTHER: { icon: '📋', name: 'Other' },
    DEFAULT: { icon: '⚠️', name: 'Concerning Clause' },
};

export interface Clause {
    type: ClauseType;
    severity: SeverityKey;
    quote?: string;
    explanation: string;
    mitigation?: string | null;
}

// ─── Scan / Analysis ────────────────────────────────────
export type ServiceCategory =
    | 'vpn'
    | 'email'
    | 'cloud_storage'
    | 'social_media'
    | 'messaging'
    | 'video_conferencing'
    | 'search'
    | 'browser'
    | 'password_manager'
    | 'notes'
    | 'ai_assistant'
    | 'file_sharing'
    | 'unknown';

export interface ScanResult {
    overallSeverity: SeverityKey;
    category?: ServiceCategory;
    serviceName?: string;
    summary?: string;
    clauses: Clause[];
    hostname?: string;
    lethal?: boolean;
    parseError?: boolean;
    rawResponse?: string;
}

export interface ScanError {
    error: string;
    fetchFailed?: boolean;
    url?: string;
}

export type ScanResponse = ScanResult | ScanError;

// ─── History ────────────────────────────────────────────
export interface HistoryEntry {
    id: number;
    hostname: string;
    url: string;
    timestamp: number;
    severity: SeverityKey;
    summary: string;
    clauseCount: number;
    category: string;
    serviceName: string;
}

// ─── TOS Extraction ─────────────────────────────────────
export interface TosLink {
    url: string;
    text: string;
    type: 'tos' | 'legal';
    priority: number;
}

export interface ExtractionSuccess {
    success: true;
    source: string;
    text: string;
    charCount: number;
    linkText?: string;
    allLinks?: TosLink[];
    info?: string;
}

export interface ExtractionFailure {
    success: false;
    error: string;
    source?: string | null;
    text?: null;
    needsBackgroundFetch?: boolean;
    url?: string;
    linkText?: string;
    allLinks?: TosLink[];
}

export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

