export default function Header() {
    return (
        <header className="p-4 border-b border-bs-border bg-bs-bg-secondary/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">
                    👁️
                </div>
                <div>
                    <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Blind-Sight
                    </h1>
                    <p className="text-[10px] text-bs-text-muted tracking-wider uppercase">
                        Your Legal Firewall
                    </p>
                </div>
                <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className="ml-auto w-8 h-8 rounded-lg bg-bs-bg-tertiary/60 hover:bg-bs-bg-tertiary flex items-center justify-center text-bs-text-muted hover:text-bs-text-secondary transition-all duration-200 border border-transparent hover:border-bs-border"
                    title="Settings"
                >
                    ⚙️
                </button>
            </div>
        </header>
    );
}
