import { Globe, Settings } from 'lucide-react';
import { t } from '@blindsight/core';
import Logo from './Logo';

interface Props {
    hostname: string | null;
    isSignupPage: boolean;
}

export default function Header({ hostname, isSignupPage }: Props) {
    return (
        <header className="sticky top-0 z-10 border-b border-line bg-ink-900/80 px-4 pb-3 pt-3.5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
                <Logo size={30} />
                <div className="min-w-0 flex-1 leading-tight">
                    <h1 className="text-[14px] font-semibold tracking-tight">{t('extName', 'Blind-Sight')}</h1>
                    <p className="text-2xs text-fg-subtle">Terms of Service analyzer</p>
                </div>
                <button
                    type="button"
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className="icon-btn"
                    title={t('settings', 'Settings')}
                    aria-label={t('settings', 'Settings')}
                >
                    <Settings size={16} strokeWidth={1.8} />
                </button>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-white/[0.025] px-2.5 py-1.5">
                <Globe size={13} className="shrink-0 text-fg-subtle" />
                <span className="min-w-0 flex-1 truncate text-xs text-fg-muted" title={hostname ?? undefined}>
                    {hostname ?? 'No page selected'}
                </span>
                {isSignupPage && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-2xs font-medium text-accent-soft">
                        Sign-up page
                    </span>
                )}
            </div>
        </header>
    );
}
