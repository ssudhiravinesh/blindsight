import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ScanResult } from '@blindsight/core';

import GradeRing from './GradeRing';
import ClauseItem from './ClauseItem';
import ResultCard from './ResultCard';
import { toneFor } from '../ui';

let root: Root | null = null;
let container: HTMLDivElement;

beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function render(node: React.ReactElement): HTMLDivElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    React.act(() => root!.render(node));
    return container;
}

afterEach(() => {
    React.act(() => root?.unmount());
    root = null;
    document.body.innerHTML = '';
});

const result: ScanResult = {
    overallSeverity: 3,
    category: 'social_media',
    serviceName: 'InstaFeed',
    summary: 'Sells your data.',
    scanDurationMs: 2100,
    clauses: [
        { type: 'TOS_CHANGES', severity: 1, explanation: 'Terms can change at any time.' },
        { type: 'DATA_SELLING', severity: 3, explanation: 'Sells data to brokers.', quote: 'we may sell your data', mitigation: 'Opt out in settings.' },
        { type: 'CONTENT_RIGHTS', severity: 2, explanation: 'Perpetual content license.' },
    ],
};

describe('toneFor', () => {
    it('maps severities to grades and clamps out-of-range input', () => {
        expect([0, 1, 2, 3].map((s) => toneFor(s).grade)).toEqual(['A', 'B', 'C', 'F']);
        expect(toneFor(9).grade).toBe('F');
        expect(toneFor(-1).grade).toBe('A');
    });
});

describe('GradeRing', () => {
    it('labels the grade for assistive tech', () => {
        const el = render(<GradeRing grade="C" severity={2} color="#FB923C" />);
        expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Grade C');
        expect(el.textContent).toContain('C');
    });

    it('announces the scanning state', () => {
        const el = render(<GradeRing scanning />);
        expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Analyzing');
    });
});

describe('ClauseItem', () => {
    it('reveals the quote and opt-out only when expanded', () => {
        const el = render(<ClauseItem clause={result.clauses[1]} />);
        const toggle = el.querySelector('button')!;
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(el.textContent).not.toContain('we may sell your data');

        React.act(() => toggle.click());

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(el.textContent).toContain('we may sell your data');
        expect(el.textContent).toContain('Opt out in settings.');
    });

    it('is not expandable without a quote or mitigation', () => {
        const el = render(<ClauseItem clause={result.clauses[0]} />);
        expect(el.querySelector('button')!.hasAttribute('aria-expanded')).toBe(false);
    });
});

describe('ResultCard', () => {
    it('shows the verdict, sorts findings by severity and counts them', () => {
        const el = render(<ResultCard result={result} onRescan={() => undefined} />);
        expect(el.textContent).toContain('Critical terms');
        expect(el.textContent).toContain('InstaFeed');

        const names = Array.from(el.querySelectorAll('li')).map((li) => li.querySelector('.truncate')?.textContent);
        expect(names.slice(0, 3)).toEqual(['Data Selling/Sharing', 'Content Rights', 'Terms Changes']);
        expect(el.querySelector('[aria-label="Findings by severity"]')?.textContent).toBe('1 critical1 high1 medium');
    });

    it('surfaces safer alternatives only for risky terms', () => {
        const risky = render(<ResultCard result={result} onRescan={() => undefined} />);
        expect(risky.querySelectorAll('a[target="_blank"]').length).toBeGreaterThan(0);
        React.act(() => root!.unmount());

        const fine = render(<ResultCard result={{ ...result, overallSeverity: 0 }} onRescan={() => undefined} />);
        expect(fine.querySelectorAll('a[target="_blank"]').length).toBe(0);
    });

    it('invokes onRescan', () => {
        const onRescan = vi.fn();
        const el = render(<ResultCard result={result} onRescan={onRescan} />);
        const rescan = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Rescan'))!;
        React.act(() => rescan.click());
        expect(onRescan).toHaveBeenCalledOnce();
    });
});
