/** Design tokens shared by the popup (and mirrored in the options page and in-page overlay CSS). */
export default {
    content: ['./src/**/*.{ts,tsx,html}'],
    theme: {
        extend: {
            colors: {
                ink: {
                    950: '#07080B',
                    900: '#0B0D12',
                    850: '#10131A',
                    800: '#151922',
                    750: '#1B202B',
                    700: '#252B38',
                },
                fg: {
                    DEFAULT: '#ECEEF3',
                    muted: '#9AA1B1',
                    subtle: '#666E80',
                },
                accent: {
                    DEFAULT: '#8B7CFF',
                    strong: '#7262FF',
                    soft: '#B3A9FF',
                    blue: '#5B8CFF',
                },
                sev: {
                    0: '#34D399',
                    1: '#FACC15',
                    2: '#FB923C',
                    3: '#F43F5E',
                },
            },
            borderColor: {
                line: 'rgba(255,255,255,0.07)',
                'line-strong': 'rgba(255,255,255,0.12)',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            fontSize: {
                '2xs': ['10px', '14px'],
            },
            boxShadow: {
                card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
                glow: '0 8px 24px -8px rgba(139,124,255,0.55)',
            },
            keyframes: {
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(6px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    from: { backgroundPosition: '200% 0' },
                    to: { backgroundPosition: '-200% 0' },
                },
                sweep: {
                    to: { transform: 'rotate(360deg)' },
                },
            },
            animation: {
                'fade-up': 'fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
                shimmer: 'shimmer 1.6s linear infinite',
                sweep: 'sweep 1.1s linear infinite',
            },
        },
    },
    plugins: [],
};
