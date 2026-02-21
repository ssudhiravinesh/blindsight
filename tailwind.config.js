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
                'bs-notable': '#eab308',
                'bs-caution': '#f97316',
                'bs-border': '#2a2a3a',
            },
            fontFamily: {
                sans: ["'Segoe UI'", '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            animation: {
                'pulse-glow': 'pulse-glow 1.5s infinite',
                'shimmer': 'shimmer 1.5s infinite',
                'spin-slow': 'spin 1s linear infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                'shimmer': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
            },
        },
    },
    plugins: [],
};
