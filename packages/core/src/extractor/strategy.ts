/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

export interface ExtractionStrategy {
    name: string;
    priority: number; // Lower priority runs first
    canExtract(url: string): boolean;
    extract(): Promise<string | null>;
}
