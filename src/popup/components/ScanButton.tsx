interface Props {
    onClick: () => void;
    scanning: boolean;
    disabled: boolean;
}

export default function ScanButton({ onClick, scanning, disabled }: Props) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide
        transition-all duration-200 ease-out
        flex items-center justify-center gap-2.5
        ${scanning
                    ? 'bg-bs-accent/20 text-bs-accent cursor-wait'
                    : 'bg-bs-accent text-white hover:bg-bs-accent-hover shadow-lg shadow-bs-accent/20 hover:shadow-bs-accent/40 active:scale-[0.98]'
                }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:shadow-none
      `}
        >
            {scanning ? (
                <>
                    <span className="w-4 h-4 border-2 border-bs-accent/30 border-t-bs-accent rounded-full animate-spin" />
                    Scanning...
                </>
            ) : (
                <>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Scan Terms
                </>
            )}
        </button>
    );
}
