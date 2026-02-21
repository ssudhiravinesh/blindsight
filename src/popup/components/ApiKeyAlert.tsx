export default function ApiKeyAlert() {
    return (
        <div className="bs-glass bs-gradient-caution p-4 animate-slide-in">
            <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">🔑</span>
                <div className="flex-1">
                    <h3 className="font-bold text-sm text-bs-warning mb-1">API Key Required</h3>
                    <p className="text-xs text-bs-text-secondary mb-2">
                        Add your OpenAI or Gemini API key in Settings to start analyzing Terms of Service.
                    </p>
                    <button
                        onClick={() => chrome.runtime.openOptionsPage()}
                        className="text-xs font-semibold text-bs-accent hover:text-bs-accent-hover transition-colors"
                    >
                        Open Settings →
                    </button>
                </div>
            </div>
        </div>
    );
}
