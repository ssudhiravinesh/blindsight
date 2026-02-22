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
    | 'streaming_video'
    | 'streaming_music'
    | 'ecommerce'
    | 'maps_navigation'
    | 'fitness_health'
    | 'food_delivery'
    | 'ride_sharing'
    | 'gaming'
    | 'dating'
    | 'finance_banking'
    | 'education'
    | 'dns'
    | 'photo_editing'
    | 'office_suite'
    | 'code_hosting'
    | 'news_media'
    | 'calendar'
    | 'productivity'
    | 'operating_system'
    | 'mobile_os'
    | 'domain_registrar'
    | 'web_hosting'
    | 'analytics'
    | 'translation'
    | 'video_sharing'
    | 'two_factor_auth'
    | 'podcast'
    | 'rss_reader'
    | 'design_tools'
    | 'crm'
    | 'project_management'
    | 'forms_surveys'
    | 'link_shortener'
    | 'digital_payments'
    | 'remote_access'
    | 'photo_storage'
    | 'forum'
    | 'unknown';

export interface AISuggestedAlternative {
    name: string;
    url: string;
    reason: string;
}

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
    aiAlternatives?: AISuggestedAlternative[];
    scanDurationMs?: number;
}

export interface ScanError {
    error: string;
    fetchFailed?: boolean;
    url?: string;
}

export type ScanResponse = ScanResult | ScanError;

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

export interface PageStatus {
    isSignup: boolean;
    detection: SignupDetection;
    tosLinks: TosLink[];
    lastScanResult: ScanResponse | null;
    scanInProgress: boolean;
    error?: string;
}

export interface SignupDetection {
    isSignup?: boolean;
    score: number;
    indicators: string[];
    details: {
        passwordFields: number;
        emailFields: number;
        signupButtons: number;
        termsCheckboxes: number;
        hasForm: boolean;
    };
}

export interface AnalyzeTosMessage {
    type: 'ANALYZE_TOS';
    tosText: string;
    source?: string;
}

export interface FetchTosMessage {
    type: 'FETCH_TOS';
    url: string;
}

export interface GetHistoryMessage {
    type: 'GET_HISTORY';
}

export interface GetLastResultMessage {
    type: 'GET_LAST_RESULT';
}

export interface PageDetectedMessage {
    type: 'PAGE_DETECTED';
    isSignup: boolean;
    url: string;
    detection: SignupDetection;
}

export interface AutoScanCompleteMessage {
    type: 'AUTO_SCAN_COMPLETE';
    result: ScanResponse;
    url: string;
}

export interface ManualScanMessage {
    type: 'MANUAL_SCAN';
}

export interface GetPageStatusMessage {
    type: 'GET_PAGE_STATUS';
}

export type BackgroundMessage =
    | AnalyzeTosMessage
    | FetchTosMessage
    | GetHistoryMessage
    | GetLastResultMessage
    | PageDetectedMessage
    | AutoScanCompleteMessage;

export type ContentMessage =
    | ManualScanMessage
    | GetPageStatusMessage;

export interface Alternative {
    name: string;
    url: string;
    reason: string;
    icon: string;
}

export interface AlternativeCategory {
    displayName: string;
    alternatives: Alternative[];
}

export function isScanError(response: ScanResponse): response is ScanError {
    return 'error' in response;
}

export function severityToGrade(severity: SeverityKey): string {
    const grades: Record<SeverityKey, string> = { 0: 'A', 1: 'B', 2: 'C', 3: 'F' };
    return grades[severity] ?? 'A';
}

export function getSeverityColor(severity: SeverityKey): string {
    const colors: Record<SeverityKey, string> = {
        0: '#22c55e',
        1: '#eab308',
        2: '#f97316',
        3: '#ef4444',
    };
    return colors[severity] ?? colors[0];
}
