interface Props {
    size?: number;
}

/** Shield with a half-lidded eye: "sight" into what you're agreeing to. */
export default function Logo({ size = 32 }: Props) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <defs>
                <linearGradient id="bs-logo-g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A99DFF" />
                    <stop offset="0.55" stopColor="#7262FF" />
                    <stop offset="1" stopColor="#5B8CFF" />
                </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#bs-logo-g)" />
            <path
                d="M16 6.5 9 9.2v5.6c0 4.6 3 8.6 7 10.2 4-1.6 7-5.6 7-10.2V9.2L16 6.5Z"
                fill="rgba(255,255,255,0.14)"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M11.8 15.4c2.4-2.6 6-2.6 8.4 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="16" cy="16.4" r="1.9" fill="white" />
        </svg>
    );
}
