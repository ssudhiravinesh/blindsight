import * as pdfjsLib from './pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.mjs');

export function isPdfUrl(url) {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        return pathname.endsWith('.pdf');
    } catch {
        return url.toLowerCase().endsWith('.pdf');
    }
}

export function isPdfContentType(contentType) {
    if (!contentType) return false;
    return contentType.toLowerCase().includes('application/pdf');
}

export async function extractTextFromPdf(pdfData) {
    try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;

        const pageCount = pdf.numPages;
        const textParts = [];

        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            textParts.push(pageText);
        }

        const fullText = textParts.join('\n\n').trim();

        if (!fullText || fullText.length < 50) {
            return {
                success: false,
                error: 'PDF appears to contain no extractable text (may be a scanned image).'
            };
        }

        return {
            success: true,
            text: fullText,
            pageCount,
            charCount: fullText.length
        };
    } catch (error) {
        console.error('[Blind-Sight] PDF parsing error:', error);

        if (error.message?.includes('password')) {
            return {
                success: false,
                error: 'This PDF is password-protected and cannot be scanned.'
            };
        }

        return {
            success: false,
            error: `Failed to parse PDF: ${error.message || 'Unknown error'}`
        };
    }
}

export async function fetchAndExtractPdf(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf,*/*;q=0.8',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const result = await extractTextFromPdf(arrayBuffer);

        return {
            ...result,
            url
        };
    } catch (error) {
        return {
            success: false,
            url,
            error: error.message || 'Failed to fetch PDF'
        };
    }
}
