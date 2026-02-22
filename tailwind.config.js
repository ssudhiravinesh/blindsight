export default {
    content: [
        './src/**/*.{ts,tsx,html}',
    ],
    theme: {
        extend: {
            colors: {
                'bs-bg-primary': '#121212',
                'bs-bg-secondary': '#1E2026',
                'bs-bg-tertiary': '#2D3139',
                'bs-text-primary': '#FFFFFF',
                'bs-text-secondary': '#9FA6B2',
                'bs-text-muted': '#737A86',
                'bs-accent': '#1098FC',
                'bs-accent-hover': '#037DD6',
                'bs-danger': '#D73A4A',
                'bs-success': '#2DA44E',
                'bs-warning': '#E3B341',
                'bs-notable': '#E3B341',
                'bs-caution': '#D73A4A',
                'bs-border': '#3B4046',
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
