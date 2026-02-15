/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './src/**/*.{ts,tsx,html}',
    ],
    theme: {
        extend: {
            colors: {
                'bs-bg-primary': '#0f0f14',
                'bs-bg-secondary': '#1a1a24',
                'bs-bg-tertiary': '#252532',
                'bs-text-primary': '#ffffff',
                'bs-text-secondary': '#a0a0b0',
                'bs-text-muted': '#606070',
                'bs-accent': '#6366f1',
                'bs-accent-hover': '#818cf8',
                'bs-danger': '#ef4444',
                'bs-success': '#22c55e',
                'bs-warning': '#f59e0b',
                'bs-border': '#2a2a3a',
            },
        },
    },
    plugins: [],
};
