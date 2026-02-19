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
        w-full py-3 px-4 rounded-xl font-semibold text-sm
        transition-all duration-300 ease-out
        flex items-center justify-center gap-2
        ${scanning
                    ? 'bg-bs-accent/20 text-bs-accent border border-bs-accent/30 cursor-wait'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0'
                }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
      `}
        >
            {scanning ? (
                <>
                    <span className="w-4 h-4 border-2 border-bs-accent/30 border-t-bs-accent rounded-full animate-spin" />
                    Scanning...
                </>
            ) : (
                <>
                    <span className="text-base">🔍</span>
                    Scan Terms of Service
                </>
            )}
        </button>
    );
}
